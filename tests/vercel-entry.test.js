/**
 * Pruebas del punto de entrada serverless (api/index.js).
 *
 * Vercel enruta `/api/(.*)` y `/health` hacia esta función, y aquí se normaliza
 * la ruta antes de entregarla a Express. Un error en esa normalización deja
 * endpoints inaccesibles en Production sin que las pruebas de la app lo noten.
 */

const request = require('supertest');
const handler = require('../api/index');
const { closePool } = require('./helpers');

afterAll(closePool);

describe('api/index.js (entrada serverless)', () => {
  test('GET /health llega a Express y responde con el estado', async () => {
    const res = await request(handler).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.commit).toBe('string');
  });

  test('GET /api/v1 identifica la API y el commit desplegado', async () => {
    const res = await request(handler).get('/api/v1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', version: 'v1' });
    expect(typeof res.body.commit).toBe('string');
  });

  test('una ruta sin prefijo se normaliza a /api/v1', async () => {
    const res = await request(handler).get('/courses');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.courses)).toBe(true);
  });

  test('un JSON malformado responde 400 con mensaje explícito', async () => {
    const res = await request(handler)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"docente@example.com","password": SinComillas123}');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido en el cuerpo de la solicitud');
  });
});
