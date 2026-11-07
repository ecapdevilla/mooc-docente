/**
 * Insignia de curso al aprobar el examen final (Sprint A).
 *
 * Verifica que aprobar `POST /api/v1/courses/:id/assessment/attempts` otorga
 * una insignia de curso (idempotente) y la expone en la respuesta, sin
 * duplicar la relación en `user_badges`.
 * No toca Production: usa la base configurada en DATABASE_URL.
 */

const { api, pool, registerUser, deleteUser, closePool } = require('./helpers');

let token;
let email;
let cursoId;
let idsClaves;
let idsIncorrectas;

const conToken = (peticion) => peticion.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  const registro = await registerUser();
  token = registro.token;
  email = registro.email;

  const { rows: cursos } = await pool.query(
    `SELECT c.id
       FROM courses c
       JOIN modules m ON m.curso_id = c.id AND m.activo = TRUE
       JOIN lessons l ON l.modulo_id = m.id AND l.activo = TRUE
       JOIN quizzes q ON q.leccion_id = l.id
      WHERE c.activo = TRUE
      GROUP BY c.id
     HAVING COUNT(q.id) > 0
      ORDER BY c.id ASC
      LIMIT 1`
  );

  cursoId = cursos[0].id;

  const { rows: claves } = await pool.query(
    `SELECT qo.quiz_id, qo.id AS opcion_id
       FROM quiz_options qo
       JOIN quizzes q ON q.id = qo.quiz_id
       JOIN lessons l ON l.id = q.leccion_id
       JOIN modules m ON m.id = l.modulo_id
      WHERE m.curso_id = $1 AND qo.es_correcta = TRUE
      ORDER BY qo.quiz_id`,
    [cursoId]
  );

  idsClaves = claves;

  const { rows: incorrectas } = await pool.query(
    `SELECT DISTINCT ON (qo.quiz_id) qo.quiz_id, qo.id AS opcion_id
       FROM quiz_options qo
       JOIN quizzes q ON q.id = qo.quiz_id
       JOIN lessons l ON l.id = q.leccion_id
       JOIN modules m ON m.id = l.modulo_id
      WHERE m.curso_id = $1 AND qo.es_correcta = FALSE
      ORDER BY qo.quiz_id, qo.id`,
    [cursoId]
  );

  idsIncorrectas = incorrectas;
});

afterAll(async () => {
  await deleteUser(email);
  await closePool();
});

describe('Insignia de curso al aprobar el examen final', () => {
  const respuestasCorrectas = () =>
    idsClaves.map((clave) => ({ questionId: clave.quiz_id, optionId: clave.opcion_id }));

  test('otorga la insignia al aprobar y no la duplica al repetir', async () => {
    const primera = await conToken(
      api.post(`/api/v1/courses/${cursoId}/assessment/attempts`).send({ answers: respuestasCorrectas() })
    );

    expect(primera.status).toBe(201);
    expect(primera.body.attempt.aprobado).toBe(true);
    expect(primera.body.badge).not.toBeNull();
    expect(primera.body.badge.nombre).toContain('Curso aprobado');
    expect(primera.body.badge.nueva).toBe(true);

    const segunda = await conToken(
      api.post(`/api/v1/courses/${cursoId}/assessment/attempts`).send({ answers: respuestasCorrectas() })
    );

    expect(segunda.status).toBe(201);
    expect(segunda.body.badge).not.toBeNull();
    expect(segunda.body.badge.nueva).toBe(false);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
         JOIN users u ON u.id = ub.usuario_id
        WHERE u.email = $1 AND b.curso_id = $2`,
      [email, cursoId]
    );

    expect(rows[0].total).toBe(1);
  });

  test('no otorga insignia cuando el examen se desaprueba', async () => {
    const incorrectas = idsIncorrectas.map((clave) => ({
      questionId: clave.quiz_id,
      optionId: clave.opcion_id,
    }));

    const respuesta = await conToken(
      api.post(`/api/v1/courses/${cursoId}/assessment/attempts`).send({ answers: incorrectas })
    );

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.badge).toBeNull();
  });
});
