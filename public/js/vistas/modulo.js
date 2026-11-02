/**
 * SPA MéritoDocente · Vista de módulo.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       VISTA DE MÓDULO
    ============================================================ */
    function renderModuleView() {
      const view = document.getElementById('moduleView');
      if (!view) return;

      if (!state.currentCourse || !MODULES.some(m => m.id === state.currentCourse)) {
        state.currentCourse = MODULES[0].id;
      }
      const model = getModuleModel(state.currentCourse, state.currentModule);
      if (!model) {
        view.innerHTML = '';
        return;
      }

      const { course, modulo } = model;
      const disponibles = modulo.lessonIndexes.length;
      const pct = modulo.porcentaje;
      const estadoModulo = lxEstadoLabel(modulo.estado);

      const filas = model.lecciones.map(leccion => {
        const esSiguiente = !!model.siguiente && model.siguiente.index === leccion.index;
        const clases = [
          'lx-lesson-row',
          leccion.completada ? 'is-done' : '',
          esSiguiente ? 'is-current' : ''
        ].filter(Boolean).join(' ');

        return `
          <li>
            <article class="${clases}">
              <span class="lx-lesson-row__index">${leccion.completada ? '<i class="fas fa-check" aria-hidden="true"></i>' : leccion.index + 1}</span>
              <div class="lx-lesson-row__body">
                <h3 class="lx-lesson-row__title">${lxEscape(leccion.titulo)}</h3>
                ${leccion.descripcion ? `<p class="lx-lesson-row__desc">${lxEscape(leccion.descripcion)}</p>` : ''}
                <div class="lx-lesson-row__meta">
                  <span class="lx-status ${leccion.completada ? 'lx-status--done' : (esSiguiente ? 'lx-status--current' : '')}">${leccion.completada ? 'Completada' : (esSiguiente ? 'Siguiente' : 'Pendiente')}</span>
                  <span>${leccion.tieneQuiz ? 'Actividad de comprobación' : 'Lectura guiada'}</span>
                </div>
              </div>
              <div class="lx-lesson-row__action">
                <button class="btn btn-secondary btn-sm" type="button" onclick="openLesson('${course.idSpa}', ${leccion.index})">
                  ${leccion.completada ? 'Repasar' : (esSiguiente ? 'Continuar' : 'Abrir')}
                </button>
              </div>
            </article>
          </li>`;
      }).join('');

      const filasPendientes = model.pendientes.map(p => `
        <li>
          <article class="lx-lesson-row is-pending">
            <span class="lx-lesson-row__index"><i class="fas fa-hourglass-half" aria-hidden="true"></i></span>
            <div class="lx-lesson-row__body">
              <h3 class="lx-lesson-row__title">${lxEscape(p.titulo)}</h3>
              ${p.descripcion ? `<p class="lx-lesson-row__desc">${lxEscape(p.descripcion)}</p>` : ''}
              <div class="lx-lesson-row__meta">
                <span class="lx-status lx-status--pending">En preparación</span>
                <span>Contenido en revisión editorial</span>
              </div>
            </div>
            <div class="lx-lesson-row__action"><span class="lx-pending">Aún sin contenido</span></div>
          </article>
        </li>`).join('');
      const idxActual = course.modulos.indexOf(modulo);
      const siguienteModulo = course.modulos[idxActual + 1] || null;

      const continuar = disponibles
        ? (model.siguiente
          ? `<section class="lx-continue">
               <div class="lx-continue__text">
                 <strong>Continúa con: ${lxEscape(model.siguiente.titulo)}</strong>
                 <span>Lección ${model.siguiente.index + 1} de ${disponibles} de este módulo</span>
               </div>
               <button class="btn btn-primary btn-sm" type="button" onclick="openLesson('${course.idSpa}', ${model.siguiente.index})">
                 ${modulo.completadas > 0 ? 'Continuar lección' : 'Empezar lección'}
                 <i class="fas fa-arrow-right" aria-hidden="true"></i>
               </button>
             </section>`
          : `<section class="lx-continue">
               <div class="lx-continue__text">
                 <strong>Módulo completado</strong>
                 <span>Puedes repasar cualquier lección desde la lista.</span>
               </div>
               <button class="btn btn-ghost btn-sm" type="button" onclick="openLesson('${course.idSpa}', ${model.lecciones[0].index})">
                 Repasar desde el inicio
               </button>
             </section>`)
        : '';

      const siguienteArg = siguienteModulo && siguienteModulo.id != null
        ? `'${siguienteModulo.id}'`
        : 'null';

      view.innerHTML = `
        <nav class="lx-crumbs" aria-label="Ruta de navegación">
          <button type="button" class="lx-crumb" onclick="showView('dashboard')">Mi aprendizaje</button>
          <span class="lx-crumbs__sep" aria-hidden="true">/</span>
          <button type="button" class="lx-crumb" onclick="openCourse('${course.idSpa}')">${lxEscape(course.titulo)}</button>
          <span class="lx-crumbs__sep" aria-hidden="true">/</span>
          <span class="lx-crumb" aria-current="page">Módulo ${model.posicion}</span>
        </nav>

        <section class="lx-panel" aria-labelledby="moduleTitle">
          <div class="lx-module-head">
            <span class="lx-module-head__position">Módulo ${model.posicion} de ${model.totalModulos} · ${estadoModulo}</span>
            <h1 id="moduleTitle">${lxEscape(modulo.titulo)}</h1>
            ${modulo.descripcion ? `<p class="lx-module-head__lead">${lxEscape(modulo.descripcion)}</p>` : ''}
            ${disponibles
              ? `<div class="lx-progress-line">
                   <div class="lx-meter lx-meter--dark lx-meter--sm" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del módulo">
                     <span class="lx-meter__fill" style="width:${pct}%"></span>
                   </div>
                   <strong>${pct}%</strong>
                   <span>${modulo.completadas}/${disponibles} lecciones</span>
                 </div>`
              : '<span class="lx-pending">Este módulo aún no tiene lecciones disponibles</span>'}
            <div class="lx-chips">
              <span class="lx-chip lx-chip--light">${lxPlural(modulo.totalLecciones, 'lección', 'lecciones')} en la ruta</span>
              <span class="lx-chip lx-chip--light">${disponibles} con contenido</span>
              ${modulo.enPreparacion ? `<span class="lx-chip lx-chip--light">${modulo.enPreparacion} en preparación</span>` : ''}
            </div>
          </div>
        </section>

        ${continuar}

        <section class="lx-panel" aria-labelledby="moduleLessonsTitle">
          <div class="lx-panel__head">
            <div>
              <span class="lx-eyebrow">Contenido del módulo</span>
              <h2 class="lx-h2" id="moduleLessonsTitle">Lecciones</h2>
            </div>
            <span class="lx-muted">${disponibles} con contenido${model.pendientes.length ? ` · ${model.pendientes.length} en preparación` : ''}</span>
          </div>
          <ul class="lx-lesson-list">${filas}${filasPendientes}</ul>
          <div class="lx-empty" style="margin-top:1rem">
            <strong>Objetivos y competencias en curación</strong>
            <span>Este módulo todavía no publica objetivos ni competencias verificadas. La ruta visible se organiza por lecciones con contenido aprobado.</span>
          </div>
        </section>

        <div class="lx-panel lx-panel--flat">
          <div class="lx-lesson-footer__row">
            <button class="btn btn-ghost btn-sm" type="button" onclick="openCourse('${course.idSpa}')">
              <i class="fas fa-arrow-left" aria-hidden="true"></i> Volver al curso
            </button>
            <div class="lx-lesson-footer__nav">
              ${siguienteModulo
                ? `<button class="btn btn-secondary btn-sm" type="button" onclick="openModule('${course.idSpa}', ${siguienteArg})">
                     Siguiente módulo <i class="fas fa-arrow-right" aria-hidden="true"></i>
                   </button>`
                : `<button class="btn btn-secondary btn-sm" type="button" onclick="openCourse('${course.idSpa}')">
                     Ver la ruta del curso
                   </button>`}
            </div>
          </div>
        </div>
      `;
    }

