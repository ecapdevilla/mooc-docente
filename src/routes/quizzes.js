const express = require('express');
const router = express.Router();

const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const {
  PUNTAJE_APROBACION,
  dominioLeccion,
  respuestasDisponibles,
} = require('../services/lessonQuiz');

const POST_LOGIN_COURSE = 'Evaluación Educativa y Autonomía Institucional';

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const questionsQuery = `
  SELECT
    q.id,
    q.pregunta,
    l.titulo AS leccion,
    c.area,
    q.explicacion_correcta,
    q.explicacion_incorrecta,
    json_agg(
      json_build_object(
        'id', qo.id,
        'opcion', qo.opcion,
        'orden', qo.orden
      ) ORDER BY random()
    ) AS opciones
  FROM quizzes q
  JOIN lessons l ON l.id = q.leccion_id AND l.activo = TRUE
  JOIN modules m ON m.id = l.modulo_id AND m.activo = TRUE
  JOIN courses c ON c.id = m.curso_id AND c.activo = TRUE
  JOIN quiz_options qo ON qo.quiz_id = q.id
  WHERE c.titulo = $1
  GROUP BY q.id, l.titulo, c.area, q.explicacion_correcta, q.explicacion_incorrecta
  ORDER BY random()
`;

/**
 * GET /api/v1/quizzes/post-login
 * Returns the current post-login quiz without exposing correct options.
 */
