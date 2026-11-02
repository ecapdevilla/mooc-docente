/**
 * SPA MéritoDocente · Panel del estudiante: módulos, insignias y avance.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       DASHBOARD
    ============================================================ */
    function renderDashboard() {
      // Bienvenida
      const firstName = state.user?.nombre?.split(' ')[0] || 'docente';
      document.getElementById('welcomeTitle').textContent = `¡Hola, ${firstName}!`;

      // Stats
      const globalPct = getGlobalProgress();
      document.getElementById('globalProgress').textContent = globalPct + '%';

      let totalLessonsDone = 0;
      let totalLessons = 0;
      let modulesCompleted = 0;

      MODULES.forEach(m => {
        const p = getModuleProgress(m.id);
        totalLessonsDone += p.done;
        totalLessons += p.total;
        if (p.completed) modulesCompleted++;
      });

      document.getElementById('statModules').textContent = `${modulesCompleted}/${MODULES.length}`;
      document.getElementById('statLessons').textContent = `${totalLessonsDone}/${totalLessons}`;
      document.getElementById('statBadges').textContent = `${getBadgesEarned()}/${MODULES.length}`;

      // Módulos
      const grid = document.getElementById('modulesGrid');
      grid.innerHTML = '';

      MODULES.forEach((m, idx) => {
        const p = getModuleProgress(m.id);
        const card = document.createElement('div');
        card.className = 'module-card animate-fadeUp';
        card.style.animationDelay = (idx * 0.08) + 's';

        let statusBadge = '';
        if (p.completed) {
          statusBadge = '<div class="module-status done"><i class="fas fa-check"></i> Completado</div>';
        } else if (p.done > 0) {
          statusBadge = '<div class="module-status"><i class="fas fa-play"></i> En curso</div>';
        } else {
          statusBadge = '<div class="module-status"><i class="fas fa-book-open"></i> Nuevo</div>';
        }

        card.innerHTML = `
          <div class="module-cover ${m.cover}">
            <i class="${m.icon}"></i>
            ${statusBadge}
          </div>
          <div class="module-body">
            <div class="module-meta">
              <span class="tag-area">${m.area}</span>
              <span class="tag-level ${m.levelClass}">${m.level}</span>
            </div>
            <h3>${m.title}</h3>
            <p>${m.description}</p>
            <div class="module-progress">
              <div class="progress-bar">
                <div class="progress-fill ${p.completed ? 'done' : ''}" style="width:${p.percent}%"></div>
              </div>
              <div class="progress-text">
                <span>${p.done}/${p.total} lecciones</span>
                <span>${p.percent}%</span>
              </div>
            </div>
            <button class="btn ${p.completed ? 'btn-ghost' : 'btn-secondary'} btn-block btn-sm" data-action="open-course" data-course-id="${m.id}">
              ${p.completed ? '<i class="fas fa-redo"></i> Repasar curso' : (p.done > 0 ? '<i class="fas fa-play"></i> Continuar curso' : '<i class="fas fa-play"></i> Ver curso')}
            </button>
          </div>
        `;
        grid.appendChild(card);
      });

      // Insignias
      const badgesGrid = document.getElementById('badgesGrid');
      badgesGrid.innerHTML = '';

      MODULES.forEach(m => {
        const p = getModuleProgress(m.id);
        const earned = p.badge;
        const badge = document.createElement('div');
        badge.className = 'badge-card ' + (earned ? 'earned' : 'locked');
        badge.innerHTML = `
          <div class="badge-card-icon ${earned ? m.badge.color : 'gray'}">
            <i class="${m.badge.icon}"></i>
          </div>
          <h5>${m.badge.name}</h5>
          <span>${earned ? 'Obtenida' : 'Bloqueada'}</span>
        `;
        badgesGrid.appendChild(badge);
      });

    }

