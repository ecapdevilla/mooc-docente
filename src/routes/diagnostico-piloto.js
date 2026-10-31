const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const { pool } = require('../config/database');

const router = express.Router();
const EXAM_CODE = 'MD-DIA-2026-PILOTO-001';
const OPTION_CODES = new Set(['A', 'B', 'C', 'D']);
const PILOT_NOTICE =
  'Diagnóstico piloto independiente de preparación. No es una prueba oficial de la CNSC ni predice aprobación o nombramiento. Material pendiente de validación académica.';

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const isProductionDeployment = () =>
  process.env.VERCEL_ENV === 'production' ||
  (process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV === 'production');
const isEnabled = () =>
  !isProductionDeployment() &&
  process.env.PILOT_DIAGNOSTIC_ENABLED === 'true' &&
  typeof process.env.PILOT_ACCESS_CODE === 'string' &&
  process.env.PILOT_ACCESS_CODE.length >= 32 &&
  process.env.PILOT_ACCESS_CODE.length <= 256;

const isValidAccessCode = (supplied) => {
  if (!isEnabled() || typeof supplied !== 'string') return false;
  const expectedHash = Buffer.from(hash(process.env.PILOT_ACCESS_CODE), 'hex');
  const suppliedHash = Buffer.from(hash(supplied), 'hex');
  return crypto.timingSafeEqual(expectedHash, suppliedHash);
};

const accessCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Se alcanzó el límite de intentos de acceso. Intenta más tarde.' },
});

const reportError = (res, error) => {
  console.error('Diagnostic pilot error:', error.code || error.name || 'UnknownError');
  return res.status(500).json({ error: 'No fue posible procesar la solicitud.' });
};

const isPilotQuestionSetValid = (questions) => {
  if (questions.length !== 50) return false;

  const categoryCounts = new Map();
  for (const question of questions) {
    if (
      !question.id ||
      !question.categoria ||
      !question.enunciado ||
      !Array.isArray(question.opciones) ||
      question.opciones.length !== 4
    ) {
      return false;
    }

    const optionCodes = question.opciones.map((option) => option.id);
    if (
      new Set(optionCodes).size !== 4 ||
      optionCodes.some((code) => !OPTION_CODES.has(code))
    ) {
      return false;
    }

    categoryCounts.set(
      question.categoria,
      (categoryCounts.get(question.categoria) || 0) + 1
    );
  }

  return categoryCounts.size === 5 &&
    [...categoryCounts.values()].every((count) => count === 10);
};

router.get('/info', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'Piloto no habilitado' });

  try {
    const { rows } = await pool.query(
      `SELECT codigo, titulo, version, estado, aviso, duracion_min
       FROM md_pilot_exams
       WHERE codigo = $1`,
      [EXAM_CODE]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Diagnóstico no instalado' });
    }

    return res.json({
      examen: rows[0],
      preguntas: 50,
      acceso: 'solo participantes autorizados',
    });
  } catch (error) {
    return reportError(res, error);
  }
});

router.post('/start', accessCodeLimiter, async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'Piloto no habilitado' });
  if (!isValidAccessCode(req.body && req.body.codigo_acceso)) {
    return res.status(403).json({ error: 'Código de acceso incorrecto' });
  }

  try {
    const { rows: exams } = await pool.query(
      `SELECT duracion_min
       FROM md_pilot_exams
       WHERE codigo = $1`,
      [EXAM_CODE]
    );
    if (!exams.length) {
      return res.status(404).json({ error: 'Diagnóstico no instalado' });
    }

    const { rows: questions } = await pool.query(
      `SELECT
         q.id,
         q.orden,
         q.categoria,
         q.evidencia,
         q.enunciado,
         (
           SELECT json_agg(
             json_build_object('id', o.codigo, 'texto', o.texto)
             ORDER BY o.codigo
           )
           FROM md_pilot_options o
           WHERE o.question_id = q.id
         ) AS opciones
       FROM md_pilot_questions q
       WHERE q.codigo = $1
       ORDER BY q.orden`,
      [EXAM_CODE]
    );

    if (!isPilotQuestionSetValid(questions)) {
      return res.status(503).json({
        error: 'El banco de preguntas aún no cumple las validaciones técnicas del piloto.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const { rows: attempts } = await pool.query(
      `INSERT INTO md_pilot_attempts (codigo, token_hash)
       VALUES ($1, $2)
       RETURNING expira_en`,
      [EXAM_CODE, hash(token)]
    );

    return res.status(201).json({
      token,
      expira_en: attempts[0].expira_en,
      preguntas: questions,
      aviso: PILOT_NOTICE,
      duracion_sugerida_min: exams[0].duracion_min,
    });
  } catch (error) {
    return reportError(res, error);
  }
});

