/**
 * SPA MéritoDocente · Arranque de la aplicación (init).
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       INICIALIZACIÓN
    ============================================================ */
    (function init() {
      // Toda la interfaz se maneja con delegación: el marcado solo declara
      // `data-action` y aquí se registran los oyentes únicos (click y submit).
      iniciarDelegacionDeEventos();

      loadState();
      updateNavbar();
      initializeAdminDiagnostic();
      loadPilotDuration();
      const returnToDashboard = new URLSearchParams(window.location.search).get('vista') === 'panel';

      // Restaurar la sesión y el progreso reales desde la API.
      refreshSession().then((restored) => {
        if (!restored) return;

        updateNavbar();
        if (state.user) {
          if (returnToDashboard) showView('dashboard');
          else renderDashboard();
        }
      });

      // Sombra navbar al scroll
      const navbar = document.querySelector('.navbar');
      window.addEventListener('scroll', () => {
        navbar.style.boxShadow = window.scrollY > 20
          ? '0 10px 30px -12px rgba(15, 23, 42, 0.12)'
          : 'none';
      }, { passive: true });

      // Cerrar modal al hacer click fuera
      document.getElementById('badgeModal').addEventListener('click', (e) => {
        if (e.target.id === 'badgeModal') closeBadgeModal();
      });

      document.getElementById('loginModal').addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') closeLogin();
      });
      document.addEventListener('keydown', handleModalKeyboard);

      console.log('🚀 MéritoDocente v1.0 · listo');
    })();
