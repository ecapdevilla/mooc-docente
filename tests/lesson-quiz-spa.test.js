/**
 * Actividad de lección calificada en el servidor (Bloque 2).
 *
 * Ejecuta el JavaScript real del SPA (indexInicial.html + public/js) en jsdom
 * con una API simulada que publica preguntas SIN respuestas correctas.
 * Comprueba que el navegador solo envía identificadores, que la corrección
 * llega del servidor y que no se envía ningún puntaje desde el cliente.
 */

const { cargarSpa, leerModulos } = require('./spa-dom');

const MODULES = leerModulos();

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const texto = (nodo) => (nodo ? nodo.textContent.replace(/\s+/g, ' ').trim() : '');

const QUIZ_ID = 900;
const LECCION_ID = 1011;

const opcionesApi = [
  { id: 901, opcion: 'La evaluación acompaña y retroalimenta el proceso.', orden: 1 },
  { id: 902, opcion: 'La evaluación solo certifica al final del periodo.', orden: 2 },
  { id: 903, opcion: 'La evaluación se limita a pruebas estandarizadas.', orden: 3 },
  { id: 904, opcion: 'La evaluación no requiere evidencias.', orden: 4 },
];

function crearDetalle() {
  const lecciones = MODULES[0].lessons.map((leccion, indice) => ({
    id: 1011 + indice,
    titulo: leccion.title,
    descripcion: '',
    orden: indice + 1,
    quizzes: indice === 0
      ? [{ id: QUIZ_ID, pregunta: 'Pregunta publicada en la API sobre evaluación formativa.', opciones: opcionesApi }]
      : [],
  }));

  return {
    course: {
      id: 1,
      titulo: MODULES[0].title,
      area: MODULES[0].area,
      nivel: MODULES[0].level,
      descripcion: MODULES[0].description,
      modulos: [
        { id: 101, curso_id: 1, titulo: 'Módulo A', descripcion: '', orden: 1, lecciones: lecciones.slice(0, 2) },
        { id: 102, curso_id: 1, titulo: 'Módulo B', descripcion: '', orden: 2, lecciones: lecciones.slice(2) },
      ],
    },
  };
}

async function crearDom() {
  const peticiones = [];
  const completadas = new Set();

  const dom = await cargarSpa({
    beforeParse(win) {
      win.localStorage.setItem('auth_token', 'token-de-prueba');
      win.localStorage.setItem('user', JSON.stringify({ nombre: 'Docente Prueba' }));

      win.fetch = async (url, opcionesFetch = {}) => {
        const ruta = String(url).replace('http://localhost/api/v1', '');
        let datos = {};
        const estado = 200;

        if (ruta === '/auth/me') {
          datos = { user: { id: 1, nombre: 'Docente Prueba', email: 'prueba@meritodocente.com' } };
        } else if (ruta === '/courses') {
          datos = {
            courses: [{ id: 1, titulo: MODULES[0].title, area: MODULES[0].area, nivel: MODULES[0].level }],
            meta: { totalCursos: 1, cursosActivos: 1 },
          };
        } else if (ruta === '/courses/1') {
          datos = crearDetalle();
        } else if (ruta === '/progress') {
          datos = {
            modules: [{
              id: 101,
              lessons: [
                { id: 1011, completada: completadas.has('1011') },
                { id: 1012, completada: completadas.has('1012') },
              ],
            }],
            badges: [],
          };
        } else if (ruta === `/quizzes/lessons/${LECCION_ID}/responses` && opcionesFetch.method === 'POST') {
          const cuerpo = JSON.parse(opcionesFetch.body || '{}');
          peticiones.push({ ruta, cuerpo });

          const correcta = Number(cuerpo.optionId) === 901;
          if (correcta) completadas.add('1011');

          datos = {
            response: {
              id: 1,
              quizId: QUIZ_ID,
              leccionId: LECCION_ID,
              correct: correcta,
              correctOptionId: 901,
              explanation: correcta
                ? 'Explicación del servidor: la evaluación formativa acompaña el proceso.'
                : 'Explicación del servidor: revisa el enfoque formativo.',
            },
            lesson: {
              id: LECCION_ID,
              completed: correcta,
              masteredQuizzes: correcta ? 1 : 0,
              totalQuizzes: 1,
              attempts: 1,
              puntaje: correcta ? 100 : null,
            },
          };
        } else if (ruta.startsWith('/progress/lesson/')) {
          peticiones.push({ ruta, cuerpo: JSON.parse(opcionesFetch.body || '{}') });
          completadas.add(ruta.split('/').pop());
        } else if (ruta === '/quizzes/post-login') {
          datos = { quiz: { preguntas: [] } };
        }

        return { ok: estado < 400, status: estado, json: async () => JSON.parse(JSON.stringify(datos)) };
      };
    },
  });

  await esperar(800);
  return { dom, window: dom.window, doc: dom.window.document, peticiones };
}

describe('Actividad de lección calificada en el servidor', () => {
  let window;
  let doc;
  let peticiones;

  beforeAll(async () => {
    ({ window, doc, peticiones } = await crearDom());
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('publica la pregunta de la API sin respuestas correctas en el documento', () => {
    window.openLesson('mod1', 0);
    const leccion = doc.getElementById('lessonView');

    expect(texto(leccion.querySelector('.lx-quiz__question'))).toBe(
      'Pregunta publicada en la API sobre evaluación formativa.'
    );
    expect(leccion.querySelectorAll('#quizOptions .quiz-option')).toHaveLength(4);
    expect(leccion.innerHTML).not.toContain('es_correcta');
    expect(leccion.innerHTML).not.toContain('Explicación del servidor');
  });

  test('una respuesta incorrecta se califica en el servidor y no completa la lección', async () => {
    window.answerApiQuiz(QUIZ_ID, 902);
    await esperar(150);

    const peticion = peticiones.find((p) => p.ruta === `/quizzes/lessons/${LECCION_ID}/responses`);
    expect(peticion.cuerpo).toEqual({ quizId: QUIZ_ID, optionId: 902 });
    expect(peticion.cuerpo).not.toHaveProperty('correct');
    expect(peticion.cuerpo).not.toHaveProperty('puntaje');

    const feedback = doc.getElementById('quizFeedback');
    expect(feedback.classList.contains('ko')).toBe(true);
    expect(texto(feedback)).toContain('revisa el enfoque formativo');

    expect(texto(doc.querySelector('#lessonView .lx-lesson-head .lx-status'))).toBe('En curso');
    expect(doc.querySelectorAll('#quizOptions .quiz-option.disabled')).toHaveLength(0);
  });

  test('la respuesta correcta muestra retroalimentación y persiste sin puntaje del cliente', async () => {
    window.answerApiQuiz(QUIZ_ID, 901);
    await esperar(400);

    const feedback = doc.getElementById('quizFeedback');
    expect(feedback.classList.contains('ok')).toBe(true);
    expect(texto(feedback)).toContain('la evaluación formativa acompaña el proceso');
    expect(doc.querySelector('#quizOptions .quiz-option.correct')).not.toBeNull();

    expect(texto(doc.querySelector('#lessonView .lx-lesson-head .lx-status'))).toBe('Completada');

    const progreso = peticiones.find((p) => p.ruta === '/progress/lesson/1011');
    expect(progreso.cuerpo).toEqual({});
    expect(progreso.cuerpo).not.toHaveProperty('puntaje');
  });
});
