/**
 * Evaluación final por curso (T2.4) en el SPA.
 *
 * Ejecuta el JavaScript real (indexInicial.html + public/js) en jsdom con una
 * API simulada y comprueba tres cosas:
 *   1. el botón del curso abre la vista y la URL acompaña a la vista;
 *   2. las preguntas se publican sin clave, sin explicaciones y sin `es_correcta`;
 *   3. el navegador solo envía `{ questionId, optionId }` y muestra el veredicto
 *      que devuelve el servidor.
 */

const { cargarSpa, leerModulos } = require('./spa-dom');

const MODULES = leerModulos();

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const texto = (nodo) => (nodo ? nodo.textContent.replace(/\s+/g, ' ').trim() : '');

const CURSO_SPA = MODULES[0].id;
const CURSO_API = 1;

const PREGUNTAS = [
  {
    id: 9101,
    pregunta: 'Pregunta uno: ¿cómo se entiende la evaluación formativa?',
    leccion: 'Lección A',
    area: 'Evaluación Educativa',
    opciones: [
      { id: 91011, opcion: 'Acompaña el proceso y retroalimenta.', orden: 1 },
      { id: 91012, opcion: 'Solo certifica al final del periodo.', orden: 2 },
      { id: 91013, opcion: 'Se limita a pruebas estandarizadas.', orden: 3 },
      { id: 91014, opcion: 'No requiere evidencias.', orden: 4 },
    ],
  },
  {
    id: 9102,
    pregunta: 'Pregunta dos: ¿qué exige un ajuste pedagógico razonable?',
    leccion: 'Lección B',
    area: 'Evaluación Educativa',
    opciones: [
      { id: 91021, opcion: 'Eliminar toda exigencia académica.', orden: 1 },
      { id: 91022, opcion: 'Ajustar apoyos sin renunciar al propósito.', orden: 2 },
      { id: 91023, opcion: 'Cambiar el área de estudio.', orden: 3 },
      { id: 91024, opcion: 'Postergar la matrícula un año.', orden: 4 },
    ],
  },
];

/** Clave correcta simulada en el servidor: nunca viaja al navegador. */
const CLAVES = { 9101: 91011, 9102: 91022 };

function crearPlanDeEstudio() {
  const lecciones = MODULES[0].lessons.map((leccion, indice) => ({
    id: 1011 + indice,
    titulo: leccion.title,
    descripcion: '',
    orden: indice + 1,
    quizzes: [],
  }));

  return {
    course: {
      id: CURSO_API,
      titulo: MODULES[0].title,
      area: MODULES[0].area,
      nivel: MODULES[0].level,
      descripcion: MODULES[0].description,
      modulos: [
        { id: 101, curso_id: CURSO_API, titulo: 'Módulo A', descripcion: '', orden: 1, lecciones: lecciones.slice(0, 2) },
        { id: 102, curso_id: CURSO_API, titulo: 'Módulo B', descripcion: '', orden: 2, lecciones: lecciones.slice(2) },
      ],
    },
  };
}

