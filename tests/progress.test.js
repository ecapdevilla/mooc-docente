const { api, registerUser, deleteUser, closePool } = require('./helpers');

let token;
let email;
let lessonIds = [];

beforeAll(async () => {
  const registration = await registerUser();
  token = registration.token;
  email = registration.email;

  const list = await api.get('/api/v1/courses');
  const courseId = list.body.courses[0].id;

  const detail = await api.get(`/api/v1/courses/${courseId}`);
  lessonIds = detail.body.course.modulos.flatMap((m) =>
    (m.lecciones || []).map((l) => l.id)
  );
});

afterAll(async () => {
  await deleteUser(email);
  await closePool();
});

const withToken = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Progreso', () => {
  test('el curso de prueba tiene lecciones disponibles', () => {
    expect(lessonIds.length).toBeGreaterThan(0);
  });

  test('completar una lección sin token devuelve 401', async () => {
    const res = await api
      .post(`/api/v1/progress/lesson/${lessonIds[0]}`)
      .send({ puntaje: 100 });

    expect(res.status).toBe(401);
  });

  test('una lección inexistente devuelve 404', async () => {
    const res = await withToken(
      api.post('/api/v1/progress/lesson/999999')
    ).send({ puntaje: 100 });

    expect(res.status).toBe(404);
  });

  test('completar una lección crea progreso, inscripción y porcentajes', async () => {
    const res = await withToken(
      api.post(`/api/v1/progress/lesson/${lessonIds[0]}`)
    ).send({ puntaje: 100 });

    expect(res.status).toBe(200);
    expect(res.body.progress.lesson.completada).toBe(true);
    expect(res.body.progress.moduleProgress).toBe(100);
    expect(typeof res.body.progress.courseProgress).toBe('number');

    const enrollments = await withToken(api.get('/api/v1/users/enrollments'));

    expect(enrollments.status).toBe(200);
    expect(enrollments.body.enrollments.length).toBe(1);
    expect(Number(enrollments.body.enrollments[0].progreso_total)).toBeGreaterThan(0);
  });

  test('repetir una lección no duplica el progreso y aumenta los intentos', async () => {
    const first = await withToken(
      api.post(`/api/v1/progress/lesson/${lessonIds[0]}`)
    ).send({ puntaje: 100 });

    const again = await withToken(
      api.post(`/api/v1/progress/lesson/${lessonIds[0]}`)
    ).send({ puntaje: 90 });

    expect(again.status).toBe(200);
    expect(again.body.progress.lesson.intentos).toBe(
      first.body.progress.lesson.intentos + 1
    );
    expect(Number(again.body.progress.lesson.puntaje)).toBe(90);
  });

  test('GET /api/v1/progress devuelve progreso global, lecciones y badges', async () => {
    const res = await withToken(api.get('/api/v1/progress'));

    expect(res.status).toBe(200);
    expect(typeof res.body.globalProgress).toBe('number');
    expect(Array.isArray(res.body.modules)).toBe(true);
    expect(Array.isArray(res.body.badges)).toBe(true);

    const modulesWithLessons = res.body.modules.filter(
      (m) => m.totalLessons > 0
    );
    expect(modulesWithLessons.length).toBeGreaterThan(0);

    const moduleWithLesson = modulesWithLessons[0];
    expect(Array.isArray(moduleWithLesson.lessons)).toBe(true);
    expect(moduleWithLesson.lessons[0]).toHaveProperty('completada');
  });
});
