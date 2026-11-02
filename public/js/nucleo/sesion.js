/**
 * SPA MéritoDocente · Sesión, mapa de cursos y sincronización de progreso.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    function saveSession(token, user) {
      state.user = user;
      state.apiOnline = true;
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      state.user = null;
      state.apiOnline = false;
      state.courseMap = {};
    }

    function normalizeLessonTitle(title) {
      return String(title || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    }

    /**
     * Relaciona módulos y lecciones por títulos únicos; nunca infiere IDs por orden.
     */
    async function loadCourseMap() {
      const { courses } = await apiFetch('/courses');
      const map = {};

      for (const mod of MODULES) {
        const matchingCourses = courses.filter(
          course => normalizeLessonTitle(course.titulo) === normalizeLessonTitle(mod.title)
        );
        if (matchingCourses.length !== 1) {
          console.warn(`No hay una correspondencia única para el curso "${mod.title}".`);
          map[mod.id] = {
            courseId: null,
            courseTitulo: null,
            moduloIds: [],
            modules: [],
            apiLessons: [],
            lessons: mod.lessons.map(() => null)
          };
          continue;
        }

        const course = matchingCourses[0];
        const detail = await apiFetch(`/courses/${course.id}`);
        const apiLessons = [];
        const moduloIds = [];
        const modules = [];

        (detail.course.modulos || []).forEach(m => {
          const moduleLessons = (m.lecciones || []).map(l => ({
            id: l.id,
            moduloId: m.id,
            titulo: l.titulo,
            descripcion: l.descripcion || '',
            orden: l.orden,
            quizzes: Array.isArray(l.quizzes) ? l.quizzes : [],
            normalizedTitle: normalizeLessonTitle(l.titulo)
          }));

          moduloIds.push(m.id);
          modules.push({
            id: m.id,
            titulo: m.titulo,
            descripcion: m.descripcion || '',
            orden: m.orden,
            lecciones: moduleLessons
          });
          moduleLessons.forEach(l => apiLessons.push(l));
        });
        modules.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        const lessons = mod.lessons.map(spaLesson => {
          const title = normalizeLessonTitle(spaLesson.title);
          const matches = apiLessons.filter(lesson => lesson.normalizedTitle === title);
          if (matches.length !== 1) {
            console.warn(
              `Correspondencia no única para "${spaLesson.title}" en "${mod.title}".`
            );
            return null;
          }
          return matches[0];
        });

        map[mod.id] = {
          courseId: course.id,
          courseTitulo: course.titulo,
          moduloIds,
          modules,
          apiLessons,
          lessons
        };
      }

      state.courseMap = map;
      return map;
    }

    /**
     * Reconstruye el progreso local con el progreso guardado en la API.
     */
    async function syncProgressFromApi() {
      if (!state.courseMap || !Object.keys(state.courseMap).length) return;

      const data = await apiFetch('/progress');
      const completedLessonIds = new Set();
      const badgeModules = new Set();

      (data.modules || []).forEach(m => {
        (m.lessons || []).forEach(l => {
          if (l.completada) completedLessonIds.add(l.id);
        });
      });
      (data.badges || []).forEach(b => badgeModules.add(b.modulo_id));

      MODULES.forEach(mod => {
        const mapping = state.courseMap[mod.id];
        if (!mapping) return;

        const locallyDone = state.progress[mod.id]?.lessonsDone || [];
        const lessonsDone = [];
        mapping.lessons.forEach((lesson, index) => {
          if (lesson && completedLessonIds.has(lesson.id)) lessonsDone.push(index);
          else if (!lesson && locallyDone.includes(index)) lessonsDone.push(index);
        });

        const hasCompleteMapping = mapping.lessons.every(Boolean);
        const completed = hasCompleteMapping &&
          mod.lessons.length > 0 &&
          lessonsDone.length === mod.lessons.length;
        const badgeByServer = mapping.moduloIds.some(id => badgeModules.has(id));

        state.progress[mod.id] = {
          lessonsDone,
          completed,
          badge: completed || badgeByServer
        };
      });

      saveState();
    }

    /**
     * Guarda una lección completada en la API.
     */
    async function persistLesson(moduleId, lessonIndex) {
      const mapping = state.courseMap && state.courseMap[moduleId];
      const lesson = mapping && mapping.lessons[lessonIndex];
      if (!lesson) {
        return {
          persisted: false,
          reason: 'No se encontró una correspondencia única de curso y lección.'
        };
      }

      try {
        await apiFetch(`/progress/lesson/${lesson.id}`, {
          method: 'POST',
          // Sin puntaje: el backend lo deriva de las respuestas verificadas.
          body: {}
        });
        return { persisted: true };
      } catch (err) {
        console.warn('No se pudo guardar el progreso en la API:', err.message);
        return { persisted: false, reason: err.message };
      }
    }

    /**
     * Restaura la sesión guardada y el progreso real desde la API.
     */
    async function refreshSession() {
      if (!localStorage.getItem(TOKEN_KEY)) return false;

      try {
        const { user } = await apiFetch('/auth/me');
        state.user = user;
        state.apiOnline = true;
        await loadCourseMap();
        await syncProgressFromApi();
        return true;
      } catch (err) {
        if (err.status === 401) {
          clearSession();
        } else {
          console.warn('API no disponible:', err.message);
        }
        return false;
      }
    }

