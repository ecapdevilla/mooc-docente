const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const { pool } = require('../src/config/database');
const app = require('../src/server');

const TEST_SECRET = 'admin-routes-tests-secret';

const accessToken = (id) => jwt.sign({ id }, TEST_SECRET, { expiresIn: '5m' });

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  jest.clearAllMocks();
  pool.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT id, nombre, email, rol, activo FROM users')) {
      return {
        rows: [{
          id: params[0],
          nombre: 'Usuario de prueba',
          email: 'user@example.test',
          rol: params[0] === 2 ? 'estudiante' : 'admin',
          activo: true,
        }],
      };
    }
    return { rows: [] };
  });
});

describe('Rutas administrativas existentes', () => {
  test('mantiene accesible la ruta administrativa existente de usuarios', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken(1)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ users: [] });
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('ORDER BY fecha_registro DESC'))).toBe(true);
  });

  test('retira el endpoint temporal de identidad sin interferir con el resto del router', async () => {
    const response = await request(app)
      .get('/api/v1/admin/database-identity')
      .set('Authorization', `Bearer ${accessToken(1)}`);

    expect(response.status).toBe(404);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('FROM pg_roles'))).toBe(false);
  });
});
