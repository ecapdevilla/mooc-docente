/**
 * SPA MéritoDocente · Helpers de vista, navbar y progreso derivado.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       HELPERS
    ============================================================ */
    function showView(view) {
      if (view === 'admin-diagnostic') {
        if (!state.user) {
          openLogin();
          return;
        }
        if (state.user.rol !== 'admin') {
          view = 'dashboard';
        }
      }

      // Un usuario con sesión no necesita volver a la landing de matrícula:
      // se le mantiene en su área de aprendizaje.
      if (view === 'landing' && state.user) {
        view = 'dashboard';
      }

      document.getElementById('view-landing').classList.add('hidden');
      document.getElementById('view-dashboard').classList.add('hidden');
      document.getElementById('view-course').classList.add('hidden');
      document.getElementById('view-module').classList.add('hidden');
      document.getElementById('view-lesson').classList.add('hidden');
      document.getElementById('view-admin-diagnostic').classList.add('hidden');

      if (view === 'landing') {
        document.getElementById('view-landing').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (view === 'dashboard') {
        if (!state.user) {
          // Si no hay usuario, mostrar landing
          document.getElementById('view-landing').classList.remove('hidden');
          document.getElementById('registro').scrollIntoView({ behavior: 'smooth' });
          return;
        }
        document.getElementById('view-dashboard').classList.remove('hidden');
        renderDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (view === 'course' || view === 'module') {
        if (!state.user) {
          showView('dashboard');
          return;
        }
        if (view === 'course') {
          renderCourseView();
          document.getElementById('view-course').classList.remove('hidden');
        } else {
          renderModuleView();
          document.getElementById('view-module').classList.remove('hidden');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (view === 'lesson') {
        document.getElementById('view-lesson').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (view === 'admin-diagnostic') {
        document.getElementById('view-admin-diagnostic').classList.remove('hidden');
        loadAdminDiagnostic().catch((error) => {
          setAdminDiagnosticNotice(error.message || 'No se pudo cargar el módulo administrativo.');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      updateNavbar();
    }

    function updateNavbar() {
      const chip = document.getElementById('userChip');
      const logoutBtn = document.getElementById('logoutBtn');
      const loginBtn = document.getElementById('loginBtn');
      const adminNav = document.getElementById('adminDiagnosticNav');
      const adminShortcut = document.getElementById('adminDashboardShortcut');
      const isAdmin = state.user?.rol === 'admin';
      if (adminNav) adminNav.style.display = isAdmin ? '' : 'none';
      if (adminShortcut) adminShortcut.style.display = isAdmin ? 'flex' : 'none';

      if (state.user) {
        chip.style.display = 'flex';
        logoutBtn.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';

        const nombre = state.user.nombre || 'Docente';
        document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
        document.getElementById('userName').textContent = nombre.split(' ')[0];
        const hasCompleteCourseMap = MODULES.every(mod =>
          state.courseMap[mod.id] &&
          state.courseMap[mod.id].lessons.every(Boolean)
        );
        document.getElementById('userRole').textContent = state.apiOnline
          ? (hasCompleteCourseMap ? 'Progreso en la nube' : 'Sincronización pendiente')
          : 'Preparándose';
      } else {
        chip.style.display = 'none';
        logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'flex';
      }
    }

    function getModuleProgress(modId) {
      const p = state.progress[modId] || { lessonsDone: [], completed: false, badge: false };
      const total = MODULES.find(m => m.id === modId).lessons.length;
      const done = p.lessonsDone.length;
      return {
        done,
        total,
        percent: total ? Math.round((done / total) * 100) : 0,
        completed: p.completed,
        badge: p.badge
      };
    }

    function getGlobalProgress() {
      let totalLessons = 0;
      let doneLessons = 0;
      MODULES.forEach(m => {
        totalLessons += m.lessons.length;
        doneLessons += (state.progress[m.id]?.lessonsDone?.length || 0);
      });
      return totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
    }

    function getBadgesEarned() {
      return MODULES.filter(m => state.progress[m.id]?.badge).length;
    }

