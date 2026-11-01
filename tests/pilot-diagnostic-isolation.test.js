const request = require('supertest');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const { pool } = require('../src/config/database');
const app = require('../src/server');

const EXAM_CODE = 'MD-DIA-2026-PILOTO-001';

beforeEach(() => {
  process.env.PILOT_DIAGNOSTIC_ENABLED = 'true';
  process.env.PILOT_ACCESS_CODE = 'test-access-code-that-is-at-least-32-characters';
  jest.clearAllMocks();
  pool.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT codigo, titulo, version')) {
      return {
        rows: [{
          codigo: EXAM_CODE,
          titulo: 'Diagnóstico piloto',
          version: '1',
          estado: 'publicado',
          aviso: 'No oficial',
          duracion_min: 85,
        }],
      };
    }
    if (sql.includes('SELECT duracion_min')) {
      return { rows: [{ duracion_min: 85 }] };
    }
    if (sql.includes('SELECT\n         q.id')) {
      return { rows: Array.from({ length: 50 }, (_, index) => ({
        id: `PILOT-${String(index + 1).padStart(3, '0')}`,
        orden: index + 1,
        categoria: `Competencia ${Math.floor(index / 10) + 1}`,
        evidencia: 'Evalúa una decisión docente.',
        enunciado: `Caso pedagógico verificable para la pregunta ${index + 1}.`,
        opciones: ['A', 'B', 'C', 'D'].map((id) => ({
          id,
          texto: `Alternativa ${id} para pregunta ${index + 1}`,
        })),
      })) };
    }
    if (sql.includes('INSERT INTO md_pilot_attempts')) {
      return { rows: [{ expira_en: '2026-11-01T14:00:00Z' }] };
    }
    return { rows: [] };
  });
});

describe('Diagnóstico público aislado del editor y sin exponer claves', () => {
  test('conserva el endpoint de información sin iniciar un intento', async () => {
    const response = await request(app).get('/api/v1/diagnostico-piloto/info');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.examen.codigo).toBe(EXAM_CODE);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO md_pilot_attempts'))).toBe(false);
  });

  test('entrega 50 preguntas sin clave ni respuesta correcta y usa solo la base mockeada', async () => {
    const response = await request(app)
      .post('/api/v1/diagnostico-piloto/start')
      .send({ codigo_acceso: process.env.PILOT_ACCESS_CODE });

    expect(response.status).toBe(201);
    expect(response.body.preguntas).toHaveLength(50);
    expect(response.body.preguntas.every((question) =>
      !Object.hasOwn(question, 'clave') &&
      question.opciones.length === 4 &&
      question.opciones.every((option) => !Object.hasOwn(option, 'es_correcta'))
    )).toBe(true);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO md_pilot_attempts'))).toBe(true);
  });

  test('rechaza código de acceso inválido sin crear intento', async () => {
    const response = await request(app)
      .post('/api/v1/diagnostico-piloto/start')
      .send({ codigo_acceso: 'invalid' });

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
