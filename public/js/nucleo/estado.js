/**
 * SPA MéritoDocente · Estado de la sesión de estudio y persistencia local.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       ESTADO Y LOCALSTORAGE
    ============================================================ */
    const STORAGE_KEY = 'meritodocente_state_v1';

    let state = {
      user: null,
      progress: {}, // { mod1: { lessonsDone: [0,1], completed: true, badge: true }, ... }
      currentLesson: null, // { moduleId, lessonIndex }
      apiOnline: false, // true cuando sesión y progreso vienen de la API
        courseMap: {}, // { mod1: { courseId, moduloIds: [], lessons: [{ id, moduloId }] } }
        postLoginAnswers: {}
    };
    let adminDiagnosticState = {
        exams: [],
        versions: [],
        questions: [],
        selectedExam: '',
        selectedVersion: '',
        selectedQuestion: '',
        nextQuestionOrder: 1,
        saving: false,
        importing: false,
        importFile: null,
        importPreview: null,
        categories: [],
        listenersReady: false
    };
    let modalReturnFocus = null;

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = Object.assign(state, JSON.parse(raw));
      } catch (e) {
        console.warn('Error cargando estado:', e);
      }
      // Asegurar estructura
      if (!state.progress) state.progress = {};
      if (!state.courseMap) state.courseMap = {};
      state.apiOnline = false;
      MODULES.forEach(m => {
        if (!state.progress[m.id]) {
          state.progress[m.id] = { lessonsDone: [], completed: false, badge: false };
        }
      });
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Error guardando estado:', e);
      }
    }

