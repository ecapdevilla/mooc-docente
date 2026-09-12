const { api, closePool } = require('./helpers');

afterAll(closePool);

describe('Salud del sistema', () => {
  test('GET /health responde con estado ok', async () => {
    const res = await api.get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET /api/v1/ping/health confirma la conexión a la base de datos', async () => {
    const res = await api.get('/api/v1/ping/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  test('una ruta desconocida responde 404 en formato JSON', async () => {
    const res = await api.get('/api/v1/ruta-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('el frontend principal se sirve en la raíz', async () => {
    const res = await api.get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('MéritoDocente');
  });
});
