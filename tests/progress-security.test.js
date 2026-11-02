/**
 * Seguridad del progreso de lecciones (Bloque 2).
 *
 * El cliente ya no puede fijar el puntaje: se deriva de las respuestas
 * verificadas del cuestionario. En modo estricto, una lección con
 * cuestionario no se completa sin dominarlo.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'progress-security-tests-secret';

const { pool } = require('../src/config/database');
const app = require('../src/server');

const TOKEN = jwt.sign({ id: 31 }, process.env.JWT_SECRET, { expiresIn: '5m' });
const LESSON_ID = 500;
const BASE = `/api/v1/progress/lesson/${LESSON_ID}`;

function configurarBase({ dominada = false, totalQuizzes = 1, tablaDisponible = true } = {}) {
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
      return { rows: [{ id: params[0], nombre: 'Docente', email: 'docente@example.test', rol: 'estudiante', activo: true }] };
    }
    if (sql.startsWith('SELECT to_regclass')) {
      return { rows: [{ tabla: tablaDisponible ? 'lesson_quiz_responses' : null }] };
    }
    if (sql.includes('AS total_quizzes')) {
      return { rows: [{ total_quizzes: totalQuizzes, mastered_quizzes: dominada ? totalQuizzes : 0, total_respuestas: dominada ? totalQuizzes : 0 }] };
    }
    if (sql.includes('FROM lessons l') && sql.includes('WHERE l.id = $1')) {
      return { rows: [{ id: LESSON_ID, modulo_id: 300, curso_id: 200 }] };
    }
    if (sql.includes('INSERT INTO user_progress')) {
      return { rows: [{ id: 1, usuario_id: params[0], leccion_id: params[1], completada: true, intentos: 1, puntaje: params[2] }] };
    }
    if (sql.includes('AS total')) return { rows: [{ total: 1 }] };
    if (sql.includes('AS completed')) return { rows: [{ completed: 1 }] };
    if (sql.includes('total_lessons')) return { rows: [{ total_lessons: 1, completed_lessons: 1 }] };
    if (sql.includes('FROM modules') && sql.includes('badge_nombre')) {
      return { rows: [{ id: 300, badge_nombre: null, badge_icono: null, badge_color: null }] };
    }
    return { rows: [] };
  });
}

const enviar = (cuerpo = { puntaje: 100 }) =>
  request(app).post(BASE).set('Authorization', `Bearer ${TOKEN}`).send(cuerpo);

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.LESSON_COMPLETION_REQUIRES_QUIZ;
  configurarBase();
});

afterAll(() => {
  delete process.env.LESSON_COMPLETION_REQUIRES_QUIZ;
});

describe('Puntaje de progreso derivado del servidor', () => {
  test('ignora el puntaje enviado por el cliente cuando no hay cuestionario dominado', async () => {
    configurarBase({ dominada: false });

    const respuesta = await enviar({ puntaje: 100 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.progress.lesson.completada).toBe(true);

    const insercion = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO user_progress'));
    expect(insercion[1][2]).toBeNull();
  });

  test('asigna 100 solo cuando el cuestionario está dominado en el servidor', async () => {
    configurarBase({ dominada: true });

    const respuesta = await enviar({ puntaje: 100 });

    expect(respuesta.status).toBe(200);

    const insercion = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO user_progress'));
    expect(insercion[1][2]).toBe(100);
  });

  test('en modo estricto bloquea la finalización sin cuestionario dominado', async () => {
    process.env.LESSON_COMPLETION_REQUIRES_QUIZ = 'true';
    configurarBase({ dominada: false });

    const respuesta = await enviar({ puntaje: 100 });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error).toContain('actividad de la lección');
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO user_progress'))).toBe(false);
  });

  test('sin la migración aplicada conserva el progreso sin puntaje', async () => {
    configurarBase({ tablaDisponible: false });

    const respuesta = await enviar({ puntaje: 100 });

    expect(respuesta.status).toBe(200);

    const insercion = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO user_progress'));
    expect(insercion[1][2]).toBeNull();
  });
});
