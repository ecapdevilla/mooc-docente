/**
 * SPA MéritoDocente · Evaluación final por curso (T2.4).
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * después de las vistas y antes de acciones.js y ruta.js.
 * Ver docs/arquitectura-frontend.md y docs/evaluacion-final-por-curso.md.
 *
 * El navegador nunca califica: solo envía `answers: [{ questionId, optionId }]`
 * a POST /courses/:id/assessment/attempts y muestra el veredicto que devuelve
 * el servidor. Las preguntas llegan sin `es_correcta` ni explicaciones.
 */
    /* ============================================================
       EVALUACIÓN FINAL POR CURSO
    ============================================================ */

    const ASSESSMENT_CONTAINER = 'assessmentView';

    /** Estado de la vista. Vive en memoria: las respuestas no se persisten. */
    let assessment = {
      cursoSpa: null,   // id del curso en MODULES (para la ruta y la vista)
      cursoApi: null,   // id del curso en la API (null sin correspondencia)
      detalle: null,    // assessment: umbral, preguntas, requisitos, historial
      respuestas: {},   // { [questionId]: optionId }
      indice: 0,        // pregunta activa
      cargando: false,
      enviando: false,
      error: null,
      resultado: null   // respuesta de POST /assessment/attempts
    };

    function reiniciarEvaluacion() {
      assessment = {
        cursoSpa: null,
        cursoApi: null,
        detalle: null,
        respuestas: {},
        indice: 0,
        cargando: false,
        enviando: false,
        error: null,
        resultado: null
      };
    }

    /** Curso de la API asociado al curso del SPA, si la correspondencia es única. */
    function cursoApiDeEvaluacion(modId) {
      const mapping = state.courseMap && state.courseMap[modId];
      return mapping && mapping.courseId ? mapping.courseId : null;
    }

    window.openCourseAssessment = function (modId) {
      if (!MODULES.some(m => m.id === modId)) return;

      const cursoApi = cursoApiDeEvaluacion(modId);
      reiniciarEvaluacion();
      assessment.cursoSpa = modId;
      assessment.cursoApi = cursoApi;
      assessment.cargando = Boolean(cursoApi);
      state.currentCourse = modId;
      saveState();

      showView('assessment');
      if (cursoApi) cargarEvaluacion();
    };

    window.closeCourseAssessment = function () {
      reiniciarEvaluacion();
      showView('course');
    };

    /** Trae las preguntas sin clave y los requisitos del curso. */
    async function cargarEvaluacion() {
      const cursoApi = assessment.cursoApi;
      if (!cursoApi) return;

      try {
        const data = await apiFetch(`/courses/${cursoApi}/assessment`);
        if (assessment.cursoApi !== cursoApi) return;
        assessment.detalle = data.assessment || null;
        assessment.error = null;
      } catch (error) {
        if (assessment.cursoApi !== cursoApi) return;
        assessment.detalle = null;
        assessment.error = error;
      } finally {
        if (assessment.cursoApi === cursoApi) {
          assessment.cargando = false;
          renderAssessmentView();
        }
      }
    }

    /* ------------------------------------------------------------
       Helpers de construcción
    ------------------------------------------------------------ */

    function evNodo(tag, clase, texto) {
      const nodo = document.createElement(tag);
      if (clase) nodo.className = clase;
      if (texto !== undefined && texto !== null) nodo.textContent = texto;
      return nodo;
    }

    function evBoton(texto, clase, alPulsar) {
      const boton = evNodo('button', clase, texto);
      boton.type = 'button';
      if (alPulsar) boton.addEventListener('click', alPulsar);
      return boton;
    }

    function evIcono(clase) {
      const icono = document.createElement('i');
      icono.className = clase;
      icono.setAttribute('aria-hidden', 'true');
      return icono;
    }

    /* ------------------------------------------------------------
       Render principal de la vista
    ------------------------------------------------------------ */

    function renderAssessmentView() {
      const contenedor = document.getElementById(ASSESSMENT_CONTAINER);
      if (!contenedor) return;

      const modulo = MODULES.find(m => m.id === assessment.cursoSpa) || null;
      const curso = assessment.cursoSpa ? getCourseModel(assessment.cursoSpa) : null;

      contenedor.innerHTML = '';
      contenedor.appendChild(construirMigasEvaluacion(curso, modulo));

      if (assessment.resultado) {
        contenedor.appendChild(construirResultado());
        return;
      }

      const panel = evNodo('section', 'lx-panel assessment-panel');
      panel.id = 'assessmentPanel';
      contenedor.appendChild(panel);

      if (assessment.cargando) {
        panel.appendChild(evNodo('h1', 'assessment-title', 'Evaluación final'));
        const aviso = evNodo('p', 'lx-muted', 'Cargando la evaluación final…');
        aviso.setAttribute('role', 'status');
        panel.appendChild(aviso);
        return;
      }

      if (assessment.error) {
        panel.appendChild(construirAvisoError(assessment.error));
        return;
      }

      if (!assessment.cursoApi) {
        panel.appendChild(construirAvisoSinConexion(curso, modulo));
        return;
      }

      if (!assessment.detalle) {
        panel.appendChild(evNodo('h1', 'assessment-title', 'Evaluación final'));
        panel.appendChild(evNodo('p', 'lx-muted', 'No hay datos de la evaluación final de este curso.'));
        return;
      }

      const requisitos = assessment.detalle.requisitos || {};
      if (requisitos.exigeLecciones && !requisitos.habilitada) {
        panel.appendChild(construirRequisitos(requisitos));
        return;
      }

      const preguntas = assessment.detalle.preguntas || [];
      if (!preguntas.length) {
        panel.appendChild(evNodo('h1', 'assessment-title', 'Evaluación final'));
        panel.appendChild(evNodo('p', 'lx-muted', 'Este curso todavía no tiene preguntas para la evaluación final.'));
        return;
      }

      if (assessment.indice >= preguntas.length) assessment.indice = 0;

      panel.appendChild(construirEncabezadoEvaluacion(curso));
      panel.appendChild(construirPreguntaActual(preguntas));
    }

    function construirMigasEvaluacion(curso, modulo) {
      const migas = evNodo('nav', 'assessment-crumbs');
      migas.setAttribute('aria-label', 'Ruta de navegación');

      const alPanel = evBoton('Mi aprendizaje', 'assessment-crumb', () => showView('dashboard'));
      const separador = evNodo('span', 'assessment-crumb__sep', '/');
      separador.setAttribute('aria-hidden', 'true');
      const alCurso = evBoton(modulo ? modulo.title : 'Curso', 'assessment-crumb', () => closeCourseAssessment());
      const actual = evNodo('span', 'assessment-crumb', 'Evaluación final');
      actual.setAttribute('aria-current', 'page');

      migas.append(alPanel, separador.cloneNode(true), alCurso, separador, actual);
      return migas;
    }

    function construirEncabezadoEvaluacion(curso) {
      const detalle = assessment.detalle;
      const preguntas = detalle.preguntas || [];
      const cabecera = evNodo('header', 'assessment-head');

      cabecera.appendChild(evNodo('span', 'lx-eyebrow', 'Evaluación final del curso'));
      cabecera.appendChild(evNodo('h1', 'assessment-title', detalle.titulo || (curso ? curso.titulo : 'Evaluación final')));
      cabecera.appendChild(evNodo(
        'p',
        'assessment-meta',
        `${lxPlural(preguntas.length, 'pregunta', 'preguntas')} · aprueba con ${detalle.umbralAprobacion}% de aciertos`
      ));

      const historial = detalle.historial || [];
      if (historial.length) {
        const caja = evNodo('div', 'assessment-history');
        caja.appendChild(evNodo('strong', 'assessment-history__title', 'Intentos anteriores'));
        historial.forEach((intento, posicion) => {
          const puntaje = intento.puntaje === null || intento.puntaje === undefined
            ? 'sin puntaje'
            : `${intento.puntaje}%`;
          caja.appendChild(evNodo(
            'span',
            'assessment-history__item',
            `Intento ${historial.length - posicion}: ${puntaje} · ${intento.aprobado ? 'Aprobado' : 'Sin aprobar'}`
          ));
        });
        cabecera.appendChild(caja);
      }

      return cabecera;
    }

    function construirPreguntaActual(preguntas) {
      const total = preguntas.length;
      const pregunta = preguntas[assessment.indice];
      const bloque = evNodo('div', 'assessment-question');
      bloque.id = 'assessmentQuestion';

      const avance = Math.round(((assessment.indice + 1) / total) * 100);
      const progreso = evNodo('div', 'diagnostic-progress');
      progreso.appendChild(evNodo('span', 'assessment-progress-label', `Pregunta ${assessment.indice + 1} de ${total}`));
      const barra = evNodo('div', 'diagnostic-progress-bar');
      barra.setAttribute('role', 'progressbar');
      barra.setAttribute('aria-label', 'Avance de la evaluación');
      barra.setAttribute('aria-valuemin', '0');
      barra.setAttribute('aria-valuemax', '100');
      barra.setAttribute('aria-valuenow', String(avance));
      const relleno = evNodo('div', 'diagnostic-progress-fill');
      relleno.style.width = `${avance}%`;
      barra.appendChild(relleno);
      progreso.appendChild(barra);
      bloque.appendChild(progreso);

      bloque.appendChild(evNodo('h2', 'quiz-question', pregunta.pregunta));

      const meta = [pregunta.area, pregunta.leccion].filter(Boolean).join(' · ');
      if (meta) bloque.appendChild(evNodo('p', 'assessment-question__meta', meta));

      const opciones = evNodo('div', 'quiz-options');
      const elegida = assessment.respuestas[pregunta.id];
      (pregunta.opciones || []).forEach((opcion, posicion) => {
        const boton = evBoton('', 'quiz-option', () => seleccionarOpcionEvaluacion(pregunta.id, opcion.id));
        boton.dataset.questionId = String(pregunta.id);
        boton.dataset.optionId = String(opcion.id);
        boton.setAttribute('aria-pressed', elegida === opcion.id ? 'true' : 'false');
        if (elegida === opcion.id) boton.classList.add('selected');
        boton.appendChild(evNodo('span', 'letter', String.fromCharCode(65 + posicion)));
        boton.appendChild(evNodo('span', 'assessment-option__text', opcion.texto || opcion.opcion || ''));
        opciones.appendChild(boton);
      });
      bloque.appendChild(opciones);
      bloque.appendChild(construirNavegacionEvaluacion(preguntas));
      return bloque;
    }

    function construirNavegacionEvaluacion(preguntas) {
      const total = preguntas.length;
      const nav = evNodo('div', 'diagnostic-nav');

      const anterior = evBoton('Anterior', 'btn btn-ghost', () => cambiarPreguntaEvaluacion(-1));
      anterior.disabled = assessment.indice === 0;
      nav.appendChild(anterior);

      const estado = evNodo('span', 'assessment-status');
      estado.setAttribute('role', 'status');
      estado.setAttribute('aria-live', 'polite');
      if (assessment.enviando) {
        estado.textContent = 'Calificando en el servidor…';
      } else if (!respuestasCompletas(preguntas)) {
        const faltantes = total - Object.keys(assessment.respuestas).length;
        estado.textContent = `Te faltan ${lxPlural(faltantes, 'respuesta', 'respuestas')} por elegir`;
      }
      nav.appendChild(estado);

      if (assessment.indice === total - 1) {
        const etiqueta = assessment.enviando ? 'Calificando…' : 'Finalizar evaluación';
        const finalizar = evBoton(etiqueta, 'btn btn-primary', () => enviarEvaluacion());
        finalizar.id = 'assessmentSubmit';
        finalizar.disabled = assessment.enviando || !respuestasCompletas(preguntas);
        nav.appendChild(finalizar);
      } else {
        const siguiente = evBoton('Siguiente', 'btn btn-primary', () => cambiarPreguntaEvaluacion(1));
        siguiente.id = 'assessmentNext';
        siguiente.disabled = assessment.respuestas[preguntas[assessment.indice].id] === undefined;
        nav.appendChild(siguiente);
      }

      return nav;
    }

    function respuestasCompletas(preguntas) {
      return preguntas.every(pregunta => assessment.respuestas[pregunta.id] !== undefined);
    }

    function seleccionarOpcionEvaluacion(questionId, optionId) {
      if (assessment.enviando) return;
      assessment.respuestas[questionId] = optionId;
      renderAssessmentView();
    }

    function cambiarPreguntaEvaluacion(delta) {
      const preguntas = (assessment.detalle && assessment.detalle.preguntas) || [];
      const destino = assessment.indice + delta;
      if (destino < 0 || destino >= preguntas.length) return;
      assessment.indice = destino;
      renderAssessmentView();
    }

    /* ------------------------------------------------------------
       Avisos: error de carga, curso sin correspondencia y requisitos
    ------------------------------------------------------------ */

    function construirAvisoError(error) {
      const panel = evNodo('section', 'lx-panel assessment-panel');
      panel.id = 'assessmentPanel';
      panel.appendChild(evNodo('span', 'lx-eyebrow', 'Evaluación final'));
      panel.appendChild(evNodo('h1', 'assessment-title', 'No disponible por ahora'));

      const aviso = evNodo('p', 'assessment-alert');
      aviso.setAttribute('role', 'alert');
      aviso.textContent = (error && error.message)
        ? error.message
        : 'No fue posible cargar la evaluación final de este curso.';
      panel.appendChild(aviso);

      const acciones = evNodo('div', 'assessment-actions');
      acciones.appendChild(evBoton('Reintentar', 'btn btn-primary', () => {
        if (!assessment.cursoApi) return;
        assessment.error = null;
        assessment.cargando = true;
        renderAssessmentView();
        cargarEvaluacion();
      }));
      acciones.appendChild(evBoton('Volver al curso', 'btn btn-ghost', () => closeCourseAssessment()));
      panel.appendChild(acciones);

      return panel;
    }

    function construirAvisoSinConexion(curso, modulo) {
      const panel = evNodo('section', 'lx-panel assessment-panel');
      panel.id = 'assessmentPanel';
      panel.appendChild(evNodo('span', 'lx-eyebrow', 'Evaluación final'));
      panel.appendChild(evNodo('h1', 'assessment-title', modulo ? modulo.title : 'Este curso'));
      panel.appendChild(evNodo(
        'p',
        'lx-muted',
        'Este curso no está vinculado a la base de datos, así que la evaluación final no puede calificarse en el servidor. Tu avance local se conserva y puedes continuar con las lecciones.'
      ));

      const acciones = evNodo('div', 'assessment-actions');
      acciones.appendChild(evBoton('Volver al curso', 'btn btn-primary', () => closeCourseAssessment()));
      panel.appendChild(acciones);

      return panel;
    }

    function construirRequisitos(requisitos) {
      const completadas = Number(requisitos.leccionesCompletadas) || 0;
      const totales = Number(requisitos.leccionesTotales) || 0;
      const avance = totales ? Math.round((completadas / totales) * 100) : 0;

      const panel = evNodo('section', 'lx-panel assessment-panel');
      panel.id = 'assessmentPanel';
      panel.appendChild(evNodo('span', 'lx-eyebrow', 'Evaluación final'));
      panel.appendChild(evNodo('h1', 'assessment-title', 'Antes de presentar la evaluación final'));
      panel.appendChild(evNodo(
        'p',
        'assessment-meta',
        `Has completado ${completadas} de ${lxPlural(totales, 'lección', 'lecciones')} del curso.`
      ));

      const progreso = evNodo('div', 'diagnostic-progress');
      progreso.appendChild(evNodo('span', 'assessment-progress-label', `${avance}% de las lecciones`));
      const barra = evNodo('div', 'diagnostic-progress-bar');
      barra.setAttribute('role', 'progressbar');
      barra.setAttribute('aria-valuemin', '0');
      barra.setAttribute('aria-valuemax', '100');
      barra.setAttribute('aria-valuenow', String(avance));
      barra.setAttribute('aria-label', 'Lecciones completadas del curso');
      const relleno = evNodo('div', 'diagnostic-progress-fill');
      relleno.style.width = `${avance}%`;
      barra.appendChild(relleno);
      progreso.appendChild(barra);
      panel.appendChild(progreso);

      const aviso = evNodo('div', 'diagnostic-focus');
      aviso.appendChild(evNodo('strong', '', 'Requisito pendiente: '));
      aviso.appendChild(evNodo(
        'span',
        '',
        'La evaluación final se habilita al completar todas las lecciones del curso. La calificación siempre ocurre en el servidor.'
      ));
      panel.appendChild(aviso);

      const acciones = evNodo('div', 'assessment-actions');
      acciones.appendChild(evBoton('Volver al curso', 'btn btn-primary', () => closeCourseAssessment()));
      panel.appendChild(acciones);

      return panel;
    }

    /* ------------------------------------------------------------
       Envío al servidor: el cliente no calcula aciertos ni puntaje
    ------------------------------------------------------------ */

    async function enviarEvaluacion() {
      const preguntas = (assessment.detalle && assessment.detalle.preguntas) || [];
      if (!assessment.cursoApi || !preguntas.length || assessment.enviando) return;
      if (!respuestasCompletas(preguntas)) return;

      const answers = preguntas.map((pregunta) => ({
        questionId: pregunta.id,
        optionId: assessment.respuestas[pregunta.id]
      }));

      assessment.enviando = true;
      assessment.error = null;
      renderAssessmentView();

      try {
        const data = await apiFetch(`/courses/${assessment.cursoApi}/assessment/attempts`, {
          method: 'POST',
          body: { answers }
        });
        assessment.resultado = data;
      } catch (error) {
        const requisitos = error && error.data && error.data.requisitos;

        if (requisitos) {
          // El servidor rechazó por requisitos: se muestra el estado real de
          // las lecciones en lugar de un mensaje de error genérico.
          if (assessment.detalle) assessment.detalle.requisitos = requisitos;
          assessment.error = null;
        } else {
          assessment.error = error;
        }
      } finally {
        assessment.enviando = false;
        renderAssessmentView();
      }
    }

    /* ------------------------------------------------------------
       Resultado devuelto por el servidor
    ------------------------------------------------------------ */

    function construirResultado() {
      const resultado = assessment.resultado || {};
      const intento = resultado.attempt || {};
      const detalle = assessment.detalle || {};
      const aciertos = Number(intento.aciertos) || 0;
      const total = Number(intento.totalPreguntas) || 0;
      const puntaje = Number(intento.puntaje) || 0;
      const aprobado = intento.aprobado === true;

      const panel = evNodo('section', 'lx-panel assessment-panel assessment-result');
      panel.id = 'assessmentResult';
      panel.appendChild(construirVeredicto(intento, aciertos, total, puntaje, aprobado));

      const porLeccion = resultado.porLeccion || [];
      if (porLeccion.length) {
        const reporte = evNodo('div', 'diagnostic-report');
        reporte.appendChild(evNodo('h4', '', 'Desempeño por tema del curso'));
        const grafico = evNodo('div', 'diagnostic-chart');

        porLeccion.forEach((grupo) => {
          const porcentaje = Math.round(Number(grupo.porcentaje) || 0);
          const fila = evNodo('div', 'diagnostic-chart-row');
          fila.appendChild(evNodo('span', 'diagnostic-chart-label', grupo.leccion || 'Sin tema'));

          const pista = evNodo('div', 'diagnostic-chart-track');
          const relleno = evNodo(
            'div',
            `diagnostic-chart-fill${porcentaje < 50 ? ' low' : (porcentaje < 70 ? ' mid' : '')}`
          );
          relleno.style.width = `${porcentaje}%`;
          pista.appendChild(relleno);

          fila.appendChild(pista);
          fila.appendChild(evNodo('strong', '', `${porcentaje}%`));
          grafico.appendChild(fila);
        });

        reporte.appendChild(grafico);
        panel.appendChild(reporte);
      }

      const prioritarias = resultado.areasPrioritarias || [];
      const foco = evNodo('div', 'diagnostic-focus');
      foco.appendChild(evNodo(
        'strong',
        '',
        prioritarias.length ? 'Áreas prioritarias para reforzar: ' : 'Fortaleza sostenida: '
      ));
      foco.appendChild(evNodo(
        'span',
        '',
        prioritarias.length
          ? `${prioritarias.map((area) => area.area || 'General').join(', ')}. Repasa estas lecciones antes de repetir la evaluación.`
          : 'Alcanzaste el umbral en todas las áreas evaluadas. Profundiza en las explicaciones para consolidar el aprendizaje.'
      ));
      panel.appendChild(foco);

      const resultados = resultado.results || [];
      if (resultados.length) {
        panel.appendChild(construirDetalleResultados(resultados, detalle));
      }

      panel.appendChild(construirAccionesResultado());
      return panel;
    }

    function construirVeredicto(intento, aciertos, total, puntaje, aprobado) {
      const cabecera = evNodo('header', 'assessment-head');
      cabecera.appendChild(evNodo('span', 'lx-eyebrow', 'Resultado de la evaluación final'));
      cabecera.appendChild(evNodo(
        'h1',
        'assessment-title',
        aprobado ? 'Evaluación aprobada' : 'Aún no apruebas la evaluación'
      ));
      cabecera.appendChild(evNodo(
        'p',
        'assessment-meta',
        `${aciertos} de ${lxPlural(total, 'respuesta correcta', 'respuestas correctas')} · ${puntaje}% · umbral ${intento.umbralAprobacion}%`
      ));
      cabecera.appendChild(evNodo(
        'span',
        `assessment-verdict ${aprobado ? 'is-pass' : 'is-fail'}`,
        aprobado ? 'Aprobado' : 'Sin aprobar'
      ));
      return cabecera;
    }

    function construirDetalleResultados(resultados, detalle) {
      const preguntas = new Map(
        ((detalle && detalle.preguntas) || []).map((pregunta) => [pregunta.id, pregunta])
      );
      const detalles = evNodo('div', 'diagnostic-details');
      detalles.setAttribute('aria-label', 'Retroalimentación de cada respuesta');

      resultados.forEach((respuesta, posicion) => {
        const pregunta = preguntas.get(respuesta.questionId);
        const bloque = evNodo('div', `diagnostic-detail ${respuesta.correct ? 'ok' : 'review'}`);
        bloque.appendChild(evNodo(
          'strong',
          '',
          `${posicion + 1}. ${respuesta.correct ? 'Correcta' : 'Para revisar'}`
        ));
        if (pregunta) {
          bloque.appendChild(evNodo('span', 'assessment-detail__question', pregunta.pregunta));
        }
        const meta = [respuesta.area, respuesta.topic].filter(Boolean).join(' · ');
        if (meta) bloque.appendChild(evNodo('span', 'assessment-detail__meta', meta));
        bloque.appendChild(evNodo('p', 'assessment-detail__explanation', respuesta.explanation || ''));
        detalles.appendChild(bloque);
      });

      return detalles;
    }

    function construirAccionesResultado() {
      const acciones = evNodo('div', 'assessment-actions');

      acciones.appendChild(evBoton('Repetir evaluación', 'btn btn-primary', () => {
        const cursoSpa = assessment.cursoSpa;
        const cursoApi = assessment.cursoApi;
        reiniciarEvaluacion();
        assessment.cursoSpa = cursoSpa;
        assessment.cursoApi = cursoApi;
        assessment.cargando = Boolean(cursoApi);
        renderAssessmentView();
        if (cursoApi) cargarEvaluacion();
      }));

      acciones.appendChild(evBoton('Volver al curso', 'btn btn-ghost', () => closeCourseAssessment()));
      return acciones;
    }
