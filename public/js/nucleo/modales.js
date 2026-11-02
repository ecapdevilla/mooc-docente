/**
 * SPA MéritoDocente · Modales de insignia y gestión de foco.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       MODAL DE INSIGNIA
    ============================================================ */
    function showBadgeModal(mod) {
      document.getElementById('badgeModalIcon').className = mod.badge.icon;
      document.getElementById('badgeModalName').textContent = mod.badge.name;
      modalReturnFocus = document.activeElement;
      const modal = document.getElementById('badgeModal');
      modal.classList.add('show');
      window.getComputedStyle(modal).visibility;
      document.getElementById('badgeModalClose').focus();
    }

    window.closeBadgeModal = function () {
      document.getElementById('badgeModal').classList.remove('show');
      restoreModalFocus();
    };

    function restoreModalFocus() {
      const target = modalReturnFocus;
      modalReturnFocus = null;
      if (
        target?.isConnected &&
        !target.disabled &&
        !target.closest('.hidden') &&
        window.getComputedStyle(target).display !== 'none'
      ) {
        target.focus();
      }
    }

    function handleModalKeyboard(event) {
      const modal = document.querySelector('.modal-overlay.show');
      if (!modal) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (modal.id === 'loginModal') closeLogin();
        else closeBadgeModal();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) =>
        !element.closest('[hidden]') &&
        window.getComputedStyle(element).display !== 'none'
      );
      if (!focusable.length) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

