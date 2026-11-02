/**
 * Calificación segura de cuestionarios de lección (Bloque 2).
 *
 * Pruebas contra la API real de Express con la base de datos simulada:
 * verifican que el servidor califica, que el cliente no puede aportar
 * resultados y que el historial de respuestas es append-only.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'lesson-quiz-tests-secret';

const { pool } = require('../src/config/database');
const app = require('../src/server');

const TOKEN = jwt.sign({ id: 7 }, process.env.JWT_SECRET, { expiresIn: '5m' });
const BASE = '/api/v1/quizzes/lessons/500/responses';

const QUIZ_ID = 900;
const LESSON_ID = 500;

const opcionesBase = () => [
  {
    quiz_id: QUIZ_ID,
    pregunta: '¿Qué caracteriza la evaluación formativa?',
    explicacion_correcta: 'Acompaña el proceso y retroalimenta a tiempo.',
    explicacion_incorrecta: 'Revisa la diferencia entre evaluar y calificar.',
    leccion_id: LESSON_ID,
    curso_id: 200,
    opcion_id: 9001,
    opcion: 'Acompaña el proceso de aprendizaje.',
    es_correcta: true,
  },
  {
    quiz_id: QUIZ_ID,
    pregunta: '¿Qué caracteriza la evaluación formativa?',
    explicacion_correcta: 'Acompaña el proceso y retroalimenta a tiempo.',
    explicacion_incorrecta: 'Revisa la diferencia entre evaluar y calificar.',
    leccion_id: LESSON_ID,
    curso_id: 200,
    opcion_id: 9002,
    opcion: 'Solo asigna una nota al final.',
    es_correcta: false,
  },
];

let client;

function respuestaDominio({ total = 1, dominadas = 0, respuestas = 1 } = {}) {
  return {
    rows: [{
      total_quizzes: total,
      mastered_quizzes: dominadas,
      total_respuestas: respuestas,
    }],
  };
}

function prepararCliente({
  opciones = opcionesBase(),
  dominio = respuestaDominio(),
  tablaDisponible = true,
} = {}) {
  client.query.mockImplementation(async (sql, params = []) => {
    if (sql.startsWith('SELECT to_regclass')) {
      return { rows: [{ tabla: tablaDisponible ? 'lesson_quiz_responses' : null }] };
    }
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
    if (sql.includes('FROM quizzes q') && sql.includes('WHERE q.id = $1')) {
      return { rows: opciones };
    }
    if (sql.includes('INSERT INTO lesson_quiz_responses')) {
      return { rows: [{ id: 501, respondida_en: '2026-11-01T00:00:00.000Z', params }] };
    }
    if (sql.includes('AS total_quizzes')) return dominio;
    return { rows: [] };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
      return {
        rows: [{ id: params[0], nombre: 'Docente', email: 'docente@example.test', rol: 'estudiante', activo: true }],
      };
    }
    return { rows: [] };
  });
  client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  prepararCliente();
});

const enviar = (cuerpo, conToken = true) => {
  const peticion = request(app).post(BASE).send(cuerpo);
  return conToken ? peticion.set('Authorization', `Bearer ${TOKEN}`) : peticion;
};

describe('Calificación de cuestionarios de lección', () => {
  test('exige autenticación', async () => {
    const respuesta = await enviar({ quizId: QUIZ_ID, optionId: 9001 }, false);

    expect(respuesta.status).toBe(401);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('rechaza identificadores inválidos sin abrir transacción', async () => {
    for (const cuerpo of [{}, { quizId: 'x', optionId: 9001 }, { quizId: QUIZ_ID }, { quizId: -1, optionId: 9001 }]) {
      const respuesta = await enviar(cuerpo);
      expect(respuesta.status).toBe(400);
    }

    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('devuelve 404 cuando la pregunta no pertenece a la lección', async () => {
    prepararCliente({ opciones: [] });

    const respuesta = await enviar({ quizId: QUIZ_ID, optionId: 9001 });

    expect(respuesta.status).toBe(404);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO lesson_quiz_responses'))).toBe(false);
  });

  test('rechaza una opción que pertenece a otra pregunta', async () => {
    const respuesta = await enviar({ quizId: QUIZ_ID, optionId: 123456 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toContain('no pertenece');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO lesson_quiz_responses'))).toBe(false);
  });

  test('rechaza preguntas sin una única respuesta correcta', async () => {
    const opciones = opcionesBase().map((opcion) => ({ ...opcion, es_correcta: true }));
    prepararCliente({ opciones });

    const respuesta = await enviar({ quizId: QUIZ_ID, optionId: 9001 });

    expect(respuesta.status).toBe(409);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO lesson_quiz_responses'))).toBe(false);
  });

  test('no confía en resultados enviados por el cliente: califica con quiz_options', async () => {
    prepararCliente({ opciones: opcionesBase(), dominio: respuestaDominio({ dominadas: 0 }) });

    const respuesta = await enviar({
      quizId: QUIZ_ID,
      optionId: 9002,
      correct: true,
      puntaje: 100,
      score: 100,
      lesson: { completed: true },
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.response.correct).toBe(false);
    expect(respuesta.body.response.correctOptionId).toBe(9001);
    expect(respuesta.body.lesson.completed).toBe(false);
    expect(respuesta.body.lesson.puntaje).toBeNull();

    const insercion = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO lesson_quiz_responses'));
    expect(insercion[1][4]).toBe(false);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO user_progress'))).toBe(false);
  });

  test('registra la respuesta correcta, completa la lección y deriva el puntaje', async () => {
    prepararCliente({ opciones: opcionesBase(), dominio: respuestaDominio({ dominadas: 1, respuestas: 1 }) });

    const respuesta = await enviar({ quizId: QUIZ_ID, optionId: 9001, puntaje: 1 });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.response.correct).toBe(true);
    expect(respuesta.body.response.explanation).toContain('Acompaña el proceso');
    expect(respuesta.body.lesson).toMatchObject({ completed: true, puntaje: 100, totalQuizzes: 1, masteredQuizzes: 1 });

    const progreso = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO user_progress'));
    expect(progreso[1][3]).toBe(100);
    expect(progreso[1][2]).toBe(1);

    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO enrollments'))).toBe(true);
  });

  test('permite reenvíos sin actualizar ni borrar el historial', async () => {
    prepararCliente({ opciones: opcionesBase(), dominio: respuestaDominio({ dominadas: 0 }) });

    await enviar({ quizId: QUIZ_ID, optionId: 9002 });
    await enviar({ quizId: QUIZ_ID, optionId: 9001 });

    const inserciones = client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO lesson_quiz_responses'));
    expect(inserciones).toHaveLength(2);
    expect(client.query.mock.calls.some(([sql]) => /^\s*(UPDATE|DELETE)\s/i.test(sql))).toBe(false);
  });

  test('responde 503 cuando la migración de respuestas no está aplicada', async () => {
    prepararCliente({ tablaDisponible: false });

    const respuesta = await enviar({ quizId: QUIZ_ID, optionId: 9001 });

    expect(respuesta.status).toBe(503);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO lesson_quiz_responses'))).toBe(false);
  });
});