router.get('/post-login', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(questionsQuery, [POST_LOGIN_COURSE]);
    res.json({
      quiz: {
        titulo: POST_LOGIN_COURSE,
        preguntas: rows.map(({ explicacion_correcta, explicacion_incorrecta, ...question }) => question),
      },
    });
  } catch (err) {
    console.error('Error fetching post-login quiz:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/v1/quizzes/post-login/attempts
 * Grades answers on the server and stores an immutable attempt snapshot.
 */
router.post('/post-login/attempts', authenticate, async (req, res) => {
  const answers = req.body && req.body.answers;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Debes enviar las respuestas del quiz.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: questions } = await client.query(
      `SELECT
         q.id AS quiz_id,
         q.pregunta,
         l.titulo AS leccion,
         c.area,
         q.explicacion_correcta,
         q.explicacion_incorrecta,
         qo.id AS option_id,
         qo.opcion,
         qo.es_correcta
       FROM quizzes q
       JOIN lessons l ON l.id = q.leccion_id AND l.activo = TRUE
       JOIN modules m ON m.id = l.modulo_id AND m.activo = TRUE
       JOIN courses c ON c.id = m.curso_id AND c.activo = TRUE
       JOIN quiz_options qo ON qo.quiz_id = q.id
       WHERE c.titulo = $1
       ORDER BY q.id, qo.orden`,
      [POST_LOGIN_COURSE]
    );

    const questionIds = [...new Set(questions.map((row) => row.quiz_id))];
    const submittedIds = answers.map((answer) => Number(answer.questionId));
    const uniqueSubmittedIds = [...new Set(submittedIds)];

    if (
      submittedIds.some((id) => !Number.isInteger(id)) ||
      uniqueSubmittedIds.length !== questionIds.length ||
      uniqueSubmittedIds.some((id) => !questionIds.includes(id)) ||
      questionIds.some((id) => !uniqueSubmittedIds.includes(id))
    ) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Debes responder cada pregunta una sola vez.' });
    }

    const answerByQuestion = new Map(
      answers.map((answer) => [Number(answer.questionId), Number(answer.optionId)])
    );
    const grouped = new Map();

    for (const row of questions) {
      if (!grouped.has(row.quiz_id)) grouped.set(row.quiz_id, []);
      grouped.get(row.quiz_id).push(row);
    }

    const graded = questionIds.map((questionId) => {
      const options = grouped.get(questionId);
      const selectedOptionId = answerByQuestion.get(questionId);
      const selected = options.find((option) => option.option_id === selectedOptionId);

      if (!selected) {
        throw Object.assign(new Error('Una opción no pertenece a su pregunta.'), { statusCode: 400 });
      }

      const question = options[0];
      return {
        questionId,
        selectedOptionId,
        selectedText: selected.opcion,
        correct: selected.es_correcta,
        questionText: question.pregunta,
        topic: question.leccion,
        area: question.area,
        explanation: selected.es_correcta
          ? question.explicacion_correcta
          : question.explicacion_incorrecta,
      };
    });

    const correctAnswers = graded.filter((answer) => answer.correct).length;
    const totalQuestions = graded.length;
    const score = Math.round((correctAnswers / totalQuestions) * 10000) / 100;

    const { rows: attempts } = await client.query(
      `INSERT INTO quiz_attempts
         (usuario_id, estado, finalizado_en, puntaje, aciertos, total_preguntas)
       VALUES ($1, 'finalizado', CURRENT_TIMESTAMP, $2, $3, $4)
       RETURNING id, estado, iniciado_en, finalizado_en, puntaje, aciertos, total_preguntas`,
      [req.user.id, score, correctAnswers, totalQuestions]
    );

    for (const answer of graded) {
      await client.query(
        `INSERT INTO quiz_attempt_answers
           (intento_id, quiz_id, opcion_id, respuesta_correcta, pregunta_snapshot, opcion_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          attempts[0].id,
          answer.questionId,
          answer.selectedOptionId,
          answer.correct,
          answer.questionText,
          answer.selectedText,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      attempt: attempts[0],
      results: graded.map(({ questionId, correct, explanation, topic, area }) => ({
        questionId,
        correct,
        explanation,
        topic,
        area,
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }

    console.error('Error grading post-login quiz:', err);
    res.status(500).json({ error: 'No fue posible guardar el resultado del quiz.' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/quizzes/lessons/:lessonId/responses
 * Califica una respuesta de cuestionario de lección en el servidor.
 *
 * El cuerpo solo puede aportar identificadores: el resultado, el puntaje y la
 * finalización de la lección se calculan con quiz_options y con las respuestas
 * ya registradas para el usuario autenticado.
 */
router.post('/lessons/:lessonId/responses', authenticate, async (req, res) => {
  const leccionId = parsePositiveInt(req.params.lessonId);
  const quizId = parsePositiveInt(req.body && req.body.quizId);
  const optionId = parsePositiveInt(req.body && req.body.optionId);

  if (!leccionId || !quizId || !optionId) {
    return res.status(400).json({
      error: 'Debes indicar la pregunta y una opción válida.',
    });
  }

  const client = await pool.connect();

  try {
    if (!(await respuestasDisponibles(client))) {
      return res.status(503).json({
        error: 'La calificación segura aún no está habilitada en este entorno.',
      });
    }

    await client.query('BEGIN');

    const { rows: opciones } = await client.query(
      `SELECT
         q.id AS quiz_id,
         q.pregunta,
         q.explicacion_correcta,
         q.explicacion_incorrecta,
         l.id AS leccion_id,
         m.curso_id,
         qo.id AS opcion_id,
         qo.opcion,
         qo.es_correcta
       FROM quizzes q
       JOIN lessons l ON l.id = q.leccion_id AND l.activo = TRUE
       JOIN modules m ON m.id = l.modulo_id AND m.activo = TRUE
       JOIN courses c ON c.id = m.curso_id AND c.activo = TRUE
       JOIN quiz_options qo ON qo.quiz_id = q.id
       WHERE q.id = $1
         AND l.id = $2
       ORDER BY qo.orden, qo.id`,
      [quizId, leccionId]
    );

    if (opciones.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'La pregunta no pertenece a una lección disponible.',
      });
    }

    const seleccionada = opciones.find((opcion) => opcion.opcion_id === optionId);

    if (!seleccionada) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'La opción no pertenece a la pregunta indicada.',
      });
    }

    const correctas = opciones.filter((opcion) => opcion.es_correcta === true);

    if (correctas.length !== 1) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'La pregunta no tiene una única respuesta correcta configurada.',
      });
    }

    const { rows: registradas } = await client.query(
      `INSERT INTO lesson_quiz_responses
         (usuario_id, leccion_id, quiz_id, opcion_id, respuesta_correcta, pregunta_snapshot, opcion_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, respondida_en`,
      [
        req.user.id,
        leccionId,
        quizId,
        optionId,
        seleccionada.es_correcta,
        opciones[0].pregunta,
        seleccionada.opcion,
      ]
    );

    const dominio = await dominioLeccion(client, req.user.id, leccionId);
    const puntaje = dominio.dominada ? PUNTAJE_APROBACION : null;

    if (dominio.dominada) {
      await client.query(
        `INSERT INTO enrollments
           (usuario_id, curso_id, fecha_inscripcion)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (usuario_id, curso_id)
         DO NOTHING`,
        [req.user.id, opciones[0].curso_id]
      );

      await client.query(
        `INSERT INTO user_progress
           (usuario_id, leccion_id, completada, fecha_completada, intentos, puntaje)
         VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, $3, $4)
         ON CONFLICT (usuario_id, leccion_id)
         DO UPDATE SET
           completada = TRUE,
           fecha_completada = CURRENT_TIMESTAMP,
           intentos = user_progress.intentos + 1,
           puntaje = EXCLUDED.puntaje`,
        [req.user.id, leccionId, dominio.totalRespuestas, puntaje]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      response: {
        id: registradas[0].id,
        quizId,
        leccionId,
        correct: seleccionada.es_correcta === true,
        correctOptionId: correctas[0].opcion_id,
        explanation: seleccionada.es_correcta
          ? (seleccionada.explicacion_correcta || 'Respuesta correcta.')
          : (seleccionada.explicacion_incorrecta || 'Revisa el contenido de la lección e inténtalo de nuevo.'),
        answeredAt: registradas[0].respondida_en,
      },
      lesson: {
        id: leccionId,
        completed: dominio.dominada,
        masteredQuizzes: dominio.masteredQuizzes,
        totalQuizzes: dominio.totalQuizzes,
        attempts: dominio.totalRespuestas,
        puntaje,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error grading lesson quiz response:', err);
    return res.status(500).json({ error: 'No fue posible calificar la actividad.' });
  } finally {
    client.release();
  }
});

module.exports = router;
