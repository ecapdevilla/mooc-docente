/**
 * Diagnóstico del catálogo (Bloque 1).
 *
 * Verifica que el diagnóstico sea exclusivamente de lectura y que
 * GET /api/v1/courses exponga contadores que distingan "sin cursos" de
 * "todos inactivos" sin acceso directo a la base de datos.
 */

const request = require('supertest');

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'catalog-diagnostics-secret';

const { pool } = require('../src/config/database');
const app = require('../src/server');
const { esSoloLectura, obtenerConsultas } = require('../scripts/diagnostico-catalogo');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Diagnóstico de solo lectura', () => {
  test('solo acepta sentencias de lectura', () => {
    expect(esSoloLectura('SELECT 1;')).toBe(true);
    expect(esSoloLectura('  -- comentario\n SELECT * FROM courses;')).toBe(true);
    expect(esSoloLectura('WITH x AS (SELECT 1) SELECT * FROM x;')).toBe(true);

    expect(esSoloLectura('INSERT INTO courses (titulo) VALUES (\'x\');')).toBe(false);
    expect(esSoloLectura('UPDATE courses SET activo = TRUE;')).toBe(false);
    expect(esSoloLectura('DELETE FROM courses;')).toBe(false);
    expect(esSoloLectura('TRUNCATE courses;')).toBe(false);
    expect(esSoloLectura('ALTER TABLE courses ADD COLUMN x int;')).toBe(false);
    expect(esSoloLectura('DROP TABLE courses;')).toBe(false);
    expect(esSoloLectura('CREATE TABLE x (id int);')).toBe(false);
    expect(esSoloLectura('WITH x AS (SELECT 1) DELETE FROM courses;')).toBe(false);
    expect(esSoloLectura('')).toBe(false);
  });

  test('el archivo de diagnóstico no contiene escrituras ni seeds', () => {
    const consultas = obtenerConsultas();

    expect(consultas.length).toBeGreaterThanOrEqual(10);
    expect(consultas.every((consulta) => esSoloLectura(consulta))).toBe(true);

    const texto = consultas.join('\n');
    expect(texto).toContain('Fundamentos de Pedagogía y Didáctica');
    expect(texto).toContain('Legislación Educativa Colombiana');
    expect(texto).toContain('lesson_quiz_responses');
    expect(texto.toLowerCase()).not.toContain('insert into');
  });
});

describe('GET /api/v1/courses con contadores de catálogo', () => {
  test('distingue un catálogo vacío de uno con cursos inactivos', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('COUNT(*) FILTER (WHERE activo = TRUE)')) {
        return { rows: [{ total: 3, activos: 0 }] };
      }
      return { rows: [] };
    });

    const respuesta = await request(app).get('/api/v1/courses');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.courses).toEqual([]);
    expect(respuesta.body.meta).toEqual({ totalCursos: 3, cursosActivos: 0 });
  });

  test('devuelve cursos y contadores coherentes', async () => {
    const curso = { id: 1, titulo: 'Fundamentos de Pedagogía y Didáctica', area: 'Pedagogía y Didáctica', activo: true };

    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('COUNT(*) FILTER (WHERE activo = TRUE)')) {
        return { rows: [{ total: 1, activos: 1 }] };
      }
      if (sql.includes('FROM courses c')) return { rows: [curso] };
      return { rows: [] };
    });

    const respuesta = await request(app).get('/api/v1/courses');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.courses).toEqual([curso]);
    expect(respuesta.body.meta).toEqual({ totalCursos: 1, cursosActivos: 1 });
  });
});
