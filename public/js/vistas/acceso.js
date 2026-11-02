/**
 * SPA MéritoDocente · Registro, inicio y cierre de sesión.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       REGISTRO
    ============================================================ */
    window.handleRegister = async function (event) {
      event.preventDefault();

      const nombre = document.getElementById('nombre').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const celular = document.getElementById('celular').value.trim();
      const departamento = document.getElementById('departamento').value;

      if (!nombre || !email || !password || !celular || !departamento) {
        alert('Por favor, completa todos los campos.');
        return;
      }

      if (!email.includes('@') || !email.includes('.')) {
        alert('Ingresa un correo electrónico válido.');
        return;
      }

      const celularLimpio = celular.replace(/\D/g, '');
      if (celularLimpio.length < 10) {
        alert('Ingresa un número de celular válido (mínimo 10 dígitos).');
        return;
      }

      if (password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres.');
        return;
      }

      const submitBtn = document.querySelector('#registroForm button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: { nombre, email, password, telefono: celularLimpio, departamento }
        });

        saveSession(data.token, data.user);
        await loadCourseMap();
        await syncProgressFromApi();

        document.getElementById('registroForm').reset();
        updateNavbar();

        alert(`¡Felicidades ${nombre.split(' ')[0]}! 🎉\n\nTu cuenta está activa y tu progreso se guardará en la nube.`);

        showView('dashboard');
      } catch (err) {
        if (err.status) {
          alert(`No pudimos crear tu cuenta: ${err.message}`);
        } else {
          // Sin conexión con la API: modo local para no bloquear la demostración.
          state.user = { nombre, email, celular: celularLimpio, departamento };
          state.apiOnline = false;
          saveState();

          document.getElementById('registroForm').reset();
          updateNavbar();

          alert(`¡Felicidades ${nombre.split(' ')[0]}! 🎉\n\nNo pudimos conectar con el servidor (${API_BASE}). Tu progreso se guardará solo en este dispositivo.`);

          showView('dashboard');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };

    /* ============================================================
       INICIO DE SESIÓN
    ============================================================ */
    window.openLogin = function () {
      const errorBox = document.getElementById('loginError');
      if (errorBox) errorBox.style.display = 'none';

      document.getElementById('loginForm').reset();
      modalReturnFocus = document.activeElement;
      const modal = document.getElementById('loginModal');
      modal.classList.add('show');
      window.getComputedStyle(modal).visibility;
      document.getElementById('loginEmail').focus();
    };

    window.closeLogin = function () {
      document.getElementById('loginModal').classList.remove('show');
      restoreModalFocus();
    };

    window.handleLogin = async function (event) {
      event.preventDefault();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errorBox = document.getElementById('loginError');
      const submitBtn = document.getElementById('loginSubmit');

      if (!email || !password) return;

      errorBox.style.display = 'none';
      submitBtn.disabled = true;

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: { email, password }
        });

        saveSession(data.token, data.user);
        await loadCourseMap();
        await syncProgressFromApi();

        closeLogin();
        updateNavbar();
        showView('dashboard');
      } catch (err) {
        errorBox.textContent = err.status
          ? err.message
          : `No pudimos conectar con el servidor (${API_BASE}). Verifica tu conexión.`;
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
      }
    };

    window.logout = function () {
      if (confirm('¿Cerrar sesión? Tu progreso queda guardado en tu cuenta.')) {
        clearSession();
        MODULES.forEach(m => {
          state.progress[m.id] = { lessonsDone: [], completed: false, badge: false };
        });
        state.currentLesson = null;
        saveState();
        updateNavbar();
        showView('landing');
      }
    };

