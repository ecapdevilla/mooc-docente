/**
 * SPA MéritoDocente · Vista de lección, actividades y progreso.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       MÓDULOS Y LECCIONES
    ============================================================ */
    window.startModule = function (modId) {
      // La entrada a un curso es ahora su vista de curso, no la primera lección.
      window.openCourse(modId);
    };

    window.openLesson = function (modId, lessonIdx) {
      const mod = MODULES.find(m => m.id === modId);
      if (!mod || lessonIdx < 0 || lessonIdx >= mod.lessons.length) return;

      state.currentLesson = { moduleId: modId, lessonIndex: lessonIdx };
      // Mantener el módulo coherente con la lección abierta; la vista de lección
      // vuelve a derivarlo de la correspondencia con la API cuando existe.
      const mapped = state.courseMap?.[modId]?.lessons?.[lessonIdx] || null;
      state.currentModule = mapped ? mapped.moduloId : null;
      saveState();

      renderLesson();
      showView('lesson');
    };

    function getLessonContext(moduleId, lessonIndex) {
      const mod = MODULES.find(m => m.id === moduleId);
      if (!mod || !mod.lessons[lessonIndex]) return null;

      const mapping = state.courseMap?.[moduleId] || null;
      const mapped = mapping?.lessons?.[lessonIndex] || null;
      const moduleIdApi = mapped ? mapped.moduloId : state.currentModule;
      const model = getModuleModel(moduleId, moduleIdApi);
      const course = getCourseModel(moduleId);
      const doneSet = new Set(state.progress[moduleId]?.lessonsDone || []);
      const secuencia = model
        ? model.lecciones.map(l => l.index)
        : mod.lessons.map((_, i) => i);

      let posicion = secuencia.indexOf(lessonIndex);
      if (posicion < 0) posicion = lessonIndex;

      const posicionModulo = model
        ? model.lecciones.findIndex(l => l.index === lessonIndex) + 1
        : lessonIndex + 1;

      return {
        mod,
        lesson: mod.lessons[lessonIndex],
        course,
        model,
        modulo: model ? model.modulo : null,
        secuencia,
        posicion,
        posicionModulo: posicionModulo > 0 ? posicionModulo : lessonIndex + 1,
        previous: posicion > 0 ? secuencia[posicion - 1] : null,
        next: posicion < secuencia.length - 1 ? secuencia[posicion + 1] : null,
        progreso: getModuleProgress(moduleId),
        isDone: doneSet.has(lessonIndex),
        doneSet,
        apiLesson: mapped,
        // Preguntas publicadas en la API (sin respuestas correctas).
        apiQuizzes: mapped && Array.isArray(mapped.quizzes)
          ? mapped.quizzes.filter(quiz => quiz && Array.isArray(quiz.opciones) && quiz.opciones.length)
          : []
      };
    }

    function renderLesson() {
      const { moduleId, lessonIndex } = state.currentLesson;
      const ctx = getLessonContext(moduleId, lessonIndex);
      const view = document.getElementById('lessonView');
      if (!ctx || !view) return;

      const { mod, lesson, course, modulo, progreso, isDone } = ctx;
      const moduloTitulo = modulo ? modulo.titulo : 'Ruta del curso';
      const totalModulos = course ? course.totalModulos : 1;
      const area = course ? course.area : mod.area;
      const icono = course ? course.icono : mod.icon;

      const outlineItems = ctx.secuencia.map((indice, orden) => {
        const item = mod.lessons[indice];
        const activa = indice === lessonIndex;
        const hecha = ctx.doneSet.has(indice);
        return `
          <li>
            <button class="lx-outline__link ${activa ? 'is-active' : ''} ${hecha ? 'is-done' : ''}" type="button"
              data-action="open-lesson" data-course-id="${moduleId}" data-lesson-index="${indice}" ${activa ? 'aria-current="step"' : ''}>
              <span class="lx-outline__num">${hecha ? '<i class="fas fa-check" aria-hidden="true"></i>' : orden + 1}</span>
              <span>${lxEscape(item.title)}</span>
            </button>
          </li>`;
      }).join('');

      const usaActividadApi = ctx.apiQuizzes.length > 0 && state.apiOnline && Boolean(state.user);
      const quizApi = usaActividadApi ? ctx.apiQuizzes : [];

      const opcionesQuiz = lesson.quiz
        ? lesson.quiz.options.map((opt, i) => `
            <button class="quiz-option" type="button" data-index="${i}" data-action="answer-quiz" data-option-index="${i}">
              <span class="letter">${String.fromCharCode(65 + i)}</span>
              <span>${lxEscape(opt)}</span>
            </button>`).join('')
        : '';

      const seccionesApi = quizApi.map((quiz, indice) => {
        const sufijo = indice === 0 ? '' : `-${quiz.id}`;
        const opciones = quiz.opciones
          .slice()
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
          .map((opcion, i) => `
            <button class="quiz-option" type="button" data-option-id="${opcion.id}"
              data-action="answer-api-quiz" data-quiz-id="${quiz.id}">
              <span class="letter">${String.fromCharCode(65 + i)}</span>
              <span>${lxEscape(opcion.opcion)}</span>
            </button>`).join('');

        return `<section class="lx-quiz" id="quizBlock${sufijo}" aria-labelledby="lessonQuizTitle${sufijo}">
             <div class="lx-quiz__head">
               <div>
                 <span class="lx-eyebrow">Comprobación</span>
                 <h2 class="lx-h2" id="lessonQuizTitle${sufijo}">Actividad de la lección${quizApi.length > 1 ? ` · Pregunta ${indice + 1}` : ''}</h2>
               </div>
               <span class="lx-muted">Retroalimentación inmediata</span>
             </div>
             <p class="lx-quiz__question">${lxEscape(quiz.pregunta)}</p>
             <div class="quiz-options" id="quizOptions${sufijo}">${opciones}</div>
             <div class="quiz-feedback" id="quizFeedback${sufijo}"></div>
           </section>`;
      }).join('');

      const bloqueQuiz = quizApi.length
        ? `<div class="lx-lesson-quiz-group">${seccionesApi}</div>`
        : (lesson.quiz ? `<section class="lx-quiz" id="quizBlock" aria-labelledby="lessonQuizTitle">
             <div class="lx-quiz__head">
               <div>
                 <span class="lx-eyebrow">Comprobación</span>
                 <h2 class="lx-h2" id="lessonQuizTitle">Actividad de la lección</h2>
               </div>
               <span class="lx-muted">Retroalimentación inmediata</span>
             </div>
             <p class="lx-quiz__question">${lxEscape(lesson.quiz.question)}</p>
             <div class="quiz-options" id="quizOptions">${opcionesQuiz}</div>
             <div class="quiz-feedback" id="quizFeedback"></div>
           </section>`
        : `<section class="lx-quiz" id="quizBlock" aria-labelledby="lessonQuizTitle">
             <div class="lx-quiz__head">
               <div>
                 <span class="lx-eyebrow">Comprobación</span>
                 <h2 class="lx-h2" id="lessonQuizTitle">Actividad de la lección</h2>
               </div>
             </div>
             <div class="lx-empty">
               <strong>Actividad en preparación</strong>
               <span>Esta lección aún no publica su actividad de comprobación. Puedes marcar la lectura como completada desde el pie de la lección.</span>
             </div>
           </section>`);

      const articuloHtml = `
            <article class="lx-lesson-shell">
              <header class="lx-lesson-head">
                <div class="lx-lesson-meta">
                  <span class="lx-lesson-meta__item"><i class="${icono}" aria-hidden="true"></i> ${lxEscape(area)}</span>
                  <span class="lx-lesson-meta__item"><i class="fas fa-layer-group" aria-hidden="true"></i> Módulo ${ctx.model ? ctx.model.posicion : 1} de ${totalModulos}</span>
                  <span class="lx-lesson-meta__item"><i class="fas fa-book-open" aria-hidden="true"></i> Lección ${ctx.posicionModulo} de ${ctx.secuencia.length}</span>
                  <span class="lx-status ${isDone ? 'lx-status--done' : 'lx-status--current'}">${isDone ? 'Completada' : 'En curso'}</span>
                </div>
                <h1>${lxEscape(lesson.title)}</h1>
                <div class="lx-chips">
                  <span class="lx-chip lx-chip--light">${lxEscape(mod.level)}</span>
                  <span class="lx-chip lx-chip--light">${progreso.percent}% del curso</span>
                  ${lesson.quiz ? '<span class="lx-chip lx-chip--light">Actividad de comprobación</span>' : ''}
                </div>
              </header>

              <div class="lx-reading">${lesson.content}</div>

              ${bloqueQuiz}

              <footer class="lx-lesson-footer">
                <div class="lx-lesson-footer__row">
                  <div class="lx-lesson-meta" id="lessonNavInfo" role="status" aria-live="polite">${isDone ? 'Lección completada' : 'Aún no marcas esta lección como completada'}</div>
                  ${isDone
                    ? '<span class="lx-status lx-status--done"><i class="fas fa-check" aria-hidden="true"></i> Completada</span>'
                    : '<button class="btn btn-primary btn-sm" type="button" data-action="complete-lesson">Marcar completada</button>'}
                </div>
                <div class="lx-lesson-footer__row">
                  <button class="btn btn-ghost btn-sm" type="button" data-action="open-module" data-course-id="${moduleId}" data-module-id="${modulo && modulo.id != null ? modulo.id : ''}">
                    <i class="fas fa-arrow-left" aria-hidden="true"></i> Volver al módulo
                  </button>
                  <div class="lx-lesson-footer__nav">
                    ${ctx.previous !== null
                      ? `<button class="btn btn-ghost btn-sm" type="button" data-action="open-lesson" data-course-id="${moduleId}" data-lesson-index="${ctx.previous}"><i class="fas fa-arrow-left" aria-hidden="true"></i> Anterior</button>`
                      : ''}
                    ${ctx.next !== null
                      ? `<button class="btn btn-secondary btn-sm" type="button" data-action="open-lesson" data-course-id="${moduleId}" data-lesson-index="${ctx.next}">Siguiente <i class="fas fa-arrow-right" aria-hidden="true"></i></button>`
                      : `<button class="btn btn-secondary btn-sm" type="button" data-action="open-course" data-course-id="${moduleId}">Finalizar curso <i class="fas fa-check" aria-hidden="true"></i></button>`}
                  </div>
                </div>
              </footer>
            </article>`;
      const indiceHtml = `
            <aside class="lx-outline" aria-label="Lecciones del módulo">
              <div class="lx-outline__course">${lxEscape(course.titulo)}</div>
              <p class="lx-outline__title">${lxEscape(moduloTitulo)}</p>
              <ol class="lx-outline__list">${outlineItems}</ol>
              <div class="lx-outline__progress">
                <div class="lx-progress-line">
                  <div class="lx-meter lx-meter--dark lx-meter--sm" role="progressbar"
                       aria-valuenow="${progreso.percent}" aria-valuemin="0" aria-valuemax="100"
                       aria-label="Avance del curso">
                    <span class="lx-meter__fill" style="width:${progreso.percent}%"></span>
                  </div>
                  <strong>${progreso.percent}%</strong>
                </div>
                <p class="lx-muted" style="margin-top:.35rem">${progreso.done} de ${progreso.total} lecciones del curso</p>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" data-action="open-module" data-course-id="${moduleId}" data-module-id="${modulo && modulo.id != null ? modulo.id : ''}">Ver el módulo</button>
            </aside>`;
      view.innerHTML = `
        <nav class="lx-crumbs" aria-label="Ruta de navegación">
          <button type="button" class="lx-crumb" data-action="show-view" data-view="dashboard">Mi aprendizaje</button>
          <span class="lx-crumbs__sep" aria-hidden="true">/</span>
          <button type="button" class="lx-crumb" data-action="open-course" data-course-id="${moduleId}">${lxEscape(course.titulo)}</button>
          <span class="lx-crumbs__sep" aria-hidden="true">/</span>
          <button type="button" class="lx-crumb" data-action="open-module" data-course-id="${moduleId}" data-module-id="${modulo && modulo.id != null ? modulo.id : ''}">${lxEscape(moduloTitulo)}</button>
          <span class="lx-crumbs__sep" aria-hidden="true">/</span>
          <span class="lx-crumb" aria-current="page">Lección ${ctx.posicionModulo}</span>
        </nav>

        <div class="lx-lesson-layout">
          ${articuloHtml}
          ${indiceHtml}
        </div>
      `;

      // Si ya estaba completada, marcar la actividad como respondida
      if (isDone) {
        if (quizApi.length) {
          markApiQuizAsDone();
        } else if (lesson.quiz) {
          markQuizAsDone(lesson.quiz.correct);
        }
      }
    }

    window.completeLessonFromFooter = function () {
      const actual = state.currentLesson;
      if (!actual) return;
      const mod = MODULES.find(m => m.id === actual.moduleId);
      if (!mod || !mod.lessons[actual.lessonIndex]) return;

      completeLesson(actual.moduleId, actual.lessonIndex);
      renderLesson();
    };

    window.answerQuiz = function (selectedIdx) {
      const { moduleId, lessonIndex } = state.currentLesson;
      const mod = MODULES.find(m => m.id === moduleId);
      const lesson = mod.lessons[lessonIndex];
      const correctIdx = lesson.quiz.correct;

      const options = document.querySelectorAll('.quiz-option');
      const feedback = document.getElementById('quizFeedback');

      // Deshabilitar
      options.forEach(o => o.classList.add('disabled'));

      // Marcar correcta e incorrecta
      options[correctIdx].classList.add('correct');
      if (selectedIdx !== correctIdx) {
        options[selectedIdx].classList.add('incorrect');
      }

      // Feedback
      feedback.classList.add('show');
      if (selectedIdx === correctIdx) {
        feedback.classList.add('ok');
        feedback.innerHTML = `<i class="fas fa-check-circle"></i> ${lesson.quiz.feedbackOk}`;
        completeLesson(moduleId, lessonIndex);
        refreshLessonCompletionUi();
      } else {
        feedback.classList.add('ko');
        feedback.innerHTML = `<i class="fas fa-times-circle"></i> ${lesson.quiz.feedbackKo}`;
      }

      const lessonNavInfo = document.getElementById('lessonNavInfo');
      lessonNavInfo.textContent = selectedIdx === correctIdx
        ? 'Respuesta correcta. Guardando progreso...'
        : 'Respuesta incorrecta. Inténtalo de nuevo.';
    };

    function markQuizAsDone(correctIdx) {
      const options = document.querySelectorAll('.quiz-option');
      const feedback = document.getElementById('quizFeedback');
      options.forEach(o => o.classList.add('disabled'));
      options[correctIdx].classList.add('correct');
      feedback.classList.add('show', 'ok');
      feedback.innerHTML = '<i class="fas fa-check-circle"></i> Lección ya completada anteriormente.';
    }
    /**
     * Refresca en el lugar los indicadores de avance de la lección abierta.
     * Se usa cuando la actividad marca la lección como completada para no
     * perder la retroalimentación con un re-render completo.
     */
    /**
     * Califica en el backend una respuesta de la actividad publicada en la API.
     * El cliente solo envía identificadores: la corrección, el puntaje y la
     * finalización los determina el servidor a partir de quiz_options.
     */
    window.answerApiQuiz = async function (quizId, optionId) {
      const actual = state.currentLesson;
      if (!actual) return;

      const mapping = state.courseMap && state.courseMap[actual.moduleId];
      const mapped = mapping && mapping.lessons ? mapping.lessons[actual.lessonIndex] : null;
      if (!mapped) return;

      const boton = document.querySelector(`.quiz-option[data-option-id="${optionId}"]`);
      const contenedor = boton ? boton.closest('.quiz-options') : null;
      const bloque = boton ? boton.closest('.lx-quiz') : null;
      const feedback = bloque ? bloque.querySelector('.quiz-feedback') : null;
      const botones = contenedor ? [...contenedor.querySelectorAll('.quiz-option')] : [];

      botones.forEach(opcion => opcion.classList.add('disabled'));

      try {
        const data = await apiFetch(`/quizzes/lessons/${mapped.id}/responses`, {
          method: 'POST',
          body: { quizId: Number(quizId), optionId: Number(optionId) }
        });

        const respuesta = data && data.response;
        if (!respuesta) {
          throw new Error('El servidor no devolvió la calificación de la actividad.');
        }

        botones.forEach(opcion => {
          const id = Number(opcion.dataset.optionId);
          if (id === Number(respuesta.correctOptionId)) opcion.classList.add('correct');
          else if (id === Number(optionId) && !respuesta.correct) opcion.classList.add('incorrect');
        });

        if (feedback) {
          feedback.classList.add('show');
          feedback.classList.toggle('ok', Boolean(respuesta.correct));
          feedback.classList.toggle('ko', !respuesta.correct);
          feedback.innerHTML = `<i class="fas ${respuesta.correct ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${lxEscape(respuesta.explanation || '')}`;
        }

        const lessonNavInfo = document.getElementById('lessonNavInfo');

        if (data.lesson && data.lesson.completed) {
          completeLesson(actual.moduleId, actual.lessonIndex);
          refreshLessonCompletionUi();
          if (lessonNavInfo) lessonNavInfo.textContent = 'Actividad superada. Guardando progreso...';
        } else {
          if (lessonNavInfo) lessonNavInfo.textContent = 'Respuesta incorrecta. Puedes intentarlo de nuevo.';
          // Reintento permitido: el historial de respuestas es append-only.
          botones.forEach(opcion => opcion.classList.remove('disabled'));
        }
      } catch (err) {
        botones.forEach(opcion => opcion.classList.remove('disabled'));
        if (feedback) {
          feedback.classList.add('show', 'ko');
          feedback.innerHTML = `<i class="fas fa-times-circle"></i> ${lxEscape(err.message || 'No fue posible calificar la actividad.')}`;
        }
        const lessonNavInfo = document.getElementById('lessonNavInfo');
        if (lessonNavInfo) lessonNavInfo.textContent = 'No se pudo calificar la actividad. Inténtalo de nuevo.';
      }
    };

    /**
     * Refleja una lección ya completada cuando la actividad proviene de la API.
     */
    function markApiQuizAsDone() {
      document.querySelectorAll('.quiz-option').forEach(opcion => opcion.classList.add('disabled'));
      document.querySelectorAll('.quiz-feedback').forEach(feedback => {
        feedback.classList.add('show', 'ok');
        feedback.innerHTML = '<i class="fas fa-check-circle"></i> Lección ya completada anteriormente.';
      });
    }

    function refreshLessonCompletionUi() {
      const actual = state.currentLesson;
      if (!actual) return;

      const { moduleId, lessonIndex } = actual;
      const done = state.progress[moduleId]?.lessonsDone || [];
      if (!done.includes(lessonIndex)) return;

      const status = document.querySelector('#lessonView .lx-lesson-head .lx-status');
      if (status) {
        status.classList.remove('lx-status--current');
        status.classList.add('lx-status--done');
        status.textContent = 'Completada';
      }

      const footerRow = document.querySelector('#lessonView .lx-lesson-footer__row');
      const footerButton = footerRow ? footerRow.querySelector('button.btn-primary') : null;
      if (footerButton) {
        const badge = document.createElement('span');
        badge.className = 'lx-status lx-status--done';
        badge.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Completada';
        footerButton.replaceWith(badge);
      }

      const activeLink = document.querySelector('#lessonView .lx-outline__link.is-active');
      if (activeLink) {
        activeLink.classList.add('is-done');
        const number = activeLink.querySelector('.lx-outline__num');
        if (number) number.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
      }

      const course = getCourseModel(moduleId);
      if (!course) return;

      const chip = [...document.querySelectorAll('#lessonView .lx-lesson-head .lx-chip')]
        .find(element => /% del curso$/.test(element.textContent.trim()));
      if (chip) chip.textContent = `${course.porcentaje}% del curso`;

      const meter = document.querySelector('#lessonView .lx-outline__progress .lx-meter');
      if (meter) {
        meter.setAttribute('aria-valuenow', String(course.porcentaje));
        const fill = meter.querySelector('.lx-meter__fill');
        if (fill) fill.style.width = `${course.porcentaje}%`;
      }
      const percentLabel = document.querySelector('#lessonView .lx-outline__progress .lx-progress-line strong');
      if (percentLabel) percentLabel.textContent = `${course.porcentaje}%`;
      const countLabel = document.querySelector('#lessonView .lx-outline__progress .lx-muted');
      const mod = MODULES.find(item => item.id === moduleId);
      if (countLabel && mod) {
        countLabel.textContent = `${done.length} de ${mod.lessons.length} lecciones del curso`;
      }
    }



    function completeLesson(moduleId, lessonIndex) {
      const prog = state.progress[moduleId];
      if (!prog.lessonsDone.includes(lessonIndex)) {
        prog.lessonsDone.push(lessonIndex);
      }

      const mod = MODULES.find(m => m.id === moduleId);
      const wasCompleted = prog.completed;
      const completedNow = prog.lessonsDone.length === mod.lessons.length;

      if (completedNow) {
        prog.completed = true;
        prog.badge = true;
      }

      saveState();

      // Persistencia real: guarda la lección y reconcilia con la API.
      persistLesson(moduleId, lessonIndex).then(async (result) => {
        const lessonNavInfo = document.getElementById('lessonNavInfo');
        if (result.persisted) {
          lessonNavInfo.textContent = 'Lección completada y guardada en la nube.';
        } else if (state.apiOnline) {
          lessonNavInfo.textContent = `Completada localmente; pendiente de sincronización. ${result.reason}`;
        } else {
          lessonNavInfo.textContent = 'Lección completada en este dispositivo.';
        }

        if (result.persisted) {
          try {
            await syncProgressFromApi();
            updateNavbar();
          } catch (err) {
            console.warn('No se pudo sincronizar el progreso:', err.message);
            lessonNavInfo.textContent = 'Completada localmente; pendiente de sincronización.';
          }
        }
      });

      if (completedNow && !wasCompleted) {
        // Mostrar modal de insignia con un pequeño delay
        setTimeout(() => showBadgeModal(mod), 700);
      }
    }

