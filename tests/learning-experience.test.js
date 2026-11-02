/**
 * Experiencia de aprendizaje del SPA: curso → módulo → lección.
 *
 * Prueba de integración sin base de datos: ejecuta el JavaScript real de
 * indexInicial.html + public/js en jsdom y sustituye la API por un doble que
 * devuelve módulos, lecciones y progreso coherentes con MODULES.
 */

const { cargarSpa, leerModulos } = require('./spa-dom');

// MODULES se lee del archivo de datos que carga el SPA para que el doble de la
// API use exactamente los mismos títulos y lecciones publicadas.
const MODULES = leerModulos();

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const texto = (nodo) => (nodo ? nodo.textContent.replace(/\s+/g, ' ').trim() : '');

function crearFixture() {
  const cursos = MODULES.map((m, i) => ({
    id: i + 1,
    titulo: m.title,
    descripcion: m.description,
    area: m.area,
    nivel: m.level,
    orden: i + 1,
  }));
  const completadas = new Set(['1011']);

  const modulo = (cursoId, numero, titulo, descripcion, lecciones, orden) => ({
    id: cursoId * 100 + numero,
    curso_id: cursoId,
    titulo,
    descripcion,
    orden,
    lecciones: lecciones.map((l, j) => ({
      id: cursoId * 1000 + numero * 10 + j + 1,
      titulo: l.title,
      descripcion: j === 0 ? 'Lección con descripción publicada.' : '',
      orden: j + 1,
    })),
  });

  const detalle = (id) => {
    const m = MODULES[id - 1];
    const corte = Math.max(1, m.lessons.length - 1);
    return {
      course: {
        ...cursos[id - 1],
        modulos: [
          modulo(id, 1, `Módulo A · ${m.title}`, 'Primer módulo de la ruta.', m.lessons.slice(0, corte), 1),
          modulo(id, 2, `Módulo B · ${m.title}`, '', m.lessons.slice(corte), 2),
          {
            id: id * 100 + 3,
            curso_id: id,
            titulo: 'Módulo en preparación',
            descripcion: '',
            orden: 3,
            lecciones: [
              { id: id * 1000 + 900, titulo: 'Lección sin contenido publicado', descripcion: '', orden: 1 },
            ],
          },
        ],
      },
    };
  };

  const progreso = () => ({
    modules: MODULES.map((m, i) => ({
      id: i + 1,
      lessons: detalle(i + 1).course.modulos.flatMap((mod) =>
        mod.lecciones.map((l) => ({ id: l.id, completada: completadas.has(String(l.id)) }))
      ),
    })),
    badges: [],
  });

  return { cursos, detalle, progreso, completadas };
}

async function crearDom({ sinApi = false } = {}) {
  const fixture = crearFixture();

  const dom = await cargarSpa({
    beforeParse(win) {
      win.localStorage.setItem('auth_token', 'token-de-prueba');
      win.localStorage.setItem('user', JSON.stringify({ nombre: 'Docente Prueba' }));
      win.fetch = async (url, opcionesFetch = {}) => {
        const ruta = String(url).replace('http://localhost/api/v1', '');
        let datos = {};

        if (ruta === '/auth/me') {
          datos = { user: { id: 1, nombre: 'Docente Prueba', email: 'prueba@meritodocente.com', rol: 'student' } };
        } else if (ruta === '/courses') {
          datos = { courses: sinApi ? [] : fixture.cursos };
        } else if (ruta.startsWith('/courses/')) {
          datos = fixture.detalle(Number(ruta.split('/')[2]));
        } else if (ruta === '/progress') {
          datos = fixture.progreso();
        } else if (ruta.startsWith('/progress/lesson/')) {
          if (opcionesFetch.method === 'POST') fixture.completadas.add(ruta.split('/').pop());
        } else if (ruta === '/quizzes/post-login') {
          datos = { quiz: { preguntas: [] } };
        }

        return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(datos)) };
      };
    },
  });

  await esperar(800);
  return { dom, window: dom.window, doc: dom.window.document, fixture };
}


