'use strict';

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const {
  MAX_FILE_BYTES,
  XLSX_MIME_TYPE,
  buildTemplateBuffer,
  parseXlsxImport,
  questionReviewNotes,
  validateQuestionPayload,
} = require('../services/pilot-editorial-import');

const router = express.Router();
const OPTION_CODES = ['A', 'B', 'C', 'D'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMPORT_TOKEN_TTL_MS = 15 * 60 * 1000;

router.use(authenticate, authorize('admin'));

const isUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);

const cleanString = (value, maxLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : null;

const parseXlsxBody = express.raw({
  type: () => true,
  limit: MAX_FILE_BYTES,
});

const requireXlsxBody = (req, res, next) => {
  const contentType = (req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const contentEncoding = (req.get('Content-Encoding') || 'identity').toLowerCase();
  const filename = req.get('X-Upload-Filename') || '';
  if (contentType !== XLSX_MIME_TYPE) {
    return res.status(415).json({ error: 'El tipo del archivo debe ser XLSX.' });
  }
  if (contentEncoding !== 'identity') {
    return res.status(415).json({ error: 'El archivo debe enviarse sin compresión HTTP.' });
  }
  if (filename.length > 255 || !/^[^\\/:*?"<>|]+\.xlsx$/i.test(filename)) {
    return res.status(415).json({ error: 'El nombre debe corresponder a un archivo .xlsx sin macros.' });
  }
  return parseXlsxBody(req, res, (error) => {
    if (error) {
      const status = error.type === 'entity.too.large' ? 413 : 400;
      return res.status(status).json({
        error: status === 413 ? 'El archivo supera el límite de 2 MB.' : 'No fue posible leer el archivo XLSX.',
      });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Selecciona un archivo XLSX no vacío.' });
    }
    return next();
  });
};

const digestQuestions = (questions) =>
  crypto.createHash('sha256').update(JSON.stringify(questions)).digest('base64url');

const signImportPreview = (payload) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required to sign editorial import previews.');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};

const verifyImportPreview = (token, expected) => {
  if (!process.env.JWT_SECRET || typeof token !== 'string') return false;
  const [encoded, suppliedSignature, extra] = token.split('.');
  if (!encoded || !suppliedSignature || extra) return false;
  const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(encoded).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return false;
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.userId === expected.userId &&
      payload.codigo === expected.codigo &&
      payload.versionName === expected.versionName &&
      payload.digest === expected.digest &&
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt > Date.now();
  } catch {
    return false;
  }
};

const validateImportRequest = async (req) => {
  const codigo = cleanString(req.get('X-Exam-Code'), 120);
  const versionName = cleanString(req.get('X-Editorial-Version'), 80);
  if (!codigo || !versionName) {
    const message = 'Indica el examen de origen y un nombre único para la nueva versión borrador.';
    return {
      error: message,
      errors: [{ fila: null, mensaje: message }],
      detected: 0,
      validQuestions: [],
      previewQuestions: [],
      duplicates: [],
    };
  }

  let parsed;
  try {
    parsed = await parseXlsxImport(req.body);
  } catch (error) {
    return {
      error: error.message,
      errors: [{ fila: null, mensaje: error.message }],
      detected: 0,
      validQuestions: [],
      previewQuestions: [],
      duplicates: [],
    };
  }

  const errors = [...parsed.errors];
  const invalidRows = new Set(
    parsed.errors.filter((error) => Number.isInteger(error.fila)).map((error) => error.fila)
  );
  const { rows: categoryRows } = await pool.query(
    `SELECT DISTINCT categoria
     FROM md_pilot_questions
     WHERE codigo = $1 AND categoria IS NOT NULL AND length(btrim(categoria)) > 0`,
    [codigo]
  );
  const categories = new Set(categoryRows.map((row) => row.categoria));
  const validQuestions = [];
  const validatedQuestions = [];
  const previewQuestions = [];
  for (const item of parsed.questions) {
    const validation = validateQuestionPayload(item.question);
    if (validation.error) {
      errors.push({ fila: item.fila, mensaje: validation.error });
      continue;
    }
    if (!categories.has(validation.value.categoria)) {
      errors.push({
        fila: item.fila,
        mensaje: `La categoría "${validation.value.categoria}" no existe en el examen seleccionado.`,
      });
      continue;
    }
    validatedQuestions.push({ fila: item.fila, question: validation.value });
    if (!invalidRows.has(item.fila)) {
      validQuestions.push({ fila: item.fila, question: validation.value });
    }
  }

  const { rows: existingVersion } = await pool.query(
    `SELECT 1
     FROM md_pilot_editorial_versions
     WHERE codigo = $1 AND version = $2
     LIMIT 1`,
    [codigo, versionName]
  );
  if (existingVersion.length) {
    errors.push({
      fila: null,
      mensaje: 'Ya existe una versión con ese nombre; elige otro para evitar duplicar una importación.',
    });
  }

  const { rows: existingQuestions } = await pool.query(
    `SELECT id::text, orden, enunciado
     FROM md_pilot_questions
     WHERE codigo = $1
     UNION ALL
     SELECT q.id::text, q.orden, q.enunciado
     FROM md_pilot_editorial_questions q
     JOIN md_pilot_editorial_versions v ON v.id = q.version_id
     WHERE v.codigo = $1`,
    [codigo]
  );
  const comparisonQuestions = [
    ...existingQuestions,
    ...validatedQuestions.map(({ fila, question }) => ({
      id: `import-${fila}`,
      orden: question.orden,
      enunciado: question.enunciado,
    })),
  ];
  const duplicates = [];
  for (const { fila, question } of validatedQuestions) {
    const reviewNotes = questionReviewNotes(
      { ...question, id: `import-${fila}` },
      comparisonQuestions
    ).filter((note) => note.includes('Posible duplicado') || note.includes('muy similar'));
    if (reviewNotes.length) {
      duplicates.push({ fila, numero: question.orden, observaciones: reviewNotes });
    }
    previewQuestions.push({
      fila,
      ...question,
      observaciones_revision: questionReviewNotes(
        { ...question, id: `import-${fila}` },
        comparisonQuestions
      ),
    });
  }

  return {
    codigo,
    versionName,
    errors,
    detected: parsed.detected,
    validQuestions: validQuestions.map(({ question }) => question),
    validCount: validQuestions.length,
    previewQuestions,
    duplicates,
  };
};

const reportError = (res, error, message = 'No fue posible procesar la solicitud.') => {
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ya existe una versión con ese nombre u orden de pregunta duplicado.' });
  }
  if (error.code === '40001') {
    return res.status(409).json({ error: 'El banco de origen cambió durante la operación; vuelve a intentarlo.' });
  }
  if (error.code === '23503') {
    return res.status(409).json({ error: 'Una referencia editorial ya no existe o no corresponde a esta versión.' });
  }
  if (error.code === '23514' || error.code === '55000') {
    return res.status(409).json({ error: 'La operación no cumple las restricciones editoriales de la versión.' });
  }
  console.error('Pilot editorial error:', error.code || error.name || 'UnknownError');
  return res.status(500).json({ error: message });
};

const loadQuestionSnapshot = async (client, versionId, questionId, lock = false) => {
  const { rows } = await client.query(
    `SELECT q.id, q.version_id, q.source_question_id, q.orden, q.categoria,
            q.evidencia, q.enunciado, q.clave, q.justificacion, q.fuente_url,
            v.codigo, v.version, v.estado
     FROM md_pilot_editorial_questions q
     JOIN md_pilot_editorial_versions v ON v.id = q.version_id
     WHERE q.version_id = $1 AND q.id = $2
     ${lock ? 'FOR UPDATE OF q, v' : ''}`,
    [versionId, questionId]
  );
  if (!rows.length) return null;

  const { rows: options } = await client.query(
    `SELECT codigo, texto, retroalimentacion
     FROM md_pilot_editorial_options
     WHERE question_id = $1
     ORDER BY codigo`,
    [questionId]
  );
  const reviewQuestion = { ...rows[0], opciones: options };
  const { codigo, version, estado, ...question } = rows[0];
  return {
    ...question,
    opciones: options,
    observaciones_revision: questionReviewNotes(reviewQuestion),
    _version: { codigo, version, estado },
  };
};

const publicEditorialQuestion = (question) => {
  const { _version, ...details } = question;
  return { ...details, version: _version };
};

router.get('/import-template', async (req, res) => {
  try {
    const template = await buildTemplateBuffer();
    res.set('Content-Type', XLSX_MIME_TYPE);
    res.set('Content-Disposition', 'attachment; filename="plantilla-importacion-preguntas.xlsx"');
    res.set('Cache-Control', 'no-store');
    return res.send(template);
  } catch (error) {
    return reportError(res, error, 'No fue posible generar la plantilla XLSX.');
  }
});

router.post('/imports/preview', requireXlsxBody, async (req, res) => {
  try {
    const result = await validateImportRequest(req);
    const errors = [...result.errors];
    if (result.detected === 0 && !errors.length) {
      errors.push({ fila: null, mensaje: 'No se detectaron preguntas para importar.' });
    }

    let confirmationToken = null;
    if (!errors.length && result.validQuestions.length > 0) {
      confirmationToken = signImportPreview({
        userId: req.user.id,
        codigo: result.codigo,
        versionName: result.versionName,
        digest: digestQuestions(result.validQuestions),
        expiresAt: Date.now() + IMPORT_TOKEN_TTL_MS,
      });
    }

    return res.json({
      version: { codigo: result.codigo, nombre: result.versionName },
      preguntas_detectadas: result.detected,
      preguntas_validas: result.validQuestions.length,
      preguntas_con_errores: new Set(
        errors.filter((error) => Number.isInteger(error.fila) && error.fila >= 5).map((error) => error.fila)
      ).size,
      errores: errors,
      posibles_duplicados: result.duplicates,
      preguntas: result.previewQuestions,
      confirmable: Boolean(confirmationToken),
      confirmation_token: confirmationToken,
    });
  } catch (error) {
    return reportError(res, error);
  }
});

router.post('/imports/confirm', requireXlsxBody, async (req, res) => {
  let client;
  try {
    const result = await validateImportRequest(req);
    if (result.errors.length || result.validQuestions.length === 0) {
      return res.status(409).json({
        error: 'El archivo no supera la validación actual. Genera una nueva vista previa.',
        errores: result.errors,
      });
    }
    const token = req.get('X-Import-Token');
    const digest = digestQuestions(result.validQuestions);
    if (!verifyImportPreview(token, {
      userId: req.user.id,
      codigo: result.codigo,
      versionName: result.versionName,
      digest,
    })) {
      return res.status(409).json({
        error: 'La confirmación venció o el archivo, el examen o el nombre cambiaron. Vuelve a previsualizar.',
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const { rows: exams } = await client.query(
      `SELECT codigo, version
       FROM md_pilot_exams
       WHERE codigo = $1
       FOR SHARE`,
      [result.codigo]
    );
    if (!exams.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el examen de origen.' });
    }
    const sourceVersion = cleanString(exams[0].version, 80);
    if (!sourceVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El examen de origen no tiene una versión válida.' });
    }

    const { rows: categories } = await client.query(
      `SELECT DISTINCT categoria
       FROM md_pilot_questions
       WHERE codigo = $1 AND categoria IS NOT NULL AND length(btrim(categoria)) > 0`,
      [result.codigo]
    );
    const existingCategories = new Set(categories.map((row) => row.categoria));
    if (result.validQuestions.some((question) => !existingCategories.has(question.categoria))) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Las categorías del examen cambiaron desde la vista previa. Vuelve a validar el archivo.',
      });
    }

    const { rows: versions } = await client.query(
      `INSERT INTO md_pilot_editorial_versions
         (codigo, version, source_version, estado, creado_por)
       VALUES ($1, $2, $3, 'borrador', $4)
       RETURNING id, codigo, version, source_version, estado, creado_por, creado_en`,
      [result.codigo, result.versionName, sourceVersion, req.user.id]
    );
    const version = versions[0];
    const questions = result.validQuestions.map((question) => ({
      id: crypto.randomUUID(),
      ...question,
    }));

    await client.query(
      `INSERT INTO md_pilot_editorial_questions
         (id, version_id, source_question_id, orden, categoria, evidencia, enunciado,
          clave, justificacion, fuente_url)
       SELECT item.id, $1, NULL, item.orden, item.categoria, item.evidencia, item.enunciado,
              item.clave, item.justificacion, item.fuente_url
       FROM jsonb_to_recordset($2::jsonb) AS item(
         id uuid, orden integer, categoria text, evidencia text, enunciado text,
         clave text, justificacion text, fuente_url text
       )`,
      [version.id, JSON.stringify(questions)]
    );
    const optionRows = questions.flatMap((question) =>
      question.opciones.map((option) => ({ question_id: question.id, ...option }))
    );
    await client.query(
      `INSERT INTO md_pilot_editorial_options (question_id, codigo, texto, retroalimentacion)
       SELECT item.question_id, item.codigo, item.texto, item.retroalimentacion
       FROM jsonb_to_recordset($1::jsonb) AS item(
         question_id uuid, codigo text, texto text, retroalimentacion text
       )`,
      [JSON.stringify(optionRows)]
    );
    await client.query(
      `INSERT INTO md_pilot_editorial_audit
         (version_id, actor_user_id, accion, despues)
       VALUES ($1, $2, 'version_creada', $3::jsonb)`,
      [version.id, req.user.id, JSON.stringify({
        codigo: result.codigo,
        version: result.versionName,
        source_version: sourceVersion,
        total_preguntas: questions.length,
        origen: 'importacion_xlsx',
      })]
    );
    const auditRows = questions.map((question) => ({
      question_id: question.id,
      actor_user_id: req.user.id,
      despues: question,
    }));
    await client.query(
      `INSERT INTO md_pilot_editorial_audit
         (version_id, question_id, actor_user_id, accion, despues)
       SELECT $1, item.question_id, item.actor_user_id, 'pregunta_creada', item.despues
       FROM jsonb_to_recordset($2::jsonb) AS item(
         question_id uuid, actor_user_id integer, despues jsonb
       )`,
      [version.id, JSON.stringify(auditRows)]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      version: { ...version, total_preguntas: questions.length },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Pilot editorial import rollback error:', rollbackError.code || rollbackError.name);
      }
    }
    return reportError(res, error, 'No fue posible guardar el borrador importado.');
  } finally {
    if (client) client.release();
  }
});

