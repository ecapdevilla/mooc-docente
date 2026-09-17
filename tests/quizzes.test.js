const { api, pool, registerUser, deleteUser, closePool } = require('./helpers');

let token;
let email;

beforeAll(async () => {
  const registration = await registerUser();
  token = registration.token;
  email = registration.email;
});

afterAll(async () => {
  await deleteUser(email);
  await closePool();
});

const withToken = (request) => request.set('Authorization', `Bearer ${token}`);

describe('Quiz independiente post-login', () => {
  test('requiere autenticación', async () => {
    const response = await api.get('/api/v1/quizzes/post-login');

    expect(response.status).toBe(401);
  });

  test('devuelve preguntas sin exponer respuestas correctas', async () => {
    const response = await withToken(api.get('/api/v1/quizzes/post-login'));

    expect(response.status).toBe(200);
    expect(response.body.quiz.preguntas.length).toBeGreaterThanOrEqual(2);

    for (const question of response.body.quiz.preguntas) {
      expect(question.pregunta).toBeDefined();
      expect(question.opciones.length).toBe(4);
      expect(JSON.stringify(question)).not.toContain('es_correcta');
      expect(JSON.stringify(question)).not.toContain('explicacion_correcta');
    }
  });

  test('califica en backend y guarda el intento', async () => {
    const quiz = await withToken(api.get('/api/v1/quizzes/post-login'));
    const questionIds = quiz.body.quiz.preguntas.map((question) => question.id);
    const correctOptions = await pool.query(
      `SELECT q.id AS question_id, qo.id AS option_id
       FROM quizzes q
       JOIN quiz_options qo ON qo.quiz_id = q.id
       JOIN lessons l ON l.id = q.leccion_id
       JOIN modules m ON m.id = l.modulo_id
       JOIN courses c ON c.id = m.curso_id
       WHERE c.titulo = $1 AND qo.es_correcta = TRUE
       ORDER BY q.id`,
      ['Evaluación Educativa y Autonomía Institucional']
    );

    const response = await withToken(
      api.post('/api/v1/quizzes/post-login/attempts')
    ).send({
      answers: correctOptions.rows.map((answer) => ({
        questionId: answer.question_id,
        optionId: answer.option_id,
      })),
    });

    expect(response.status).toBe(201);
    expect(response.body.attempt.aciertos).toBe(questionIds.length);
    expect(Number(response.body.attempt.puntaje)).toBe(100);
    expect(response.body.results).toHaveLength(questionIds.length);

    const saved = await pool.query(
      'SELECT COUNT(*)::int AS total FROM quiz_attempts WHERE id = $1',
      [response.body.attempt.id]
    );
    expect(saved.rows[0].total).toBe(1);
  });

  test('rechaza respuestas incompletas', async () => {
    const response = await withToken(
      api.post('/api/v1/quizzes/post-login/attempts')
    ).send({ answers: [] });

    expect(response.status).toBe(400);
  });
});
