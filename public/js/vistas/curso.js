/**
 * SPA MéritoDocente · Vista de curso.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       VISTA DE CURSO
    ============================================================ */
    function renderCourseView() {
      const view = document.getElementById('courseView');
      if (!view) return;

      if (!state.currentCourse || !MODULES.some(m => m.id === state.currentCourse)) {
        state.currentCourse = MODULES[0].id;
      }
      const course = getCourseModel(state.currentCourse);
      if (!course) {
        view.innerHTML = '';
        return;
      }

      const pct = course.porcentaje;
      const ctaLabel = course.estado === 'completado'
        ? 'Repasar curso'
        : (course.estado === 'en-curso' ? 'Continuar donde quedé' : 'Empezar curso');

      const ejes = course.origen === 'api'
        ? course.modulos
            .filter(m => m.totalLecciones > 0)
            .map(m => `<li><strong>${lxEscape(m.titulo)}</strong>${m.descripcion ? ` — ${lxEscape(m.descripcion)}` : ''}</li>`)
            .join('')
        : [`<li><strong>${lxEscape(course.titulo)}</strong> — ${lxEscape(course.descripcion)}</li>`]
            .concat(MODULES.find(m => m.id === course.idSpa).lessons.map(l => `<li>${lxEscape(l.title)}</li>`))
            .join('');

      const pathItems = course.modulos.map((m, index) => {
        const itemClass = m.estado === 'completado' ? 'is-done' : (m.estado === 'en-curso' ? 'is-current' : '');
        const statusClass = m.estado === 'completado'
          ? 'lx-status--done'
          : (m.estado === 'en-curso' ? 'lx-status--current' : (m.estado === 'pendiente' ? 'lx-status--pending' : ''));
        const disponibles = m.lessonIndexes.length;
        const moduloArg = m.id == null ? 'null' : `'${m.id}'`;
        const accion = disponibles
          ? `<button class="btn ${m.estado === 'en-curso' ? 'btn-primary' : 'btn-secondary'} btn-sm" type="button"
               onclick="openModule('${course.idSpa}', ${moduloArg})">
               ${m.estado === 'completado' ? 'Repasar módulo' : (m.estado === 'en-curso' ? 'Continuar módulo' : 'Ver módulo')}
             </button>`
          : '<span class="lx-pending">Contenido en preparación</span>';

        return `
          <li class="lx-path__item ${itemClass}">
            <div class="lx-path__rail">
              <span class="lx-path__dot">${m.estado === 'completado' ? '<i class="fas fa-check" aria-hidden="true"></i>' : index + 1}</span>
              <span class="lx-path__line"></span>
            </div>
            <div class="lx-path__card">
              <div class="lx-path__meta">
                <span class="lx-status ${statusClass}">${lxEstadoLabel(m.estado)}</span>
                <span>${lxPlural(m.totalLecciones, 'lección', 'lecciones')}</span>
                ${m.enPreparacion ? `<span>${m.enPreparacion} en preparación</span>` : ''}
                ${disponibles ? `<span>${m.completadas}/${disponibles} completadas</span>` : ''}
              </div>
              <h3 class="lx-path__title">${lxEscape(m.titulo)}</h3>
              ${m.descripcion ? `<p class="lx-path__desc">${lxEscape(m.descripcion)}</p>` : ''}
              <div class="lx-progress-line">
                <div class="lx-meter lx-meter--dark lx-meter--sm" role="progressbar"
                     aria-valuenow="${m.porcentaje}" aria-valuemin="0" aria-valuemax="100"
                     aria-label="Avance del módulo ${lxEscape(m.titulo)}">
                  <span class="lx-meter__fill" style="width:${m.porcentaje}%"></span>
                </div>
                <strong>${m.porcentaje}%</strong>
              </div>
              <div class="lx-path__actions">${accion}</div>
            </div>
          </li>`;
      }).join('');
      view.innerHTML = `
        <nav class="lx-crumbs" aria-label="Ruta de navegación">
          <button type="button" class="lx-crumb" onclick="showView('dashboard')">Mi aprendizaje</button>
          <span class="lx-crumbs__sep" aria-hidden="true">/</span>
          <span class="lx-crumb" aria-current="page">${lxEscape(course.titulo)}</span>
        </nav>

        <header class="lx-hero">
          <div>
            <span class="lx-hero__eyebrow">Curso · ${lxEscape(course.area)}</span>
            <h1>${lxEscape(course.titulo)}</h1>
            <p class="lx-hero__lead">${lxEscape(course.descripcion)}</p>
          </div>
          <div class="lx-chips">
            <span class="lx-chip"><i class="${course.icono}" aria-hidden="true"></i> ${lxEscape(course.nivel)}</span>
            <span class="lx-chip">${lxPlural(course.totalModulos, 'módulo', 'módulos')}</span>
            <span class="lx-chip">${lxPlural(course.totalLecciones, 'lección', 'lecciones')}</span>
            <span class="lx-chip">${course.origen === 'api' ? 'Progreso sincronizado' : 'Avance en este dispositivo'}</span>
          </div>
          <div class="lx-hero__footer">
            <div class="lx-hero__progress">
              <div class="lx-hero__progress-label">
                <span>Tu avance · ${course.completadas} de ${lxPlural(course.leccionesDisponibles, 'lección disponible', 'lecciones disponibles')}</span>
                <strong>${pct}%</strong>
              </div>
              <div class="lx-meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del curso">
                <span class="lx-meter__fill" style="width:${pct}%"></span>
              </div>
            </div>
            <div class="lx-hero__actions">
              <button class="btn btn-primary" type="button" onclick="openLesson('${course.idSpa}', ${course.nextLessonIndex})">
                ${ctaLabel} <i class="fas fa-arrow-right" aria-hidden="true"></i>
              </button>
              <a class="btn btn-ghost" href="#coursePath">Ver la ruta</a>
            </div>
          </div>
        </header>

        <div class="lx-facts" role="list">
          <div class="lx-fact" role="listitem"><span class="lx-fact__label">Módulos</span><span class="lx-fact__value">${course.totalModulos}</span></div>
          <div class="lx-fact" role="listitem"><span class="lx-fact__label">Lecciones</span><span class="lx-fact__value">${course.totalLecciones}</span></div>
          <div class="lx-fact" role="listitem"><span class="lx-fact__label">Nivel</span><span class="lx-fact__value">${lxEscape(course.nivel)}</span></div>
          <div class="lx-fact" role="listitem"><span class="lx-fact__label">Estado</span><span class="lx-fact__value">${lxEstadoLabel(course.estado)}</span></div>
        </div>

        <div class="lx-grid-2">
          <section class="lx-panel" aria-labelledby="courseLearnTitle">
            <div class="lx-panel__head">
              <div>
                <span class="lx-eyebrow">Diseño académico</span>
                <h2 class="lx-h2" id="courseLearnTitle">¿Qué aprenderás?</h2>
              </div>
            </div>
            <ul class="lx-list">${ejes}</ul>
            <div class="lx-empty" style="margin-top:1rem">
              <strong>Resultados de aprendizaje en curación</strong>
              <span>Las competencias, los resultados de aprendizaje y los tiempos por unidad están en revisión editorial. Cuando se aprueben se publicarán aquí; este curso no los presenta como si ya existieran.</span>
            </div>
          </section>

          <section class="lx-panel lx-panel--flat" aria-labelledby="courseHowTitle">
            <div class="lx-panel__head">
              <div>
                <span class="lx-eyebrow">Cómo funciona</span>
                <h2 class="lx-h2" id="courseHowTitle">Tu avance</h2>
              </div>
            </div>
            <ul class="lx-list">
              <li>Cada lección cierra con una actividad de comprobación y retroalimentación.</li>
              <li>${course.origen === 'api'
                ? 'Tu avance se guarda en tu cuenta y se recupera al iniciar sesión.'
                : 'Tu avance se guarda en este dispositivo mientras la conexión con la base de datos no esté disponible.'}</li>
              <li>Puedes retomar el curso en cualquier momento desde la ruta: las lecciones completadas quedan marcadas.</li>
            </ul>
            ${course.origen === 'api'
              ? ''
              : '<p class="lx-note" style="margin-top:1rem">Este curso no está vinculado a la base de datos en este momento. El avance local no reemplaza el progreso de tu cuenta.</p>'}
          </section>
        </div>

        <section class="lx-panel" id="coursePath" aria-labelledby="coursePathTitle">
          <div class="lx-panel__head">
            <div>
              <span class="lx-eyebrow">Ruta de aprendizaje</span>
              <h2 class="lx-h2" id="coursePathTitle">Módulos en orden</h2>
            </div>
            <span class="lx-muted">${course.enPreparacion
              ? `${lxPlural(course.enPreparacion, 'lección', 'lecciones')} en preparación editorial`
              : 'Toda la ruta tiene contenido publicado'}</span>
          </div>
          <ol class="lx-path">${pathItems}</ol>
        </section>
      `;
    }

