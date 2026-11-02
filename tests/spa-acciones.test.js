/**
 * T2.1 · La interfaz no usa manejadores en línea: cada control declara su
 * intención con `data-action` y un único oyente delegado la resuelve.
 *
 * La suite cubre tres frentes: contrato estático del marcado y de los módulos,
 * coherencia entre las acciones declaradas y el registro de `acciones.js`, y
 * comportamiento real en jsdom con clics y envíos de formulario verdaderos.
 */

const fs = require('fs');
const path = require('path');

const { api, closePool } = require('./helpers');
const { cargarSpa, leerModulos, HTML_SPA, RAIZ } = require('./spa-dom');

jest.setTimeout(30000);

const RUTA_ACCIONES = path.join(RAIZ, 'public', 'js', 'nucleo', 'acciones.js');
const FUENTE_ACCIONES = fs.readFileSync(RUTA_ACCIONES, 'utf8');

/** Atributos de evento en línea que la CSP `script-src-attr 'none'` bloquea. */
const PATRON_MANEJADOR =
  /\son(?:click|submit|change|input|keydown|keyup|keypress|focus|blur|load|error|mouseover|mouseout|dblclick)\s*=/i;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Todos los archivos JavaScript del SPA, sin dependencias externas. */
function archivosJs(directorio) {
  return fs.readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosJs(ruta);
    return entrada.name.endsWith('.js') ? [ruta] : [];
  });
}

const ARCHIVOS_JS = archivosJs(path.join(RAIZ, 'public', 'js'));

/** Claves del objeto ACCIONES declarado en acciones.js. */
const ACCIONES_REGISTRADAS = [
  ...FUENTE_ACCIONES.matchAll(/^\s*'([a-z]+(?:-[a-z]+)*)':\s*\(/gm),
].map((coincidencia) => coincidencia[1]);

/** Acciones efectivamente declaradas en el marcado o en las plantillas. */
function accionesDeclaradas(fuente) {
  return [...fuente.matchAll(/data-action="([^"]*)"/g)].map((coincidencia) => coincidencia[1]);
}

const SCRIPTS = [...HTML_SPA.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(
  (coincidencia) => coincidencia[1]
);

afterAll(closePool);

describe('T2.1 · contrato estático de la delegación', () => {
  test('el marcado y todos los módulos declaran cero manejadores en línea', () => {
    expect(HTML_SPA).not.toMatch(PATRON_MANEJADOR);

    ARCHIVOS_JS.forEach((archivo) => {
      const codigo = fs.readFileSync(archivo, 'utf8');
      expect({ archivo: path.basename(archivo), manejador: PATRON_MANEJADOR.test(codigo) }).toEqual({
        archivo: path.basename(archivo),
        manejador: false,
      });
    });
  });

  test('cada acción declarada en el marcado existe en el registro', () => {
    const declaradas = [
      ...new Set([
        ...accionesDeclaradas(HTML_SPA),
        ...ARCHIVOS_JS.flatMap((archivo) => accionesDeclaradas(fs.readFileSync(archivo, 'utf8'))),
      ]),
    ];

    expect(declaradas.length).toBeGreaterThanOrEqual(12);
    declaradas.forEach((accion) => {
      expect(ACCIONES_REGISTRADAS).toContain(accion);
    });
  });

  test('acciones.js se carga antes de principal.js y registra los dos oyentes', () => {
    expect(SCRIPTS).toContain('/js/nucleo/acciones.js');
    expect(SCRIPTS.indexOf('/js/nucleo/acciones.js')).toBeLessThan(SCRIPTS.indexOf('/js/principal.js'));

    expect(FUENTE_ACCIONES).toContain("document.addEventListener('click', manejarAccionDelegada)");
    expect(FUENTE_ACCIONES).toContain("document.addEventListener('submit', manejarAccionDelegada)");
    expect(FUENTE_ACCIONES).not.toMatch(/\beval\s*\(/);
  });

  test('la CSP servida por Express vuelve a bloquear los atributos en línea', async () => {
    const res = await api.get('/');
    const csp = res.headers['content-security-policy'] || '';

    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).not.toContain("script-src-attr 'unsafe-inline'");
  });
});

describe('T2.1 · comportamiento delegado en jsdom', () => {
  let dom;
  let window;
  let doc;

  beforeAll(async () => {
    dom = await cargarSpa();
    window = dom.window;
    doc = window.document;
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('el botón de la navbar abre el modal y el botón Cancelar lo cierra', () => {
    const modal = doc.getElementById('loginModal');

    doc.getElementById('loginBtn').click();
    expect(modal.classList.contains('show')).toBe(true);

    doc.querySelector('#loginModal [data-action="close-login"]').click();
    expect(modal.classList.contains('show')).toBe(false);
  });

  test('enviar el formulario de sesión ejecuta handleLogin y cancela la navegación', async () => {
    window.openLogin();
    doc.getElementById('loginEmail').value = 'docente@example.com';
    doc.getElementById('loginPassword').value = 'Agente12345';

    const noCancelado = doc
      .getElementById('loginForm')
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    // `preventDefault` de la delegación sustituye al antiguo `return false`.
    expect(noCancelado).toBe(false);

    await esperar(50);

    // jsdom no implementa fetch: handleLogin cae en el mensaje de conexión.
    const error = doc.getElementById('loginError');
    expect(error.style.display).toBe('block');
    expect(error.textContent).toMatch(/conectar con el servidor/i);
  });

  test('la tarjeta de curso del panel abre la vista de curso', () => {
    window.eval(
      "state.user = { nombre: 'Docente Prueba', rol: 'docente' };" +
        'state.apiOnline = false;' +
        'updateNavbar();' +
        'renderDashboard();'
    );

    const boton = doc.querySelector('#modulesGrid [data-action="open-course"]');
    expect(boton).not.toBeNull();

    boton.click();

    expect(window.eval('state.currentCourse')).toBe(boton.dataset.courseId);
    expect(doc.getElementById('view-course').classList.contains('hidden')).toBe(false);
  });

  test('el quiz de lección y el botón de completar responden a clics reales', () => {
    const modulo = leerModulos()[0];
    const quiz = modulo.lessons[0].quiz;
    const incorrecta = (quiz.correct + 1) % quiz.options.length;

    window.openLesson(modulo.id, 0);

    const opciones = doc.querySelectorAll('#quizOptions .quiz-option');
    expect(opciones).toHaveLength(quiz.options.length);

    opciones[incorrecta].click();

    expect(doc.querySelectorAll('.quiz-option.correct')).toHaveLength(1);
    expect(opciones[incorrecta].classList.contains('incorrect')).toBe(true);
    expect(doc.getElementById('quizFeedback').classList.contains('show')).toBe(true);

    const marcar = doc.querySelector('[data-action="complete-lesson"]');
    expect(marcar).not.toBeNull();

    marcar.click();

    const guardado = JSON.parse(window.localStorage.getItem('meritodocente_state_v1'));
    expect(guardado.progress[modulo.id].lessonsDone).toContain(0);
  });

  test('los enlaces del índice de la lección navegan entre lecciones', () => {
    const modulo = leerModulos()[0];

    window.openLesson(modulo.id, 0);

    const enlaces = doc.querySelectorAll('#lessonView .lx-outline__link[data-action="open-lesson"]');
    expect(enlaces.length).toBeGreaterThan(1);

    // El último enlace del índice apunta a la última lección disponible.
    const ultimo = enlaces[enlaces.length - 1];
    const indice = Number(ultimo.dataset.lessonIndex);

    ultimo.click();

    expect(window.eval('state.currentLesson.lessonIndex')).toBe(indice);
  });
});