async function crearDom() {
  const peticiones = [];

  const dom = await cargarSpa({
    beforeParse(win) {
      win.localStorage.setItem('auth_token', 'token-de-prueba');
      win.localStorage.setItem('user', JSON.stringify({ nombre: 'Docente Prueba' }));

      win.fetch = async (url, opcionesFetch = {}) => {
        const ruta = String(url).replace('http://localhost/api/v1', '');
        let datos = {};
        let estado = 200;

        if (ruta === '/auth/me') {
          datos = { user: { id: 1, nombre: 'Docente Prueba', email: 'prueba@meritodocente.com' } };
        } else if (ruta === '/courses') {
          datos = {
            courses: [{ id: CURSO_API, titulo: MODULES[0].title, area: MODULES[0].area, nivel: MODULES[0].level }],
            meta: { totalCursos: 1, cursosActivos: 1 },
          };
        } else if (ruta === `/courses/${CURSO_API}`) {
          datos = crearPlanDeEstudio();
        } else if (ruta === '/progress') {
          datos = {
            modules: [{
              id: 101,
              lessons: [
                { id: 1011, completada: true },
                { id: 1012, completada: true },
              ],
            }],
            badges: [],
          };
        } else if (ruta === `/courses/${CURSO_API}/assessment`) {
          peticiones.push({ ruta, metodo: 'GET' });
          datos = {
            assessment: {
              cursoId: CURSO_API,
              titulo: MODULES[0].title,
              area: MODULES[0].area,
              umbralAprobacion: 80,
              totalPreguntas: PREGUNTAS.length,
              preguntas: PREGUNTAS,
              requisitos: { leccionesTotales: 2, leccionesCompletadas: 2, exigeLecciones: false, habilitada: true },
              historial: [],
            },
          };
        } else if (ruta === `/courses/${CURSO_API}/assessment/attempts` && opcionesFetch.method === 'POST') {
          const cuerpo = JSON.parse(opcionesFetch.body || '{}');
          peticiones.push({ ruta, metodo: 'POST', cuerpo });

          const results = (cuerpo.answers || []).map((respuesta) => {
            const pregunta = PREGUNTAS.find((item) => item.id === respuesta.questionId) || { opciones: [] };
            const correcto = CLAVES[respuesta.questionId] === respuesta.optionId;
            return {
              questionId: respuesta.questionId,
              correct: correcto,
              correctOptionId: CLAVES[respuesta.questionId],
              explanation: correcto
                ? 'Explicación del servidor: la evaluación acompaña el proceso.'
                : 'Explicación del servidor: revisa la lección antes de repetir.',
              topic: pregunta.leccion,
              area: pregunta.area,
            };
          });

          const aciertos = results.filter((item) => item.correct).length;
          const puntaje = Math.round((aciertos / results.length) * 10000) / 100;
          estado = 201;
          datos = {
            attempt: {
              id: 1,
              estado: 'finalizado',
              puntaje,
              aciertos,
              totalPreguntas: results.length,
              aprobado: puntaje >= 80,
              umbralAprobacion: 80,
            },
            results,
            porLeccion: [
              { leccion: 'Lección A', aciertos: results[0] && results[0].correct ? 1 : 0, total: 1, porcentaje: results[0] && results[0].correct ? 100 : 0 },
              { leccion: 'Lección B', aciertos: results[1] && results[1].correct ? 1 : 0, total: 1, porcentaje: results[1] && results[1].correct ? 100 : 0 },
            ],
            areasPrioritarias: puntaje >= 80
              ? []
              : [{ area: 'Evaluación Educativa', aciertos, total: results.length, porcentaje: puntaje }],
          };
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

describe('Evaluación final por curso (T2.4)', () => {
  let window;
  let doc;
  let peticiones;

  beforeAll(async () => {
    ({ window, doc, peticiones } = await crearDom());
  });

  afterAll(() => {
    if (window) window.close();
  });

  test('el botón del curso abre la vista y la URL acompaña', async () => {
    window.openCourse(CURSO_SPA);

    const boton = doc.querySelector('#courseView [data-action="open-course-assessment"]');
    expect(boton).not.toBeNull();
    expect(boton.dataset.courseId).toBe(CURSO_SPA);

    boton.click();
    await esperar(200);

    expect(doc.getElementById('view-assessment').classList.contains('hidden')).toBe(false);
    expect(window.location.hash).toBe(`#/evaluacion/${CURSO_SPA}`);
    expect(peticiones.some((peticion) => peticion.ruta === `/courses/${CURSO_API}/assessment`)).toBe(true);
  });

  test('publica las preguntas sin clave ni explicaciones', () => {
    const panel = doc.getElementById('assessmentPanel');
    expect(panel).not.toBeNull();
    expect(texto(panel.querySelector('.assessment-title'))).toBe(MODULES[0].title);
    expect(texto(panel.querySelector('.assessment-meta'))).toContain('aprueba con 80% de aciertos');
    expect(panel.querySelectorAll('.quiz-option')).toHaveLength(4);
    expect(texto(panel)).toContain('Acompaña el proceso y retroalimenta.');
    expect(panel.innerHTML).not.toContain('es_correcta');
    expect(panel.innerHTML).not.toContain('Explicación del servidor');
  });

  test('solo envía identificadores y muestra el veredicto del servidor', async () => {
    const opciones = () => doc.querySelectorAll('#assessmentPanel .quiz-option');

    opciones()[0].click();
    expect(doc.getElementById('assessmentNext').disabled).toBe(false);
    doc.getElementById('assessmentNext').click();

    expect(texto(doc.getElementById('assessmentPanel'))).toContain('Pregunta 2 de 2');

    opciones()[0].click();
    doc.getElementById('assessmentSubmit').click();
    await esperar(300);

    const peticion = peticiones.find((item) => item.metodo === 'POST');
    expect(peticion.cuerpo).toEqual({
      answers: [
        { questionId: 9101, optionId: 91011 },
        { questionId: 9102, optionId: 91021 },
      ],
    });
    expect(Object.keys(peticion.cuerpo)).toEqual(['answers']);
    expect(JSON.stringify(peticion.cuerpo)).not.toContain('puntaje');
    expect(JSON.stringify(peticion.cuerpo)).not.toContain('aprobado');

    const resultado = doc.getElementById('assessmentResult');
    expect(resultado).not.toBeNull();
    expect(texto(resultado.querySelector('.assessment-verdict'))).toBe('Sin aprobar');
    expect(texto(resultado.querySelector('.assessment-title'))).toBe('Aún no apruebas la evaluación');
    expect(texto(resultado)).toContain('1 de 2 respuestas correctas · 50%');
    expect(texto(resultado)).toContain('Áreas prioritarias para reforzar');
    expect(texto(resultado)).toContain('Desempeño por tema del curso');

    const detalles = resultado.querySelectorAll('.diagnostic-detail');
    expect(detalles).toHaveLength(2);
    expect(texto(detalles[0])).toContain('Correcta');
    expect(texto(detalles[1])).toContain('revisa la lección antes de repetir');
    expect(doc.getElementById('view-assessment').classList.contains('hidden')).toBe(false);
  });
});