router.post('/submit', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'Piloto no habilitado' });

  const { token, respuestas } = req.body || {};
  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(token) ||
    !Array.isArray(respuestas) ||
    respuestas.length !== 50
  ) {
    return res.status(400).json({ error: 'Se requieren 50 respuestas y un token válido.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows: attempts } = await client.query(
      `SELECT id, codigo, expira_en, finalizado_en
       FROM md_pilot_attempts
       WHERE token_hash = $1
       FOR UPDATE`,
      [hash(token)]
    );

    if (!attempts.length || attempts[0].codigo !== EXAM_CODE) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Intento inexistente.' });
    }

    const attempt = attempts[0];
    if (attempt.finalizado_en) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El intento ya fue entregado.' });
    }
    if (new Date(attempt.expira_en) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'El intento expiró.' });
    }

    const { rows: questions } = await client.query(
      `SELECT id, orden, categoria, clave, justificacion
       FROM md_pilot_questions
       WHERE codigo = $1
       ORDER BY orden`,
      [EXAM_CODE]
    );
    if (questions.length !== 50) {
      throw new Error('Pilot question set is incomplete');
    }

    const submitted = new Map();
    for (const answer of respuestas) {
      if (
        !answer ||
        typeof answer.id !== 'string' ||
        typeof answer.opcion !== 'string' ||
        submitted.has(answer.id)
      ) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Hay respuestas inválidas o preguntas repetidas.' });
      }
      submitted.set(answer.id, answer.opcion);
    }

    const questionIds = new Set(questions.map((question) => question.id));
    if (
      submitted.size !== questionIds.size ||
      [...submitted.keys()].some((questionId) => !questionIds.has(questionId))
    ) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Debes responder cada pregunta exactamente una vez.' });
    }

    const { rows: options } = await client.query(
      `SELECT o.question_id, o.codigo, o.retroalimentacion
       FROM md_pilot_options o
       JOIN md_pilot_questions q ON q.id = o.question_id
       WHERE q.codigo = $1`,
      [EXAM_CODE]
    );
    const optionsByQuestion = new Map();
    for (const option of options) {
      if (!optionsByQuestion.has(option.question_id)) {
        optionsByQuestion.set(option.question_id, new Map());
      }
      optionsByQuestion.get(option.question_id).set(option.codigo, option);
    }

    const categoryResults = {};
    let correctCount = 0;
    const graded = [];

    for (const question of questions) {
      const selectedCode = submitted.get(question.id);
      const selectedOption = optionsByQuestion.get(question.id)?.get(selectedCode);
      const keyOption = optionsByQuestion.get(question.id)?.get(question.clave);
      if (!selectedOption || !keyOption || !OPTION_CODES.has(question.clave)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Una respuesta no corresponde a una opción válida.' });
      }

      const correct = selectedCode === question.clave;
      if (correct) correctCount += 1;
      if (!categoryResults[question.categoria]) {
        categoryResults[question.categoria] = { aciertos: 0, total: 0 };
      }
      categoryResults[question.categoria].total += 1;
      if (correct) categoryResults[question.categoria].aciertos += 1;

      graded.push({
        id: question.id,
        opcion: selectedCode,
        correcta: correct,
        retroalimentacion: selectedOption.retroalimentacion,
        justificacion: question.justificacion,
      });
    }

    const result = {
      aciertos: correctCount,
      total: questions.length,
      por_categoria: categoryResults,
      por_pregunta: graded,
    };

    await client.query(
      `INSERT INTO md_pilot_attempt_answers (attempt_id, question_id, opcion, correcta)
       SELECT $1::uuid, answer.id, answer.opcion, answer.correcta
       FROM jsonb_to_recordset($2::jsonb) AS answer(id text, opcion text, correcta boolean)`,
      [attempt.id, JSON.stringify(graded)]
    );
    await client.query(
      `UPDATE md_pilot_attempts
       SET finalizado_en = now(), aciertos = $2, resultado = $3::jsonb
       WHERE id = $1`,
      [attempt.id, correctCount, JSON.stringify(result)]
    );

    await client.query('COMMIT');
    return res.json(result);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Diagnostic pilot rollback error:', rollbackError.code || rollbackError.name);
      }
    }
    return reportError(res, error);
  } finally {
    if (client) client.release();
  }
});

router.post('/feedback', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'Piloto no habilitado' });

  const { token, calificacion, comentario } = req.body || {};
  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(token) ||
    !Number.isInteger(calificacion) ||
    calificacion < 1 ||
    calificacion > 5 ||
    typeof comentario !== 'string' ||
    comentario.length > 1500
  ) {
    return res.status(400).json({ error: 'Datos de retroalimentación inválidos.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO md_pilot_feedback (attempt_id, calificacion, comentario)
       SELECT id, $2, $3
       FROM md_pilot_attempts
       WHERE token_hash = $1
         AND codigo = $4
         AND finalizado_en IS NOT NULL
       ON CONFLICT (attempt_id) DO NOTHING
       RETURNING attempt_id`,
      [hash(token), calificacion, comentario.trim(), EXAM_CODE]
    );

    if (!rows.length) {
      return res.status(409).json({
        error: 'No existe un intento finalizado sin retroalimentación previa.',
      });
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    return reportError(res, error);
  }
});

module.exports = router;
