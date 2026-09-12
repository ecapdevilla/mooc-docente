const { api, closePool } = require('./helpers');

afterAll(closePool);

describe('Cursos', () => {
  test('GET /api/v1/courses devuelve los cursos activos', async () => {
    const res = await api.get('/api/v1/courses');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(res.body.courses.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/courses/:id devuelve módulos, lecciones y opciones de quiz', async () => {
    const list = await api.get('/api/v1/courses');
    const courseId = list.body.courses[0].id;

    const res = await api.get(`/api/v1/courses/${courseId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.course.modulos)).toBe(true);
    expect(res.body.course.modulos.length).toBeGreaterThan(0);

    // Regresión: el agregado json_agg(... ORDER BY ...) devolvía error 42803.
    const lessons = res.body.course.modulos.flatMap((m) => m.lecciones || []);
    expect(lessons.length).toBeGreaterThan(0);

    const lessonWithQuiz = lessons.find((l) => Array.isArray(l.quizzes));
    expect(lessonWithQuiz).toBeDefined();
    expect(lessonWithQuiz.quizzes[0]).toHaveProperty('pregunta');

    const options = lessonWithQuiz.quizzes[0].opciones;
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty('es_correcta');
  });

  test('GET /api/v1/courses/:id inexistente devuelve 404', async () => {
    const res = await api.get('/api/v1/courses/999999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
