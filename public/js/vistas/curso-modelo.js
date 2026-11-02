/**
 * SPA MéritoDocente · Modelo de presentación curso → módulo → lección.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       EXPERIENCIA DE APRENDIZAJE 2.1 · MODELO DE PRESENTACIÓN
       Curso, módulo y lección se derivan de MODULES (contenido
       publicado) y de state.courseMap (módulos, lecciones y
       progreso reales de la API). Nunca se inventan métricas.
    ============================================================ */
    function lxEscape(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function lxPlural(count, singular, plural) {
      return `${count} ${count === 1 ? singular : plural}`;
    }

    function lxEstadoLabel(estado) {
      return {
        completado: 'Completado',
        'en-curso': 'En curso',
        nuevo: 'Sin iniciar',
        pendiente: 'En preparación'
      }[estado] || 'Sin iniciar';
    }

    function getNextLessonIndex(modId) {
      const mod = MODULES.find(m => m.id === modId);
      if (!mod) return 0;
      const done = state.progress[modId]?.lessonsDone || [];
      const pending = mod.lessons.findIndex((_, index) => !done.includes(index));
      return pending >= 0 ? pending : 0;
    }

    function getCourseModel(modId) {
      const mod = MODULES.find(m => m.id === modId);
      if (!mod) return null;

      const mapping = state.courseMap?.[mod.id] || null;
      const prog = getModuleProgress(mod.id);
      const doneSet = new Set(state.progress[mod.id]?.lessonsDone || []);
      const apiModules = Array.isArray(mapping?.modules) ? mapping.modules : [];

      let modulos;
      if (apiModules.length) {
        modulos = apiModules.map(m => {
          const lessonIndexes = [];
          mod.lessons.forEach((_, index) => {
            const mapped = mapping.lessons?.[index];
            if (mapped && String(mapped.moduloId) === String(m.id)) lessonIndexes.push(index);
          });
          const completadas = lessonIndexes.filter(index => doneSet.has(index)).length;
          const totalLecciones = (m.lecciones || []).length;

          return {
            id: m.id,
            titulo: m.titulo,
            descripcion: m.descripcion || '',
            orden: m.orden,
            totalLecciones,
            enPreparacion: Math.max(0, totalLecciones - lessonIndexes.length),
            lessonIndexes,
            completadas,
            porcentaje: lessonIndexes.length
              ? Math.round((completadas / lessonIndexes.length) * 100)
              : 0,
            estado: lessonIndexes.length === 0
              ? 'pendiente'
              : (completadas === lessonIndexes.length
                ? 'completado'
                : (completadas > 0 ? 'en-curso' : 'nuevo'))
          };
        });
      } else {
        modulos = [{
          id: null,
          titulo: 'Ruta del curso',
          descripcion: mod.description,
          orden: 1,
          totalLecciones: mod.lessons.length,
          enPreparacion: 0,
          lessonIndexes: mod.lessons.map((_, index) => index),
          completadas: prog.done,
          porcentaje: prog.percent,
          estado: prog.completed ? 'completado' : (prog.done > 0 ? 'en-curso' : 'nuevo')
        }];
      }

      const totalLecciones = apiModules.length
        ? modulos.reduce((sum, m) => sum + m.totalLecciones, 0)
        : mod.lessons.length;

      return {
        idSpa: mod.id,
        titulo: mod.title,
        area: mod.area,
        nivel: mod.level,
        descripcion: mod.description,
        icono: mod.icon,
        badge: mod.badge,
        idApi: mapping?.courseId || null,
        origen: apiModules.length ? 'api' : 'local',
        modulos,
        totalModulos: modulos.length,
        totalLecciones,
        enPreparacion: Math.max(0, totalLecciones - mod.lessons.length),
        leccionesDisponibles: mod.lessons.length,
        completadas: prog.done,
        porcentaje: prog.percent,
        estado: prog.completed ? 'completado' : (prog.done > 0 ? 'en-curso' : 'nuevo'),
        nextLessonIndex: getNextLessonIndex(mod.id)
      };
    }
    function getModuleModel(modId, moduleId) {
      const course = getCourseModel(modId);
      if (!course || !course.modulos.length) return null;

      let posicion = course.modulos.findIndex(
        m => m.id != null && String(m.id) === String(moduleId)
      );
      if (posicion < 0) posicion = 0;

      const modulo = course.modulos[posicion];
      const mod = MODULES.find(m => m.id === modId);
      const mapping = state.courseMap?.[modId] || null;
      const doneSet = new Set(state.progress[modId]?.lessonsDone || []);

      const lecciones = modulo.lessonIndexes.map(index => {
        const mapped = mapping?.lessons?.[index] || null;
        return {
          index,
          titulo: mod.lessons[index].title,
          descripcion: mapped?.descripcion || '',
          tieneQuiz: !!mod.lessons[index].quiz,
          completada: doneSet.has(index)
        };
      });

      const mappedIds = new Set(
        (mapping?.lessons || []).filter(Boolean).map(lesson => String(lesson.id))
      );
      const moduloApi = modulo.id == null
        ? null
        : (mapping?.modules || []).find(m => String(m.id) === String(modulo.id));
      const pendientes = (moduloApi?.lecciones || [])
        .filter(lesson => !mappedIds.has(String(lesson.id)))
        .map(lesson => ({ titulo: lesson.titulo, descripcion: lesson.descripcion || '' }));

      return {
        course,
        modulo,
        posicion: posicion + 1,
        totalModulos: course.modulos.length,
        lecciones,
        pendientes,
        siguiente: lecciones.find(lesson => !lesson.completada) || null
      };
    }

    window.openCourse = function (modId) {
      if (!MODULES.some(m => m.id === modId)) return;
      state.currentCourse = modId;
      state.currentModule = null;
      saveState();
      showView('course');
    };

    window.openModule = function (modId, moduleId) {
      if (!MODULES.some(m => m.id === modId)) return;
      state.currentCourse = modId;
      state.currentModule = moduleId == null ? null : moduleId;
      saveState();
      showView('module');
    };