router.get('/exams', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.codigo, e.titulo, e.version, e.estado, e.duracion_min,
              count(q.id)::INTEGER AS total_preguntas,
              coalesce(array_agg(DISTINCT q.categoria)
                FILTER (WHERE q.categoria IS NOT NULL AND length(btrim(q.categoria)) > 0),
                ARRAY[]::text[]) AS categorias
       FROM md_pilot_exams e
       LEFT JOIN md_pilot_questions q ON q.codigo = e.codigo
       GROUP BY e.codigo, e.titulo, e.version, e.estado, e.duracion_min
       ORDER BY e.titulo, e.codigo`
    );
    return res.json({ exams: rows });
  } catch (error) {
    return reportError(res, error);
  }
});

router.get('/versions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.codigo, e.titulo, v.version, v.source_version, v.estado,
              v.creado_por, u.nombre AS creado_por_nombre, v.creado_en, v.actualizado_en,
              count(q.id)::INTEGER AS total_preguntas
       FROM md_pilot_editorial_versions v
       JOIN md_pilot_exams e ON e.codigo = v.codigo
       LEFT JOIN users u ON u.id = v.creado_por
       LEFT JOIN md_pilot_editorial_questions q ON q.version_id = v.id
       WHERE ($1::text IS NULL OR v.codigo = $1)
       GROUP BY v.id, e.titulo, u.nombre
       ORDER BY v.creado_en DESC`,
      [req.query.codigo || null]
    );
    return res.json({ versions: rows });
  } catch (error) {
    return reportError(res, error);
  }
});

