const { api, closePool } = require('./helpers');

afterAll(closePool);

describe('Salud del sistema', () => {
  test('GET /health responde con estado ok', async () => {
    const res = await api.get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
    // Permite verificar qué versión está desplegada (SHA de Vercel o 'local').
    expect(typeof res.body.commit).toBe('string');
    expect(res.body.commit.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/ping/health confirma la conexión a la base de datos', async () => {
    const res = await api.get('/api/v1/ping/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  test('GET /api/v1 identifica la API y la versión desplegada', async () => {
    const res = await api.get('/api/v1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', api: 'MéritoDocente', version: 'v1' });
    // Marcador de despliegue: SHA de Vercel en Production, 'local' en desarrollo.
    expect(typeof res.body.commit).toBe('string');
    expect(res.body.commit.length).toBeGreaterThan(0);
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
