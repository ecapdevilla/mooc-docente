/**
 * Evaluación final por curso (T2.4).
 *
 * Pruebas de contrato contra la app real de Express con la base simulada:
 * el examen nunca publica la clave, el servidor califica con
 * `quiz_options.es_correcta`, el umbral se aplica en backend y el intento se
 * persiste con su alcance y veredicto.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'course-assessment-tests-secret';

const { pool } = require('../src/config/database');
const app = require('../src/server');

const TOKEN = jwt.sign({ id: 11 }, process.env.JWT_SECRET, { expiresIn: '5m' });
const CURSO_ID = 1;
const GET_URL = `/api/v1/courses/${CURSO_ID}/assessment`;
const POST_URL = `/api/v1/courses/${CURSO_ID}/assessment/attempts`;

const crearFilas = () => [
  {
    quiz_id: 100,
    pregunta: '¿Qué caracteriza la evaluación formativa?',
    explicacion_correcta: 'Acompaña el proceso y retroalimenta a tiempo.',
    explicacion_incorrecta: 'Revisa la diferencia entre evaluar y calificar.',
    leccion_id: 10,
    leccion: 'Evaluación formativa',
    area: 'Pedagogía',
    curso_id: CURSO_ID,
    opcion_id: 1001,
    opcion: 'Acompaña y retroalimenta el proceso.',
    orden: 1,
    es_correcta: true,
  },
  {
    quiz_id: 100,
    pregunta: '¿Qué caracteriza la evaluación formativa?',
    explicacion_correcta: 'Acompaña el proceso y retroalimenta a tiempo.',
    explicacion_incorrecta: 'Revisa la diferencia entre evaluar y calificar.',
    leccion_id: 10,
    leccion: 'Evaluación formativa',
    area: 'Pedagogía',
    curso_id: CURSO_ID,
    opcion_id: 1002,
    opcion: 'Solo certifica al final del periodo.',
    orden: 2,
    es_correcta: false,
  },
  {
    quiz_id: 200,
    pregunta: '¿Qué norma regula la evaluación de los aprendizajes?',
    explicacion_correcta: 'El Decreto 1290 de 2009 regula la evaluación y la promoción.',
    explicacion_incorrecta: 'Repasa la normativa de evaluación y promoción escolar.',
    leccion_id: 20,
    leccion: 'Normatividad de la evaluación',
    area: 'Legislación',
    curso_id: CURSO_ID,
    opcion_id: 2001,
    opcion: 'El Decreto 1290 de 2009.',
    orden: 1,
    es_correcta: true,
  },
  {
    quiz_id: 200,
    pregunta: '¿Qué norma regula la evaluación de los aprendizajes?',
    explicacion_correcta: 'El Decreto 1290 de 2009 regula la evaluación y la promoción.',
    explicacion_incorrecta: 'Repasa la normativa de evaluación y promoción escolar.',
    leccion_id: 20,
    leccion: 'Normatividad de la evaluación',
    area: 'Legislación',
    curso_id: CURSO_ID,
    opcion_id: 2002,
    opcion: 'La Ley 715 de 2001.',
    orden: 2,
    es_correcta: false,
  },
];

const RESPUESTAS_CORRECTAS = [
  { questionId: 100, optionId: 1001 },
  { questionId: 200, optionId: 2001 },
];

const RESPUESTAS_INCORRECTAS = [
  { questionId: 100, optionId: 1002 },
  { questionId: 200, optionId: 2002 },
];

let client;

function prepararCliente({
  filas = crearFilas(),
  curso = true,
  migracion = true,
  leccionesTotales = 2,
  leccionesCompletadas = 2,
} = {}) {
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('FROM users')) {
      return {
        rows: [{ id: params[0], nombre: 'Docente', email: 'docente@example.test', rol: 'estudiante', activo: true }],
      };
    }
    if (sql.includes('information_schema.columns')) {
      return { rows: migracion ? [{ column_name: 'curso_id' }] : [] };
    }
    if (sql.includes('FROM courses')) {
      return { rows: curso ? [{ id: CURSO_ID, titulo: 'Curso de prueba', area: 'Pedagogía' }] : [] };
    }
    if (sql.includes('FROM quizzes q')) {
      return { rows: filas };
    }
    if (sql.includes('lecciones_totales')) {
      return { rows: [{ lecciones_totales: leccionesTotales, lecciones_completadas: leccionesCompletadas }] };
    }
    if (sql.includes('FROM quiz_attempts')) {
      return { rows: [] };
    }
    return { rows: [] };
  });

  client.query.mockImplementation(async (sql, params = []) => {
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
    if (sql.includes('information_schema.columns')) {
      return { rows: migracion ? [{ column_name: 'curso_id' }] : [] };
    }
    if (sql.includes('FROM courses')) {
      return { rows: curso ? [{ id: CURSO_ID, titulo: 'Curso de prueba', area: 'Pedagogía' }] : [] };
    }
    if (sql.includes('FROM quizzes q')) {
      return { rows: filas };
    }
    if (sql.includes('lecciones_totales')) {
      return { rows: [{ lecciones_totales: leccionesTotales, lecciones_completadas: leccionesCompletadas }] };
    }
    if (sql.includes('INSERT INTO quiz_attempts')) {
      return {
        rows: [{
          id: 77,
          estado: 'finalizado',
          iniciado_en: '2026-11-02T10:00:00.000Z',
          finalizado_en: '2026-11-02T10:05:00.000Z',
          puntaje: params[3],
          aciertos: params[4],
          total_preguntas: params[5],
          aprobado: params[6],
        }],
      };
    }
    if (sql.includes('INSERT INTO badges')) {
      return { rows: [{ id: 999 }] };
    }
    if (sql.includes('INSERT INTO user_badges')) {
      return { rows: [{ id: 888 }] };
    }
    return { rows: [] };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.COURSE_ASSESSMENT_PASSING_SCORE;
  delete process.env.COURSE_ASSESSMENT_REQUIRES_LESSONS;
  client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  prepararCliente();
});

afterEach(() => {
  delete process.env.COURSE_ASSESSMENT_PASSING_SCORE;
  delete process.env.COURSE_ASSESSMENT_REQUIRES_LESSONS;
});

const conToken = (peticion) => peticion.set('Authorization', `Bearer ${TOKEN}`);
const enviar = (cuerpo) => conToken(request(app).post(POST_URL).send(cuerpo));

describe('Evaluación final por curso · consulta', () => {
  test('requiere autenticación', async () => {
    const respuesta = await request(app).get(GET_URL);

    expect(respuesta.status).toBe(401);
  });

  test('publica las preguntas del curso sin claves ni explicaciones', async () => {
    const respuesta = await conToken(request(app).get(GET_URL));

    expect(respuesta.status).toBe(200);
    const { assessment } = respuesta.body;
    expect(assessment).toMatchObject({
      cursoId: CURSO_ID,
      titulo: 'Curso de prueba',
      umbralAprobacion: 80,
      totalPreguntas: 2,
    });
    expect(assessment.preguntas).toHaveLength(2);
    expect(assessment.preguntas[0].opciones).toHaveLength(2);
    expect(assessment.requisitos).toMatchObject({
      leccionesTotales: 2,
      leccionesCompletadas: 2,
      exigeLecciones: false,
      habilitada: true,
    });
    expect(JSON.stringify(assessment)).not.toContain('es_correcta');
    expect(JSON.stringify(assessment)).not.toContain('esCorrecta');
    expect(JSON.stringify(assessment)).not.toContain('explicacion_correcta');
  });

  test('respeta el umbral configurado por entorno', async () => {
    process.env.COURSE_ASSESSMENT_PASSING_SCORE = '70';

    const respuesta = await conToken(request(app).get(GET_URL));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.assessment.umbralAprobacion).toBe(70);
  });

  test('responde 404 cuando el curso no existe o no está activo', async () => {
    prepararCliente({ curso: false });

    const respuesta = await conToken(request(app).get(GET_URL));

    expect(respuesta.status).toBe(404);
  });

  test('responde 503 cuando la migración de evaluación no está aplicada', async () => {
    prepararCliente({ migracion: false });

    const respuesta = await conToken(request(app).get(GET_URL));

    expect(respuesta.status).toBe(503);
    expect(respuesta.body.error).toContain('no está habilitada');
  });

  test('responde 409 cuando el curso no tiene preguntas configuradas', async () => {
    prepararCliente({ filas: [] });

    const respuesta = await conToken(request(app).get(GET_URL));

    expect(respuesta.status).toBe(409);
  });

  test('rechaza identificadores de curso inválidos', async () => {
    const respuesta = await conToken(request(app).get('/api/v1/courses/abc/assessment'));

    expect(respuesta.status).toBe(400);
  });
});

describe('Evaluación final por curso · envío y calificación', () => {
  test('requiere autenticación', async () => {
    const respuesta = await request(app).post(POST_URL).send({ answers: RESPUESTAS_CORRECTAS });

    expect(respuesta.status).toBe(401);
  });

  test('rechaza un envío sin respuestas', async () => {
    const respuesta = await enviar({});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toContain('respuestas');
  });

  test('exige responder cada pregunta del examen', async () => {
    const respuesta = await enviar({ answers: [RESPUESTAS_CORRECTAS[0]] });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toContain('una sola vez');
  });

  test('rechaza preguntas duplicadas en el envío', async () => {
    const respuesta = await enviar({
      answers: [RESPUESTAS_CORRECTAS[0], RESPUESTAS_CORRECTAS[0]],
    });

    expect(respuesta.status).toBe(400);
  });

  test('rechaza opciones que no pertenecen a la pregunta', async () => {
    const respuesta = await enviar({
      answers: [{ questionId: 100, optionId: 2001 }, { questionId: 200, optionId: 2001 }],
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toContain('no pertenece');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO quiz_attempts'))).toBe(false);
  });

  test('responde 409 cuando una pregunta no tiene una única respuesta correcta', async () => {
    const filas = crearFilas().map((fila) =>
      fila.quiz_id === 100 ? { ...fila, es_correcta: true } : fila
    );
    prepararCliente({ filas });

    const respuesta = await enviar({ answers: RESPUESTAS_CORRECTAS });

    expect(respuesta.status).toBe(409);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO quiz_attempts'))).toBe(false);
  });
});

describe('Evaluación final por curso · calificación y persistencia', () => {
  test('no confía en el puntaje ni en el veredicto enviados por el cliente', async () => {
    const respuesta = await enviar({
      answers: RESPUESTAS_INCORRECTAS,
      puntaje: 100,
      aprobado: true,
      attempt: { aprobado: true },
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.attempt).toMatchObject({
      puntaje: 0,
      aciertos: 0,
      totalPreguntas: 2,
      aprobado: false,
      umbralAprobacion: 80,
    });

    const insercion = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO quiz_attempts'));
    expect(insercion[1]).toEqual([11, CURSO_ID, 'evaluacion_curso', 0, 0, 2, false]);
  });

  test('aprueba con el umbral vigente y devuelve el desempeño por tema', async () => {
    const respuesta = await enviar({ answers: RESPUESTAS_CORRECTAS });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.attempt).toMatchObject({ puntaje: 100, aciertos: 2, aprobado: true });
    expect(respuesta.body.porLeccion).toEqual([
      { leccion: 'Evaluación formativa', aciertos: 1, total: 1, porcentaje: 100 },
      { leccion: 'Normatividad de la evaluación', aciertos: 1, total: 1, porcentaje: 100 },
    ]);
    expect(respuesta.body.areasPrioritarias).toEqual([]);
    expect(respuesta.body.results[0]).toMatchObject({
      questionId: 100,
      correct: true,
      correctOptionId: 1001,
      topic: 'Evaluación formativa',
      area: 'Pedagogía',
    });
    expect(respuesta.body.results[0].explanation).toContain('Acompaña el proceso');
  });

  test('calcula el porcentaje y señala áreas prioritarias', async () => {
    const respuesta = await enviar({
      answers: [{ questionId: 100, optionId: 1001 }, { questionId: 200, optionId: 2002 }],
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.attempt).toMatchObject({ puntaje: 50, aciertos: 1, aprobado: false });
    expect(respuesta.body.porLeccion[0]).toMatchObject({
      leccion: 'Normatividad de la evaluación',
      porcentaje: 0,
    });
    expect(respuesta.body.areasPrioritarias).toEqual([
      { area: 'Legislación', aciertos: 0, total: 1, porcentaje: 0 },
    ]);
    expect(respuesta.body.results[1].correctOptionId).toBe(2001);
    expect(respuesta.body.results[1].explanation).toContain('Repasa la normativa');
  });

  test('guarda el intento con su alcance y un snapshot por respuesta', async () => {
    await enviar({ answers: RESPUESTAS_CORRECTAS });

    const insercion = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO quiz_attempts'));
    expect(insercion[1][2]).toBe('evaluacion_curso');
    expect(insercion[0]).toContain('aprobado');

    const respuestas = client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO quiz_attempt_answers'));
    expect(respuestas).toHaveLength(2);
    expect(respuestas[0][1]).toEqual([
      77,
      100,
      1001,
      true,
      '¿Qué caracteriza la evaluación formativa?',
      'Acompaña y retroalimenta el proceso.',
    ]);
  });

  test('rechaza el envío cuando el curso exige lecciones completadas', async () => {
    process.env.COURSE_ASSESSMENT_REQUIRES_LESSONS = 'true';
    prepararCliente({ leccionesTotales: 4, leccionesCompletadas: 2 });

    const respuesta = await enviar({ answers: RESPUESTAS_CORRECTAS });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.requisitos).toMatchObject({
      leccionesTotales: 4,
      leccionesCompletadas: 2,
      exigeLecciones: true,
      habilitada: false,
    });
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO quiz_attempts'))).toBe(false);
  });

  test('responde 503 cuando la migración de evaluación no está aplicada', async () => {
    prepararCliente({ migracion: false });

    const respuesta = await enviar({ answers: RESPUESTAS_CORRECTAS });

    expect(respuesta.status).toBe(503);
  });

  test('responde 404 cuando el curso no existe', async () => {
    prepararCliente({ curso: false });

    const respuesta = await enviar({ answers: RESPUESTAS_CORRECTAS });

    expect(respuesta.status).toBe(404);
  });
});
