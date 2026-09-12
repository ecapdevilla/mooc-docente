const { api, registerUser, deleteUser, closePool } = require('./helpers');

const createdEmails = [];

afterAll(async () => {
  for (const email of createdEmails) {
    await deleteUser(email);
  }
  await closePool();
});

describe('Autenticación', () => {
  test('el registro crea el usuario y devuelve token', async () => {
    const { email, res } = await registerUser();
    createdEmails.push(email);

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('un registro duplicado devuelve 409', async () => {
    const { email, password } = await registerUser();
    createdEmails.push(email);

    const res = await api
      .post('/api/v1/auth/register')
      .send({ nombre: 'Otro Docente', email, password });

    expect(res.status).toBe(409);
  });

  test('un registro inválido devuelve 400', async () => {
    const res = await api
      .post('/api/v1/auth/register')
      .send({ nombre: 'a', email: 'no-es-correo', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('el login correcto permite consultar /auth/me', async () => {
    const { email, password } = await registerUser();
    createdEmails.push(email);

    const login = await api
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');

    const me = await api
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  test('el login con contraseña incorrecta devuelve 401', async () => {
    const { email } = await registerUser();
    createdEmails.push(email);

    const res = await api
      .post('/api/v1/auth/login')
      .send({ email, password: 'Incorrecta123' });

    expect(res.status).toBe(401);
  });

  test('una ruta protegida sin token devuelve 401', async () => {
    const res = await api.get('/api/v1/users/profile');

    expect(res.status).toBe(401);
  });
});
