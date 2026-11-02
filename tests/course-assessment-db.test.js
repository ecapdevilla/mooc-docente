/**
 * Evaluación final por curso (T2.4) contra PostgreSQL.
 *
 * Complementa `course-assessment.test.js` (base simulada) con el recorrido
 * completo sobre el catálogo real: consulta sin claves, calificación en
 * servidor, persistencia del intento y exigencia de respuestas completas.
 * No toca Production: usa la base configurada en DATABASE_URL.
 */

const { api, pool, registerUser, deleteUser, closePool } = require('./helpers');

let token;
let email;
let cursoId;
let preguntas;
let ultimoIntentoId;

const conToken = (peticion) => peticion.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  const registro = await registerUser();
  token = registro.token;
  email = registro.email;

  const { rows: cursos } = await pool.query(
    `SELECT c.id, COUNT(q.id)::int AS total
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
});

afterAll(async () => {
  await deleteUser(email);
  await closePool();
});

describe('Evaluación final por curso sobre PostgreSQL', () => {
  test('publica las preguntas del curso sin respuestas correctas', async () => {
    const respuesta = await conToken(api.get(`/api/v1/courses/${cursoId}/assessment`));

    expect(respuesta.status).toBe(200);
    const { assessment } = respuesta.body;
    expect(assessment.cursoId).toBe(cursoId);
    expect(assessment.totalPreguntas).toBeGreaterThan(0);
    expect(assessment.umbralAprobacion).toBe(80);
    expect(assessment.historial).toEqual([]);

    preguntas = assessment.preguntas;
    expect(JSON.stringify(assessment)).not.toContain('es_correcta');
    expect(JSON.stringify(assessment)).not.toContain('explicacion_correcta');

    for (const pregunta of preguntas) {
      expect(pregunta.opciones.length).toBeGreaterThanOrEqual(2);
      for (const opcion of pregunta.opciones) {
        expect(Object.keys(opcion).sort()).toEqual(['id', 'opcion', 'orden']);
      }
    }
  });

  test('califica en el servidor, aprueba con el umbral y guarda el intento', async () => {
    const ids = preguntas.map((pregunta) => pregunta.id);
    const { rows: claves } = await pool.query(
      `SELECT quiz_id, id AS opcion_id
         FROM quiz_options
        WHERE quiz_id = ANY($1::int[]) AND es_correcta = TRUE
        ORDER BY quiz_id`,
      [ids]
    );

    const respuesta = await conToken(
      api.post(`/api/v1/courses/${cursoId}/assessment/attempts`)
    ).send({
      answers: claves.map((clave) => ({
        questionId: clave.quiz_id,
        optionId: clave.opcion_id,
      })),
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.attempt).toMatchObject({
      puntaje: 100,
      aciertos: ids.length,
      totalPreguntas: ids.length,
      aprobado: true,
      umbralAprobacion: 80,
    });
    expect(respuesta.body.results).toHaveLength(ids.length);
    expect(respuesta.body.areasPrioritarias).toEqual([]);

    ultimoIntentoId = respuesta.body.attempt.id;

    const { rows: guardado } = await pool.query(
      `SELECT curso_id, alcance, aprobado, puntaje, total_preguntas
         FROM quiz_attempts
        WHERE id = $1`,
      [ultimoIntentoId]
    );

    expect(guardado[0]).toMatchObject({
      curso_id: cursoId,
      alcance: 'evaluacion_curso',
      aprobado: true,
      total_preguntas: ids.length,
    });

    const { rows: respuestas } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM quiz_attempt_answers WHERE intento_id = $1',
      [ultimoIntentoId]
    );
    expect(respuestas[0].total).toBe(ids.length);
  });

  test('el historial del curso incluye el intento recién guardado', async () => {
    const respuesta = await conToken(api.get(`/api/v1/courses/${cursoId}/assessment`));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.assessment.historial[0]).toMatchObject({
      id: ultimoIntentoId,
      aprobado: true,
      totalPreguntas: preguntas.length,
    });
    expect(respuesta.body.assessment.historial[0].puntaje).toBe(100);
  });

  test('rechaza un envío incompleto sin registrar intento', async () => {
    const respuesta = await conToken(
      api.post(`/api/v1/courses/${cursoId}/assessment/attempts`)
    ).send({ answers: [{ questionId: preguntas[0].id, optionId: preguntas[0].opciones[0].id }] });

    expect(respuesta.status).toBe(400);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM quiz_attempts
        WHERE usuario_id = (SELECT id FROM users WHERE email = $1)
          AND alcance = 'evaluacion_curso'`,
      [email]
    );
    expect(rows[0].total).toBe(1);
  });

  test('responde 404 para un curso inexistente', async () => {
    const respuesta = await conToken(api.get('/api/v1/courses/999999/assessment'));

    expect(respuesta.status).toBe(404);
  });
});
