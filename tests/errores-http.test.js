/**
 * Regresión del manejador global de errores.
 *
 * Síntoma reportado: `POST /api/v1/auth/login` devolvía 500 en Production.
 * La causa no era el login: body-parser rechaza un cuerpo JSON malformado en
 * cualquier ruta y el manejador global lo traducía a 500. Estos casos fijan el
 * contrato: cuerpo inválido -> 400, ruta inexistente -> 404, credenciales
 * incorrectas -> 401.
 */

const { api, closePool } = require('./helpers');

afterAll(closePool);

describe('Manejo de errores HTTP', () => {
  test('un JSON malformado en /auth/login devuelve 400 y no expone el cuerpo', async () => {
    const res = await api
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "docente@example.com", "password": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido en el cuerpo de la solicitud');
    expect(res.body.stack).toBeUndefined();

    const serializado = JSON.stringify(res.body);
    expect(serializado).not.toContain('docente@example.com');
    expect(serializado).not.toContain('Unexpected');
  });

  test('un JSON malformado devuelve 400 también en una ruta inexistente', async () => {
    const res = await api
      .post('/api/v1/ruta-inexistente')
      .set('Content-Type', 'application/json')
      .send('{esto no es json');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido en el cuerpo de la solicitud');
  });

  test('el log de un JSON inválido no registra el cuerpo ni la contraseña', async () => {
    const registros = [];
    const original = console.warn;

    console.warn = (...args) => registros.push(args.map(String).join(' '));

    try {
      await api
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email":"docente@example.com","password": ClaveSecreta123}');
    } finally {
      console.warn = original;
    }

    const texto = registros.join('\n');

    // V8 incluye un fragmento del cuerpo en algunos mensajes de JSON.parse;
    // el manejador no debe propagarlo al log.
    expect(texto).toContain('cuerpo JSON inválido');
    expect(texto).not.toContain('ClaveSecreta123');
    expect(texto).not.toContain('docente@example.com');
  });

  test('una ruta inexistente sin cuerpo sigue devolviendo 404', async () => {
    const res = await api.get('/api/v1/ruta-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Ruta no encontrada');
  });

  test('el login con credenciales inexistentes devuelve 401, no 500', async () => {
    const res = await api
      .post('/api/v1/auth/login')
      .send({ email: 'no-existe.carga@meritodocente.com', password: 'Agente12345' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
