/**
 * T2.2 · Router por hash.
 *
 * Cubre tres frentes: contrato estático del archivo y su lugar en el pipeline,
 * resolución de rutas y redirecciones sin sesión, y navegación real en jsdom
 * (hashchange, popstate, botón atrás y enlaces profundos con sesión).
 */

const fs = require('fs');
const path = require('path');

const { cargarSpa, esperar, leerModulos, RAIZ, HTML_SPA } = require('./spa-dom');

jest.setTimeout(30000);

const FUENTE_RUTA = fs.readFileSync(path.join(RAIZ, 'public', 'js', 'nucleo', 'ruta.js'), 'utf8');

const SCRIPTS = [...HTML_SPA.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(
  (coincidencia) => coincidencia[1]
);

const MODULOS = leerModulos();
const PRIMER_CURSO = MODULOS[0];

/** Una vista está visible cuando su contenedor no lleva la clase `hidden`. */
function visible(doc, id) {
  const vista = doc.getElementById(id);
  return Boolean(vista) && !vista.classList.contains('hidden');
}

function hash(window) {
  return window.location.hash;
}

describe('T2.2 · contrato del router', () => {
  test('ruta.js se carga después de las vistas y antes de principal.js', () => {
    const indiceRuta = SCRIPTS.indexOf('/js/nucleo/ruta.js');

    expect(indiceRuta).toBeGreaterThan(-1);
    expect(indiceRuta).toBeGreaterThan(SCRIPTS.indexOf('/js/vistas/leccion.js'));
    expect(indiceRuta).toBeLessThan(SCRIPTS.indexOf('/js/principal.js'));
  });

  test('el router escucha hashchange y popstate y escribe en el historial', () => {
    expect(FUENTE_RUTA).toContain("window.addEventListener('hashchange'");
    expect(FUENTE_RUTA).toContain("window.addEventListener('popstate'");
    expect(FUENTE_RUTA).toContain('window.history.pushState');
    expect(FUENTE_RUTA).toContain('window.history.replaceState');
    expect(FUENTE_RUTA).toContain('function iniciarRuta()');
  });

  test('el router no evalúa texto ni depende de manejadores en línea', () => {
    expect(FUENTE_RUTA).not.toMatch(/\beval\s*\(/);
    expect(FUENTE_RUTA).not.toMatch(/new\s+Function\s*\(/);
    expect(FUENTE_RUTA).not.toMatch(/<a\s[^>]*on[a-z]+\s*=/i);
  });

  test('normaliza los hashes a la forma canónica', async () => {
    const dom = await cargarSpa({ url: 'http://localhost/' });
    const { window } = dom;

    expect(window.normalizarRuta('')).toBe('#/');
    expect(window.normalizarRuta('#')).toBe('#/');
    expect(window.normalizarRuta('#/')).toBe('#/');
    expect(window.normalizarRuta('#/dashboard/')).toBe('#/dashboard');
    expect(window.normalizarRuta('dashboard')).toBe('#/dashboard');
    expect(window.normalizarRuta('#dashboard')).toBe('#/dashboard');
    expect(window.normalizarRuta('#/leccion/mod1/2/')).toBe('#/leccion/mod1/2');

    window.close();
  });

  test('construye las rutas de curso, módulo y lección', async () => {
    const dom = await cargarSpa({ url: 'http://localhost/' });
    const { window } = dom;

    expect(window.rutaDeCurso('mod1')).toBe('#/curso/mod1');
    expect(window.rutaDeModulo('mod1', null)).toBe('#/modulo/mod1');
    expect(window.rutaDeModulo('mod1', 12)).toBe('#/modulo/mod1/12');
    expect(window.rutaDeLeccion('mod1', 0)).toBe('#/leccion/mod1/0');

    window.close();
  });
});

describe('T2.2 · navegación con sesión', () => {
  let dom;
  let window;
  let doc;

  beforeAll(async () => {
    dom = await cargarSpa({ url: 'http://localhost/' });
    window = dom.window;
    doc = dom.window.document;

    // Sesión simulada: la navegación no necesita la API para resolver rutas.
    window.eval(
      "state.user = { nombre: 'Docente Ruta', rol: 'docente' };" +
        'state.apiOnline = false;' +
        'saveState();' +
        'updateNavbar();'
    );

    await esperar(50);
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('openCourse escribe la ruta del curso', () => {
    window.openCourse('mod2');

    expect(hash(window)).toBe('#/curso/mod2');
    expect(visible(doc, 'view-course')).toBe(true);
    expect(visible(doc, 'view-dashboard')).toBe(false);
  });

  test('openModule escribe la ruta del módulo y openLesson la de la lección', () => {
    window.openModule('mod2', null);
    expect(hash(window)).toBe('#/modulo/mod2');
    expect(visible(doc, 'view-module')).toBe(true);

    window.openLesson('mod2', 1);
    expect(hash(window)).toBe('#/leccion/mod2/1');
    expect(visible(doc, 'view-lesson')).toBe(true);
    expect(window.eval('state.currentLesson.lessonIndex')).toBe(1);
  });

  test('el botón atrás devuelve a la vista anterior', async () => {
    window.history.back();
    await esperar(120);

    expect(hash(window)).toBe('#/modulo/mod2');
    expect(visible(doc, 'view-module')).toBe(true);
    expect(visible(doc, 'view-lesson')).toBe(false);
  });

  test('un enlace profundo a una lección la abre directamente', async () => {
    window.location.hash = '#/leccion/mod1/2';
    await esperar(40);

    expect(window.eval('state.currentLesson.moduleId')).toBe('mod1');
    expect(window.eval('state.currentLesson.lessonIndex')).toBe(2);
    expect(visible(doc, 'view-lesson')).toBe(true);
  });

  test('un curso inexistente cae al panel', async () => {
    window.location.hash = '#/curso/no-existe';
    await esperar(40);

    expect(hash(window)).toBe('#/dashboard');
    expect(visible(doc, 'view-dashboard')).toBe(true);
  });

  test('los alias por id de la API resuelven el curso y se canonizan', async () => {
    window.eval(
      'state.courseMap = {' +
        "  mod1: {" +
        '    courseId: 1,' +
        "    courseTitulo: 'Fundamentos'," +
        '    moduloIds: [7, 8],' +
        '    modules: [' +
        "      { id: 7, titulo: 'Módulo siete', descripcion: '', orden: 1, lecciones: [{ id: 100, titulo: 'Lección' }] }," +
        "      { id: 8, titulo: 'Módulo ocho', descripcion: '', orden: 2, lecciones: [] }" +
        '    ],' +
        '    apiLessons: [],' +
        '    lessons: [{ id: 100, moduloId: 7 }, null, null]' +
        '  }' +
        '};'
    );

    window.location.hash = '#/modulo/8';
    await esperar(40);

    expect(window.eval('String(state.currentModule)')).toBe('8');
    expect(hash(window)).toBe('#/modulo/mod1/8');

    window.location.hash = '#/leccion/100';
    await esperar(40);

    expect(window.eval('state.currentLesson.moduleId')).toBe('mod1');
    expect(window.eval('state.currentLesson.lessonIndex')).toBe(0);
    expect(hash(window)).toBe('#/leccion/mod1/0');
  });

  test('el diagnóstico conserva su ruta y se cierra al panel', async () => {
    window.location.hash = '#/diagnostico';
    await esperar(40);

    expect(hash(window)).toBe('#/diagnostico');
    expect(visible(doc, 'view-dashboard')).toBe(true);

    window.closeDiagnosticQuiz();
    expect(hash(window)).toBe('#/dashboard');
  });
});

describe('T2.2 · rutas sin sesión', () => {
  let dom;
  let window;
  let doc;

  beforeAll(async () => {
    // Enlace profundo a una vista protegida sin token guardado.
    dom = await cargarSpa({ url: 'http://localhost/#/dashboard' });
    window = dom.window;
    doc = dom.window.document;
    await esperar(50);
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('un enlace protegido sin sesión redirige al acceso y abre el modal', () => {
    expect(hash(window)).toBe('#/acceso');
    expect(visible(doc, 'view-landing')).toBe(true);
    expect(visible(doc, 'view-dashboard')).toBe(false);
    expect(doc.getElementById('loginModal').classList.contains('show')).toBe(true);
  });

  test('el hashchange aplica la ruta de acceso sin salir de la landing', async () => {
    window.location.hash = '#/acceso';
    await esperar(30);

    expect(visible(doc, 'view-landing')).toBe(true);
    expect(hash(window)).toBe('#/acceso');
  });

  test('una ruta desconocida cae al inicio', async () => {
    window.location.hash = '#/ruta-que-no-existe';
    await esperar(30);

    expect(hash(window)).toBe('#/');
    expect(visible(doc, 'view-landing')).toBe(true);
    expect(visible(doc, 'view-dashboard')).toBe(false);
  });
});