router.post('/versions', async (req, res) => {
  const codigo = cleanString(req.body && req.body.codigo, 120);
  const version = cleanString(req.body && req.body.version, 80);
  if (!codigo || !version) {
    return res.status(400).json({ error: 'Indica el código del examen y el nombre de la versión borrador.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const { rows: exams } = await client.query(
      `SELECT codigo, version
       FROM md_pilot_exams
       WHERE codigo = $1
       FOR SHARE`,
      [codigo]
    );
    if (!exams.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el examen solicitado.' });
    }
    const sourceVersion = cleanString(exams[0].version, 80);
    if (!sourceVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El examen de origen no tiene una versión válida para copiar.' });
    }

    const { rows: sourceQuestions } = await client.query(
      `SELECT q.id, q.orden, q.categoria, q.evidencia, q.enunciado, q.clave, q.justificacion,
              count(o.codigo)::INTEGER AS option_count,
              count(DISTINCT o.codigo)::INTEGER AS distinct_option_count,
              coalesce(bool_or(o.codigo = q.clave), false) AS key_exists,
              coalesce(bool_and(length(btrim(o.texto)) > 0), false) AS options_complete,
              count(DISTINCT lower(btrim(o.texto))) = 4 AS options_unique,
              coalesce(bool_and(o.codigo = ANY(ARRAY['A', 'B', 'C', 'D']::text[])), false)
                AS option_codes_valid
       FROM md_pilot_questions q
       LEFT JOIN md_pilot_options o ON o.question_id = q.id
       WHERE q.codigo = $1
       GROUP BY q.id
       ORDER BY q.orden`,
      [codigo]
    );
    const invalidQuestions = sourceQuestions
      .map((question) => {
        const missing = [];
        if (!cleanString(question.categoria, 100)) missing.push('categoria');
        if (!cleanString(question.evidencia, 5000)) missing.push('evidencia');
        if (!cleanString(question.enunciado, 12000)) missing.push('enunciado');
        if (!cleanString(question.justificacion, 10000)) missing.push('justificacion');
        if (
          Number(question.option_count) !== 4 ||
          Number(question.distinct_option_count) !== 4 ||
          !question.options_complete ||
          !question.options_unique ||
          !question.option_codes_valid ||
          !question.key_exists ||
          !OPTION_CODES.includes(question.clave)
        ) {
          missing.push('opciones_o_clave');
        }
        return missing.length
          ? { id: question.id, orden: question.orden, campos: missing }
          : null;
      })
      .filter(Boolean);
    if (sourceQuestions.length === 0 || invalidQuestions.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: sourceQuestions.length === 0
          ? 'El examen de origen no contiene preguntas para copiar.'
          : 'Hay preguntas del banco de origen que requieren revisión; no se completó el borrador.',
        preguntas_requieren_revision: invalidQuestions,
      });
    }

    const { rows: versions } = await client.query(
      `INSERT INTO md_pilot_editorial_versions
         (codigo, version, source_version, estado, creado_por)
       VALUES ($1, $2, $3, 'borrador', $4)
       RETURNING id, codigo, version, source_version, estado, creado_por, creado_en`,
      [codigo, version, sourceVersion, req.user.id]
    );
    const draft = versions[0];

    await client.query(
      `INSERT INTO md_pilot_editorial_questions
         (version_id, source_question_id, orden, categoria, evidencia, enunciado, clave, justificacion)
       SELECT $1, q.id, q.orden, q.categoria, q.evidencia, q.enunciado, q.clave, q.justificacion
       FROM md_pilot_questions q
       WHERE q.codigo = $2
       ORDER BY q.orden`,
      [draft.id, codigo]
    );
    await client.query(
      `INSERT INTO md_pilot_editorial_options (question_id, codigo, texto, retroalimentacion)
       SELECT editorial.id, source_option.codigo, source_option.texto,
              coalesce(source_option.retroalimentacion, '')
       FROM md_pilot_editorial_questions editorial
       JOIN md_pilot_options source_option ON source_option.question_id = editorial.source_question_id
       WHERE editorial.version_id = $1
       ORDER BY editorial.orden, source_option.codigo`,
      [draft.id]
    );
    await client.query(
      `INSERT INTO md_pilot_editorial_audit
         (version_id, actor_user_id, accion, despues)
       VALUES ($1, $2, 'version_creada', $3::jsonb)`,
      [draft.id, req.user.id, JSON.stringify({
        codigo,
        version: draft.version,
        source_version: draft.source_version,
        total_preguntas: sourceQuestions.length,
      })]
    );
    await client.query('COMMIT');
    return res.status(201).json({ version: { ...draft, total_preguntas: sourceQuestions.length } });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Pilot editorial rollback error:', rollbackError.code || rollbackError.name);
      }
    }
    return reportError(res, error);
  } finally {
    if (client) client.release();
  }
});

