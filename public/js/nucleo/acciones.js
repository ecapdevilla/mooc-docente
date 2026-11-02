/**
 * SPA MéritoDocente · Delegación de eventos de la interfaz.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * después de las vistas y antes de principal.js.
 * Ver docs/arquitectura-frontend.md.
 *
 * La CSP se sirve con `script-src-attr 'none'`: el marcado no puede ejecutar
 * JavaScript desde atributos `on*`. Cada control declara su intención con el
 * atributo `data-action` y viaja con sus parámetros en atributos `data-*`.
 * Un único oyente en `document` resuelve la acción; nunca se evalúa texto del
 * marcado.
 */
    /* ============================================================
       ACCIONES DECLARATIVAS
    ============================================================ */

    /**
     * Convierte un atributo `data-*` en número o `null`.
     * Los identificadores ausentes viajan como cadena vacía y se normalizan a
     * `null`, que es el valor que esperan openModule/openLesson.
     */
    function accionNumero(valor) {
      if (valor === undefined || valor === null || valor === '') return null;
      const numero = Number(valor);
      return Number.isFinite(numero) ? numero : null;
    }

    /**
     * Registro de acciones. Cada entrada recibe el elemento que declaró la
     * acción y el evento original; los parámetros se leen de `dataset`.
     */
    const ACCIONES = Object.freeze({
      'show-view': (el) => showView(el.dataset.view),
      'open-login': () => openLogin(),
      'close-login': () => closeLogin(),
      'logout': () => logout(),
      'open-register': () => {
        closeLogin();
        showView('landing');
      },
      'open-diagnostic': () => openDiagnosticQuiz(),
      'close-badge-modal': () => closeBadgeModal(),
      'handle-register': (el, event) => handleRegister(event),
      'handle-login': (el, event) => handleLogin(event),
      'open-course': (el) => openCourse(el.dataset.courseId),
      'open-module': (el) => openModule(el.dataset.courseId, accionNumero(el.dataset.moduleId)),
      'open-lesson': (el) => openLesson(el.dataset.courseId, accionNumero(el.dataset.lessonIndex)),
      'answer-quiz': (el) => answerQuiz(accionNumero(el.dataset.optionIndex)),
      'answer-api-quiz': (el) => answerApiQuiz(el.dataset.quizId, el.dataset.optionId),
      'complete-lesson': () => completeLessonFromFooter()
    });

    /**
     * Resuelve la acción del elemento más cercano que la declare.
     * Los controles con `data-action` son exclusivos de la aplicación, así que
     * el evento nunca navega ni recarga la página (equivalente al antiguo
     * `return false` de los manejadores en línea).
     */
    function manejarAccionDelegada(event) {
      const objetivo = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('[data-action]')
        : null;
      if (!objetivo) return;

      const accion = ACCIONES[objetivo.dataset.action];
      if (!accion) return;

      event.preventDefault();
      accion(objetivo, event);
    }

    /** Registra los oyentes únicos de la interfaz. Se llama una sola vez en init(). */
    function iniciarDelegacionDeEventos() {
      document.addEventListener('click', manejarAccionDelegada);
      document.addEventListener('submit', manejarAccionDelegada);
    }