describe('Experiencia de aprendizaje: curso, módulo y lección', () => {
  let window;
  let doc;
  let fixture;

  beforeAll(async () => {
    ({ window, doc, fixture } = await crearDom());
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('la vista de curso usa datos reales de la API para ruta y progreso', () => {
    window.openCourse('mod1');

    const curso = doc.getElementById('courseView');
    expect(doc.getElementById('view-course').classList.contains('hidden')).toBe(false);
    expect(doc.getElementById('view-dashboard').classList.contains('hidden')).toBe(true);
    expect(texto(curso.querySelector('h1'))).toBe(MODULES[0].title);
    expect(curso.querySelectorAll('.lx-path__item')).toHaveLength(3);
    expect([...curso.querySelectorAll('.lx-fact__value')].map(texto)).toEqual([
      '3',
      '4',
      'Básico',
      'En curso',
    ]);
    expect(curso.querySelector('.lx-hero__progress .lx-meter').getAttribute('aria-valuenow')).toBe('33');
    expect(texto(curso.querySelector('.lx-hero__progress-label'))).toContain('1 de 3 lecciones disponibles');
  });

  test('la ruta distingue módulos en curso, sin iniciar y en preparación', () => {
    window.openCourse('mod1');
    const curso = doc.getElementById('courseView');
    const items = [...curso.querySelectorAll('.lx-path__item')];

    expect(items.map((item) => texto(item.querySelector('.lx-status')))).toEqual([
      'En curso',
      'Sin iniciar',
      'En preparación',
    ]);
    expect(items[0].classList.contains('is-current')).toBe(true);
    expect(texto(items[0].querySelector('.lx-path__actions'))).toContain('Continuar módulo');
    expect(items[2].querySelector('.lx-path__actions button')).toBeNull();
    expect(texto(items[2].querySelector('.lx-path__actions'))).toContain('Contenido en preparación');
    expect(texto(curso.querySelector('#courseLearnTitle').closest('.lx-panel'))).toContain('Resultados de aprendizaje en curación');
  });

  test('la vista de módulo enumera solo las lecciones con contenido y marca la siguiente', () => {
    window.openModule('mod1', 101);
    const modulo = doc.getElementById('moduleView');

    expect(doc.getElementById('view-module').classList.contains('hidden')).toBe(false);
    expect(texto(modulo.querySelector('h1'))).toBe('Módulo A · Fundamentos de Pedagogía y Didáctica');
    expect(texto(modulo.querySelector('.lx-module-head__position'))).toContain('Módulo 1 de 3');
    expect(modulo.querySelectorAll('.lx-lesson-list > li')).toHaveLength(2);
    expect([...modulo.querySelectorAll('.lx-lesson-row .lx-status')].map(texto)).toEqual(['Completada', 'Siguiente']);
    expect(texto(modulo.querySelector('.lx-continue'))).toContain('Corrientes pedagógicas contemporáneas');
    expect(texto(modulo.querySelector('.lx-crumb[aria-current="page"]'))).toBe('Módulo 1');
  });

  test('un módulo sin contenido se muestra en preparación y sin acciones', () => {
    window.openModule('mod1', 103);
    const modulo = doc.getElementById('moduleView');

    expect(texto(modulo.querySelector('.lx-module-head__position'))).toContain('En preparación');
    expect(modulo.querySelectorAll('.lx-lesson-row.is-pending')).toHaveLength(1);
    expect(modulo.querySelectorAll('.lx-lesson-row__action button')).toHaveLength(0);
    expect(modulo.querySelector('.lx-continue')).toBeNull();
    expect(texto(modulo)).toContain('Este módulo aún no tiene lecciones disponibles');
  });

  test('la lección conserva lectura, actividad, índice y navegación con datos reales', () => {
    window.openLesson('mod1', 1);
    const leccion = doc.getElementById('lessonView');

    expect(doc.getElementById('view-lesson').classList.contains('hidden')).toBe(false);
    expect(texto(leccion.querySelector('h1'))).toBe(MODULES[0].lessons[1].title);
    expect(leccion.querySelector('.lx-reading').innerHTML.length).toBeGreaterThan(200);
    expect(leccion.querySelectorAll('.quiz-option')).toHaveLength(4);
    expect(leccion.querySelector('#quizOptions')).not.toBeNull();
    expect(leccion.querySelector('#quizFeedback')).not.toBeNull();
    expect(leccion.querySelector('#lessonNavInfo')).not.toBeNull();
    expect(leccion.querySelectorAll('.lx-outline__link')).toHaveLength(2);
    expect(leccion.querySelector('.lx-outline__link.is-active')).not.toBeNull();
    expect(leccion.querySelector('.lx-outline__link.is-done')).not.toBeNull();
    expect([...leccion.querySelectorAll('.lx-lesson-footer__nav button')].map(texto)).toEqual([
      'Anterior',
      'Finalizar curso',
    ]);
    expect(texto(leccion.querySelector('.lx-crumb[aria-current="page"]'))).toBe('Lección 2');
  });

  test('marcar completada desde el pie persiste y actualiza curso y módulo', async () => {
    window.openLesson('mod1', 1);
    expect(texto(doc.querySelector('#lessonView .lx-lesson-footer button.btn-primary'))).toContain('Marcar completada');

    window.completeLessonFromFooter();

    expect(texto(doc.querySelector('#lessonView .lx-lesson-head .lx-status'))).toBe('Completada');
    expect(texto(doc.getElementById('lessonNavInfo'))).toContain('Lección completada');
    expect(texto(doc.getElementById('quizFeedback'))).toContain('ya completada anteriormente');

    await esperar(200);
    expect(fixture.completadas.has('1012')).toBe(true);

    window.openCourse('mod1');
    const curso = doc.getElementById('courseView');
    expect(curso.querySelector('.lx-hero__progress .lx-meter').getAttribute('aria-valuenow')).toBe('67');
    expect(texto(curso.querySelectorAll('.lx-path__item .lx-status')[0])).toBe('Completado');

    window.openModule('mod1', 101);
    expect(texto(doc.querySelector('#moduleView .lx-module-head__position'))).toContain('Completado');
  });

  test('la actividad de la lección sigue calificando y completa el curso', async () => {
    window.openLesson('mod1', 2);
    const correcta = MODULES[0].lessons[2].quiz.correct;
    doc.querySelectorAll('#quizOptions .quiz-option')[correcta].click();

    expect(doc.getElementById('quizFeedback').classList.contains('ok')).toBe(true);
    expect(texto(doc.querySelector('#lessonView .lx-lesson-head .lx-status'))).toBe('Completada');
    expect(doc.querySelector('#lessonView .lx-lesson-footer button.btn-primary')).toBeNull();
    expect(doc.querySelector('#lessonView .lx-outline__link.is-active').classList.contains('is-done')).toBe(true);
    expect([...doc.querySelectorAll('#lessonView .lx-lesson-head .lx-chip')].map(texto)).toContain('100% del curso');
    expect(texto(doc.querySelector('#lessonView .lx-outline__progress .lx-muted'))).toBe('3 de 3 lecciones del curso');

    await esperar(900);
    window.openCourse('mod1');
    expect(doc.querySelector('#courseView .lx-hero__progress .lx-meter').getAttribute('aria-valuenow')).toBe('100');
    expect(texto(doc.querySelectorAll('#courseView .lx-path__item .lx-status')[1])).toBe('Completado');
  });
});

describe('Curso sin correspondencia con la API', () => {
  let window;
  let doc;

  beforeAll(async () => {
    ({ window, doc } = await crearDom({ sinApi: true }));
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('declara la ruta local sin inventar módulos ni sincronización', () => {
    window.openCourse('mod1');
    const curso = doc.getElementById('courseView');

    expect(curso.querySelectorAll('.lx-path__item')).toHaveLength(1);
    expect(texto(curso.querySelector('.lx-path__title'))).toBe('Ruta del curso');
    expect(texto(curso.querySelector('.lx-note'))).toContain('no está vinculado a la base de datos');
    expect(texto(curso.querySelector('.lx-hero .lx-chip:last-child'))).toBe('Avance en este dispositivo');
    expect(texto(curso.querySelector('.lx-hero__actions .btn-primary'))).toContain('Empezar curso');
  });
});