router.get('/versions/:versionId/questions', async (req, res) => {
  if (!isUuid(req.params.versionId)) {
    return res.status(400).json({ error: 'Identificador de versión inválido.' });
  }
  const category = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';
  const search = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 200) : '';
  try {
    const { rows } = await pool.query(
      `SELECT q.id, q.orden, q.categoria, q.enunciado, v.estado AS estado_version
       FROM md_pilot_editorial_questions q
       JOIN md_pilot_editorial_versions v ON v.id = q.version_id
       WHERE q.version_id = $1
       ORDER BY q.orden`,
      [req.params.versionId]
    );
    const reviewNotes = new Map(
      rows.map((question) => [question.id, questionReviewNotes(question, rows)])
    );
    const nextOrder = rows.reduce((maximum, question) => Math.max(maximum, Number(question.orden) || 0), 0) + 1;
    return res.json({
      siguiente_orden: nextOrder,
      questions: rows.filter((question) => {
        const matchesCategory = !category || question.categoria === category;
        const searchableText = `${question.enunciado} ${question.evidencia}`.toLocaleLowerCase('es');
        return matchesCategory && (!search || searchableText.includes(search.toLocaleLowerCase('es')));
      }).map((question) => ({
        ...question,
        estado_revision: question.estado_version === 'borrador' ? 'pendiente de revisión' : question.estado_version,
        observaciones_revision: reviewNotes.get(question.id),
      })),
    });
  } catch (error) {
    return reportError(res, error);
  }
});

