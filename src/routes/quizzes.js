const express = require('express');
const router = express.Router();

const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const POST_LOGIN_COURSE = 'Evaluación Educativa y Autonomía Institucional';

const questionsQuery = `
  SELECT
    q.id,
    q.pregunta,
    l.titulo AS leccion,
    q.explicacion_correcta,
    q.explicacion_incorrecta,
    json_agg(
      json_build_object(
        'id', qo.id,
        'opcion', qo.opcion,
        'orden', qo.orden
      ) ORDER BY qo.orden
    ) AS opciones
  FROM quizzes q
  JOIN lessons l ON l.id = q.leccion_id AND l.activo = TRUE
  JOIN modules m ON m.id = l.modulo_id AND m.activo = TRUE
  JOIN courses c ON c.id = m.curso_id AND c.activo = TRUE
  JOIN quiz_options qo ON qo.quiz_id = q.id
  WHERE c.titulo = $1
  GROUP BY q.id, l.titulo, q.explicacion_correcta, q.explicacion_incorrecta
  ORDER BY q.id
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
      results: graded.map(({ questionId, correct, explanation }) => ({
        questionId,
        correct,
        explanation,
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

module.exports = router;
