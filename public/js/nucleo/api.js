/**
 * SPA MéritoDocente · Cliente HTTP de la API (/api/v1) y claves de sesión.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       API: AUTENTICACIÓN Y PROGRESO
       Persistencia real en PostgreSQL a través de /api/v1.
       Si la API no está disponible, la SPA sigue funcionando en local.
    ============================================================ */
    const API_BASE =
      window.MERITO_API_BASE ||
      (window.location.protocol.startsWith('http')
        ? `${window.location.origin}/api/v1`
        : 'http://localhost:3000/api/v1');

    const TOKEN_KEY = 'auth_token';
    const USER_KEY = 'user';

    async function apiFetch(endpoint, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }

      if (!response.ok) {
        const error = new Error((data && data.error) || `HTTP ${response.status}`);
        error.status = response.status;
        // El cuerpo del error viaja con la excepción para que las vistas puedan
        // mostrar datos accionables (por ejemplo, los requisitos de un 403).
        error.data = data;
        throw error;
      }

      return data;
    }