router.post('/versions/:versionId/questions', async (req, res) => {
  const { versionId } = req.params;
  if (!isUuid(versionId)) {
    return res.status(400).json({ error: 'Identificador de versión inválido.' });
  }
  const validation = validateQuestionPayload(req.body || {});
  if (validation.error) return res.status(400).json({ error: validation.error });
  const question = validation.value;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { rows: versions } = await client.query(
      `SELECT id, codigo, estado
       FROM md_pilot_editorial_versions
       WHERE id = $1
       FOR UPDATE`,
      [versionId]
    );
    if (!versions.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró la versión editorial.' });
    }
    if (versions[0].estado !== 'borrador') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Solo se pueden añadir preguntas a una versión en borrador.' });
    }

    const { rows: categories } = await client.query(
      `SELECT DISTINCT categoria
       FROM md_pilot_questions
       WHERE codigo = $1 AND categoria IS NOT NULL AND length(btrim(categoria)) > 0`,
      [versions[0].codigo]
    );
    if (!categories.some((row) => row.categoria === question.categoria)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selecciona una categoría existente para este examen.' });
    }

    const { rows: createdQuestions } = await client.query(
      `INSERT INTO md_pilot_editorial_questions
         (version_id, source_question_id, orden, categoria, evidencia, enunciado, clave, justificacion, fuente_url)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        versionId,
        question.orden,
        question.categoria,
        question.evidencia,
        question.enunciado,
        question.clave,
        question.justificacion,
        question.fuente_url,
      ]
    );
    const questionId = createdQuestions[0].id;
    for (const option of question.opciones) {
      await client.query(
        `INSERT INTO md_pilot_editorial_options (question_id, codigo, texto, retroalimentacion)
         VALUES ($1, $2, $3, $4)`,
        [questionId, option.codigo, option.texto, option.retroalimentacion]
      );
    }
    await client.query(
      `INSERT INTO md_pilot_editorial_audit
         (version_id, question_id, actor_user_id, accion, despues)
       VALUES ($1, $2, $3, 'pregunta_creada', $4::jsonb)`,
      [versionId, questionId, req.user.id, JSON.stringify(question)]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      question: {
        id: questionId,
        version_id: versionId,
        source_question_id: null,
        ...question,
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Pilot editorial rollback error:', rollbackError.code || rollbackError.name);
      }
    }
    return reportError(res, error);
  } finally {
    if (client) client.release();
  }
});

router.get('/versions/:versionId/questions/:questionId', async (req, res) => {
  if (!isUuid(req.params.versionId) || !isUuid(req.params.questionId)) {
    return res.status(400).json({ error: 'Identificador de versión o pregunta inválido.' });
  }
  try {
    const question = await loadQuestionSnapshot(pool, req.params.versionId, req.params.questionId);
    if (!question) return res.status(404).json({ error: 'No se encontró la pregunta del borrador.' });
    return res.json({ question: publicEditorialQuestion(question) });
  } catch (error) {
    return reportError(res, error);
  }
});

router.put('/versions/:versionId/questions/:questionId', async (req, res) => {
  const { versionId, questionId } = req.params;
  if (!isUuid(versionId) || !isUuid(questionId)) {
    return res.status(400).json({ error: 'Identificador de versión o pregunta inválido.' });
  }

  const validation = validateQuestionPayload(req.body || {});
  if (validation.error) return res.status(400).json({ error: validation.error });
  const { orden, categoria, evidencia, enunciado, clave, justificacion, fuente_url, opciones } = validation.value;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const before = await loadQuestionSnapshot(client, versionId, questionId, true);
    if (!before) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró la pregunta del borrador.' });
    }
    if (before._version.estado !== 'borrador') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Solo se pueden editar preguntas de una versión en borrador.' });
    }

    const { rows: categories } = await client.query(
      `SELECT DISTINCT categoria
       FROM md_pilot_questions
       WHERE codigo = $1 AND categoria IS NOT NULL AND length(btrim(categoria)) > 0`,
      [before._version.codigo]
    );
    if (!categories.some((row) => row.categoria === categoria)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selecciona una categoría existente para este examen.' });
    }

    await client.query(
      `UPDATE md_pilot_editorial_questions
       SET orden = $1, categoria = $2, evidencia = $3, enunciado = $4,
           clave = $5, justificacion = $6, fuente_url = $7, actualizado_en = now()
       WHERE id = $8 AND version_id = $9`,
      [orden, categoria, evidencia, enunciado, clave, justificacion, fuente_url, questionId, versionId]
    );
    await client.query(
      'DELETE FROM md_pilot_editorial_options WHERE question_id = $1',
      [questionId]
    );
    for (const code of OPTION_CODES) {
      const option = opciones.find((item) => item.codigo === code);
      await client.query(
        `INSERT INTO md_pilot_editorial_options (question_id, codigo, texto, retroalimentacion)
         VALUES ($1, $2, $3, $4)`,
        [questionId, code, option.texto, option.retroalimentacion]
      );
    }

    const after = {
      orden,
      categoria,
      evidencia,
      enunciado,
      clave,
      justificacion,
      fuente_url,
      opciones,
    };
    await client.query(
      `INSERT INTO md_pilot_editorial_audit
         (version_id, question_id, actor_user_id, accion, antes, despues)
       VALUES ($1, $2, $3, 'pregunta_actualizada', $4::jsonb, $5::jsonb)`,
      [versionId, questionId, req.user.id, JSON.stringify({
        orden: before.orden,
        categoria: before.categoria,
        evidencia: before.evidencia,
        enunciado: before.enunciado,
        clave: before.clave,
        justificacion: before.justificacion,
        opciones: before.opciones,
      }), JSON.stringify(after)]
    );
    await client.query('COMMIT');
    return res.json({ question: { id: questionId, version_id: versionId, ...after } });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Pilot editorial rollback error:', rollbackError.code || rollbackError.name);
      }
    }
    return reportError(res, error);
  } finally {
    if (client) client.release();
  }
});

router.get('/versions/:versionId/questions/:questionId/history', async (req, res) => {
  const { versionId, questionId } = req.params;
  if (!isUuid(versionId) || !isUuid(questionId)) {
    return res.status(400).json({ error: 'Identificador de versión o pregunta inválido.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.accion, a.antes, a.despues, a.creado_en,
              u.id AS actor_user_id, u.nombre AS actor_nombre, u.email AS actor_email
       FROM md_pilot_editorial_audit a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.version_id = $1
         AND (a.question_id = $2 OR (a.question_id IS NULL AND a.accion = 'version_creada'))
       ORDER BY a.creado_en DESC, a.id DESC`,
      [versionId, questionId]
    );
    return res.json({ history: rows });
  } catch (error) {
    return reportError(res, error);
  }
});

module.exports = router;
