/**
 * Prueba de la interfaz real del SPA (indexInicial.html) con un DOM verdadero.
 *
 * Carga el archivo, ejecuta su JavaScript y maneja los formularios de matrícula
 * e inicio de sesión contra la API real. Detecta errores que solo aparecen en
 * el navegador (por ejemplo, un error de JavaScript que desactive los botones).
 */

const path = require('path');
const { JSDOM } = require('jsdom');

const app = require('../src/server');
const { pool } = require('../src/config/database');

const HTML_PATH = path.join(__dirname, '..', 'indexInicial.html');

let server;
let baseUrl;
let dom;
let window;

jest.setTimeout(60000);

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  dom = await JSDOM.fromFile(HTML_PATH, {
    runScripts: 'dangerously',
    url: `${baseUrl}/`,
    pretendToBeVisual: true,
    beforeParse(win) {
      // jsdom no implementa alert/confirm, fetch ni scroll
      win.alert = () => {};
      win.confirm = () => true;
      win.fetch = (url, options) => globalThis.fetch(url, options);
      win.scrollTo = () => {};
      win.Element.prototype.scrollIntoView = () => {};
    },
  });

  window = dom.window;

  // Esperar a que el script en línea termine de inicializar
  await new Promise((resolve) => setTimeout(resolve, 500));
});

afterAll(async () => {
  if (window) window.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

function submitEvent() {
  return { preventDefault() {} };
}

describe('SPA indexInicial.html', () => {
  test('el script se evalúa y expone los manejadores de sesión', () => {
    expect(typeof window.handleRegister).toBe('function');
    expect(typeof window.handleLogin).toBe('function');
    expect(typeof window.openLogin).toBe('function');
    expect(typeof window.showView).toBe('function');
  });

  test('la navbar muestra el botón de inicio de sesión cuando no hay sesión', () => {
    const loginBtn = window.document.getElementById('loginBtn');
    const modal = window.document.getElementById('loginModal');

    expect(loginBtn).not.toBeNull();
    expect(modal).not.toBeNull();
  });

  test('openLogin/closeLogin abren y cierran el modal', () => {
    const modal = window.document.getElementById('loginModal');

    window.openLogin();
    expect(modal.classList.contains('show')).toBe(true);

    window.closeLogin();
    expect(modal.classList.contains('show')).toBe(false);
  });

  test('la matrícula crea una cuenta real y deja la sesión guardada', async () => {
    const email = `spa.dom.${Date.now()}@meritodocente.com`;

    window.document.getElementById('nombre').value = 'Docente DOM';
    window.document.getElementById('email').value = email;
    window.document.getElementById('password').value = 'Agente12345';
    window.document.getElementById('celular').value = '3001234567';
    window.document.getElementById('departamento').value = 'Cundinamarca';

    await window.handleRegister(submitEvent());

    expect(window.localStorage.getItem('auth_token')).toBeTruthy();
    expect(window.localStorage.getItem('user')).toContain(email);
    expect(window.document.getElementById('view-dashboard').classList.contains('hidden')).toBe(false);

    await pool.query('DELETE FROM users WHERE email = $1', [email]);
  });

  test('el inicio de sesión autentica con la cuenta creada y carga el progreso', async () => {
    const email = `spa.dom.login.${Date.now()}@meritodocente.com`;

    // Crear la cuenta por la vía de la API (equivalente a una matrícula previa)
    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Docente Login', email, password: 'Agente12345' }),
    });

    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('user');

    window.openLogin();
    window.document.getElementById('loginEmail').value = email;
    window.document.getElementById('loginPassword').value = 'Agente12345';

    await window.handleLogin(submitEvent());

    expect(window.localStorage.getItem('auth_token')).toBeTruthy();
    expect(window.document.getElementById('loginModal').classList.contains('show')).toBe(false);
    expect(window.document.getElementById('view-dashboard').classList.contains('hidden')).toBe(false);
    expect(window.document.getElementById('loginError').style.display).toBe('none');

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(window.document.getElementById('postLoginQuizPanel').textContent).toMatch(/Diagnóstico inicial/i);

    await pool.query('DELETE FROM users WHERE email = $1', [email]);
  });

  test('el inicio de sesión con contraseña incorrecta muestra el error en el modal', async () => {
    const email = `spa.dom.malo.${Date.now()}@meritodocente.com`;

    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Docente Malo', email, password: 'Agente12345' }),
    });

    // Sin sesión previa de otras pruebas
    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('user');

    window.openLogin();
    window.document.getElementById('loginEmail').value = email;
    window.document.getElementById('loginPassword').value = 'ClaveIncorrecta1';

    await window.handleLogin(submitEvent());

    expect(window.document.getElementById('loginError').style.display).toBe('block');
    expect(window.document.getElementById('loginError').textContent).toMatch(/Credenciales/i);
    expect(window.localStorage.getItem('auth_token')).toBeFalsy();

    await pool.query('DELETE FROM users WHERE email = $1', [email]);
  });

  test('un usuario con sesión no vuelve a la landing al pulsar Inicio', async () => {
    const email = `spa.dom.inicio.${Date.now()}@meritodocente.com`;

    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Docente Inicio', email, password: 'Agente12345' }),
    });

    window.openLogin();
    window.document.getElementById('loginEmail').value = email;
    window.document.getElementById('loginPassword').value = 'Agente12345';
    await window.handleLogin(submitEvent());

    // El enlace "Inicio" y el logo llaman a showView('landing')
    window.showView('landing');

    expect(window.document.getElementById('view-dashboard').classList.contains('hidden')).toBe(false);
    expect(window.document.getElementById('view-landing').classList.contains('hidden')).toBe(true);

    // Al cerrar sesión sí se puede volver a la landing
    window.logout();
    expect(window.document.getElementById('view-landing').classList.contains('hidden')).toBe(false);

    await pool.query('DELETE FROM users WHERE email = $1', [email]);
  });
});
