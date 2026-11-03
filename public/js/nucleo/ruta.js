/**
 * SPA MéritoDocente · Router por hash.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * después de las vistas y antes de principal.js.
 * Ver docs/arquitectura-frontend.md.
 *
 * Rutas publicadas:
 *   #/                          landing de matrícula
 *   #/acceso                    landing con el formulario de inscripción a la vista
 *   #/dashboard                 panel del estudiante
 *   #/curso/<curso>             vista de curso (curso = id de MODULES)
 *   #/modulo/<curso>[/<módulo>] vista de módulo (módulo = id de la API)
 *   #/leccion/<curso>/<índice>  vista de lección (índice 0-based, como en state)
 *   #/evaluacion/<curso>        evaluación final del curso (T2.4)
 *   #/diagnostico               simulacro diagnóstico del panel
 *   #/admin/diagnostico         editor de preguntas (solo administradores)
 *
 * Las rutas canónicas llevan el curso porque el SPA también funciona en modo
 * local, donde los identificadores de la base de datos no existen. Por eso se
 * aceptan dos alias para enlaces compartidos: `#/modulo/<módulo>` y
 * `#/leccion/<id de lección de la API>` resuelven el curso con state.courseMap
 * y se canonizan a la forma larga al aplicarse.
 *
 * La navegación programática usa `history.pushState`, que no dispara
 * `hashchange`: la vista se aplica en el acto y no se renderiza dos veces. El
 * botón atrás/adelante y la edición manual del hash llegan por
 * `popstate`/`hashchange`.
 *
 * Durante la aplicación de una ruta las escrituras usan `replaceState` para
 * canonizar el enlace sin añadir entradas al historial.
 */
    /* ============================================================
       RUTAS DEL NAVEGADOR
    ============================================================ */
    const RUTA_INICIO = '#/';
    const RUTA_ACCESO = '#/acceso';
    const RUTA_DASHBOARD = '#/dashboard';
    const RUTA_DIAGNOSTICO = '#/diagnostico';
    const RUTA_ADMIN_DIAGNOSTICO = '#/admin/diagnostico';

    const PREFIJO_CURSO = '#/curso/';
    const PREFIJO_MODULO = '#/modulo/';
    const PREFIJO_LECCION = '#/leccion/';
    const PREFIJO_EVALUACION = '#/evaluacion/';

    /** Rutas de las vistas que no llevan parámetros. */
    const RUTAS_POR_VISTA = Object.freeze({
      dashboard: RUTA_DASHBOARD,
      'admin-diagnostic': RUTA_ADMIN_DIAGNOSTICO
    });

    let rutaAplicada = null; // última ruta aplicada (evita repetir el render)
    let rutaIniciada = false; // oyentes registrados una sola vez
    let aplicandoRuta = false; // true mientras se resuelve una ruta

    /* ------------------------------------------------------------
       Lectura y construcción de rutas
    ------------------------------------------------------------ */

    /** Normaliza cualquier hash a la forma `#/...`, sin barras finales. */
    function normalizarRuta(hash) {
      let ruta = String(hash === undefined || hash === null ? '' : hash).trim();
      if (!ruta || ruta === '#') return RUTA_INICIO;
      if (ruta.charAt(0) !== '#') ruta = `#${ruta.charAt(0) === '/' ? '' : '/'}${ruta}`;
      if (ruta.indexOf('#/') !== 0) ruta = `#/${ruta.slice(1)}`;
      ruta = ruta.replace(/\/+$/, '');
      return ruta === '#' ? RUTA_INICIO : ruta;
    }

    /** Ruta activa en la barra de direcciones. */
    function rutaActual() {
      return normalizarRuta(window.location.hash);
    }

    function decodificarSegmento(segmento) {
      try {
        return decodeURIComponent(segmento);
      } catch (error) {
        return segmento;
      }
    }

    /** Segmentos de una ruta: `#/curso/mod1` → `['curso', 'mod1']`. */
    function segmentosDeRuta(hash) {
      const limpia = normalizarRuta(hash).replace(/^#\/?/, '');
      return limpia ? limpia.split('/').filter(Boolean).map(decodificarSegmento) : [];
    }

    function rutaDeCurso(courseId) {
      return `${PREFIJO_CURSO}${encodeURIComponent(courseId)}`;
    }

    function rutaDeModulo(courseId, moduleId) {
      const base = `${PREFIJO_MODULO}${encodeURIComponent(courseId)}`;
      return moduleId === undefined || moduleId === null || moduleId === ''
        ? base
        : `${base}/${encodeURIComponent(moduleId)}`;
    }

    function rutaDeLeccion(courseId, lessonIndex) {
      return `${PREFIJO_LECCION}${encodeURIComponent(courseId)}/${lessonIndex}`;
    }

    /** Evaluación final del curso (T2.4): `#/evaluacion/<curso>`. */
    function rutaDeEvaluacion(courseId) {
      return `${PREFIJO_EVALUACION}${encodeURIComponent(courseId)}`;
    }

    /* ------------------------------------------------------------
       Escritura en el historial
    ------------------------------------------------------------ */

    /**
     * Mantiene la URL alineada con la vista sin volver a renderizar.
     * Durante `aplicarRuta` se canoniza con `replaceState`.
     */
    function sincronizarRuta(hash) {
      const destino = normalizarRuta(hash);
      if (rutaActual() === destino) {
        rutaAplicada = destino;
        return;
      }
      if (aplicandoRuta) {
        reemplazarRuta(destino);
        return;
      }
      try {
        window.history.pushState({ ruta: destino }, '', destino);
      } catch (error) {
        // `file://` sin pushState: el hash dispara `hashchange` y el router aplica.
        window.location.hash = destino;
        return;
      }
      rutaAplicada = destino;
    }

    /** Sustituye la entrada actual del historial (redirecciones y canonización). */
    function reemplazarRuta(hash) {
      const destino = normalizarRuta(hash);
      if (rutaActual() !== destino) {
        try {
          window.history.replaceState({ ruta: destino }, '', destino);
        } catch (error) {
          window.location.replace(destino);
          rutaAplicada = destino;
          return;
        }
      }
      rutaAplicada = destino;
    }

    /* ------------------------------------------------------------
       Resolución de parámetros
    ------------------------------------------------------------ */

    function cursosLocales() {
      return Array.isArray(MODULES) ? MODULES : [];
    }

    function cursoValido(courseId) {
      return cursosLocales().some(mod => mod.id === courseId);
    }

    /** Curso de referencia: el activo si es válido; si no, el primero del catálogo. */
    function cursoDeRespaldo() {
      if (state.currentCourse && cursoValido(state.currentCourse)) return state.currentCourse;
      const cursos = cursosLocales();
      return cursos.length ? cursos[0].id : null;
    }

    /** Localiza el curso que contiene un módulo de la API. */
    function cursoDelModulo(moduleId) {
      const mapa = state.courseMap || {};
      return Object.keys(mapa).find(clave =>
        (mapa[clave]?.moduloIds || []).some(id => String(id) === String(moduleId))
      ) || null;
    }

    /**
     * Resuelve `#/modulo/<curso>[/<módulo>]` y el alias `#/modulo/<módulo>`.
     * Un módulo inexistente cae al primero del curso para no romper el enlace.
     */
    function resolverModulo(primero, segundo) {
      if (!primero) return null;

      if (segundo === undefined) {
        if (cursoValido(primero)) return { courseId: primero, moduleId: null };
        const curso = cursoDelModulo(primero);
        return curso ? { courseId: curso, moduleId: primero } : null;
      }

      if (!cursoValido(primero)) return null;
      const modelo = getModuleModel(primero, segundo);
      if (!modelo) return { courseId: primero, moduleId: null };
      const encontrado = modelo.modulo && modelo.modulo.id !== null &&
        modelo.modulo.id !== undefined &&
        String(modelo.modulo.id) === String(segundo);
      return { courseId: primero, moduleId: encontrado ? modelo.modulo.id : null };
    }

    /**
     * Resuelve `#/leccion/<curso>/<índice>` y el alias `#/leccion/<id API>`.
     * El alias busca la lección en el mapa de cursos; si no la encuentra, un
     * valor numérico se interpreta como índice del curso activo (modo local).
     */
    function resolverLeccion(primero, segundo) {
      if (!primero) return null;

      if (segundo !== undefined) {
        if (!cursoValido(primero)) return null;
        const indice = Number(segundo);
        if (!Number.isInteger(indice)) return null;
        const mod = cursosLocales().find(m => m.id === primero);
        if (indice < 0 || indice >= mod.lessons.length) return null;
        return { courseId: primero, lessonIndex: indice };
      }

      const mapa = state.courseMap || {};
      let cursoDeLaLeccion = null;
      let indiceEncontrado = -1;

      Object.keys(mapa).forEach(clave => {
        if (indiceEncontrado >= 0) return;
        const lecciones = mapa[clave] && Array.isArray(mapa[clave].lessons) ? mapa[clave].lessons : [];
        const posicion = lecciones.findIndex(
          leccion => leccion && String(leccion.id) === String(primero)
        );
        if (posicion >= 0) {
          cursoDeLaLeccion = clave;
          indiceEncontrado = posicion;
        }
      });

      if (indiceEncontrado >= 0) {
        return { courseId: cursoDeLaLeccion, lessonIndex: indiceEncontrado };
      }

      const indice = Number(primero);
      const curso = cursoDeRespaldo();
      if (!curso || !Number.isInteger(indice)) return null;
      const mod = cursosLocales().find(m => m.id === curso);
      if (indice < 0 || indice >= mod.lessons.length) return null;
      return { courseId: curso, lessonIndex: indice };
    }

    /* ------------------------------------------------------------
       Guardas de sesión y destinos
    ------------------------------------------------------------ */

    function enfocarRegistro() {
      const registro = document.getElementById('registro');
      if (registro && typeof registro.scrollIntoView === 'function') {
        registro.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    /**
     * Sin sesión no hay área de aprendizaje: se vuelve al acceso con el
     * formulario a la vista y el modal de sesión abierto.
     */
    function exigirSesion() {
      if (state.user) return true;
      reemplazarRuta(RUTA_ACCESO);
      showView('landing');
      enfocarRegistro();
      if (typeof openLogin === 'function') openLogin();
      return false;
    }

    /** Ruta desconocida o sin destino: al panel o al inicio según la sesión. */
    function rutaSinDestino() {
      if (state.user) {
        reemplazarRuta(RUTA_DASHBOARD);
        showView('dashboard');
        return;
      }
      reemplazarRuta(RUTA_INICIO);
      showView('landing');
    }

    /* ------------------------------------------------------------
       Aplicación de rutas
    ------------------------------------------------------------ */

    function navegarSegunRuta(segmentos) {
      const seccion = segmentos[0];
      const primero = segmentos[1];
      const segundo = segmentos[2];

      if (!seccion) {
        if (state.user) {
          reemplazarRuta(RUTA_DASHBOARD);
          showView('dashboard');
          return;
        }
        showView('landing');
        return;
      }

      if (seccion === 'acceso') {
        if (state.user) {
          reemplazarRuta(RUTA_DASHBOARD);
          showView('dashboard');
          return;
        }
        showView('landing');
        enfocarRegistro();
        return;
      }

      if (seccion === 'dashboard') {
        if (exigirSesion()) showView('dashboard');
        return;
      }

      if (seccion === 'curso') {
        if (!exigirSesion()) return;
        if (!cursoValido(primero)) {
          rutaSinDestino();
          return;
        }
        window.openCourse(primero);
        return;
      }

      if (seccion === 'modulo') {
        if (!exigirSesion()) return;
        const destino = resolverModulo(primero, segundo);
        if (!destino) {
          rutaSinDestino();
          return;
        }
        window.openModule(destino.courseId, destino.moduleId);
        return;
      }

      if (seccion === 'leccion') {
        if (!exigirSesion()) return;
        const destino = resolverLeccion(primero, segundo);
        if (!destino) {
          rutaSinDestino();
          return;
        }
        window.openLesson(destino.courseId, destino.lessonIndex);
        return;
      }

      if (seccion === 'evaluacion') {
        if (!exigirSesion()) return;
        const destino = primero && cursoValido(primero) ? primero : cursoDeRespaldo();
        if (!destino) {
          rutaSinDestino();
          return;
        }
        window.openCourseAssessment(destino);
        return;
      }

      if (seccion === 'diagnostico') {
        if (!exigirSesion()) return;
        showView('dashboard');
        if (typeof openDiagnosticQuiz === 'function') openDiagnosticQuiz();
        return;
      }

      if (seccion === 'admin' && primero === 'diagnostico') {
        if (!exigirSesion()) return;
        if (state.user.rol !== 'admin') {
          rutaSinDestino();
          return;
        }
        showView('admin-diagnostic');
        return;
      }

      rutaSinDestino();
    }

    /**
     * Aplica la ruta activa. `forzar` vuelve a renderizar la misma ruta, que es
     * lo que necesita el arranque para no quedarse en una vista sin estado.
     */
    function aplicarRuta(opciones) {
      const forzar = Boolean(opciones && opciones.forzar);
      const hash = rutaActual();
      if (!forzar && hash === rutaAplicada) return;

      rutaAplicada = hash;
      aplicandoRuta = true;
      try {
        navegarSegunRuta(segmentosDeRuta(hash));
      } finally {
        aplicandoRuta = false;
      }
    }

    /**
     * Mantiene la URL alineada con la vista que acaba de renderizar showView.
     * Curso, módulo y lección se derivan del estado que fijaron openCourse,
     * openModule y openLesson, así que no hay dos fuentes de verdad.
     */
    function sincronizarRutaDeVista(view) {
      if (view === 'course') {
        const curso = cursoDeRespaldo();
        if (curso) sincronizarRuta(rutaDeCurso(curso));
        return;
      }

      if (view === 'module') {
        const curso = cursoDeRespaldo();
        if (curso) sincronizarRuta(rutaDeModulo(curso, state.currentModule));
        return;
      }

      if (view === 'lesson') {
        const actual = state.currentLesson;
        if (!actual || !cursoValido(actual.moduleId)) {
          sincronizarRuta(RUTA_DASHBOARD);
          return;
        }
        sincronizarRuta(rutaDeLeccion(actual.moduleId, actual.lessonIndex));
        return;
      }

      if (view === 'assessment') {
        const curso = cursoDeRespaldo();
        if (curso) sincronizarRuta(rutaDeEvaluacion(curso));
        return;
      }

      if (view === 'landing') {
        // `#/acceso` es la landing con el formulario a la vista: se conserva.
        if (rutaActual() !== RUTA_ACCESO) reemplazarRuta(RUTA_INICIO);
        return;
      }

      const destino = RUTAS_POR_VISTA[view];
      if (destino) sincronizarRuta(destino);
    }

    /**
     * Arranca el router. Se llama una sola vez desde init(), después de
     * restaurar la sesión, para que los enlaces profundos a vistas protegidas
     * encuentren el estado ya cargado.
     */
    function iniciarRuta() {
      if (!rutaIniciada) {
        rutaIniciada = true;
        window.addEventListener('hashchange', () => aplicarRuta());
        window.addEventListener('popstate', () => aplicarRuta());
      }
      aplicarRuta({ forzar: true });
    }
