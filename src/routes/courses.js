const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const {
  ALCANCE_EVALUACION,
  ErrorEvaluacion,
  calificar,
  cargarFilasCurso,
  construirPreguntas,
  estadoRequisitos,
  evaluacionDisponible,
  preguntasPublicas,
  umbralAprobacion,
} = require('../services/courseAssessment');

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/** Curso activo por id, o null si no existe. */
async function buscarCurso(queryable, cursoId) {
  const { rows } = await queryable.query(
    `SELECT id, titulo, area
       FROM courses
      WHERE id = $1 AND activo = TRUE`,
    [cursoId]
  );

  return rows[0] || null;
}

/**
 * @route   GET /api/v1/courses
 * @desc    Get all active courses
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { rows: courses } = await pool.query(
      `SELECT c.*, 
       (SELECT COUNT(*) FROM modules m WHERE m.curso_id = c.id AND m.activo = TRUE) as modulo_count,
       (SELECT COUNT(*) FROM modules m JOIN lessons l ON l.modulo_id = m.id WHERE m.curso_id = c.id AND l.activo = TRUE) as lesson_count
       FROM courses c 
       WHERE c.activo = TRUE 
      ORDER BY c.id ASC`
    );

    // Contadores de catálogo: permiten distinguir "sin cursos" de "todos
    // inactivos" sin acceso directo a la base de datos.
    const { rows: totals } = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE activo = TRUE)::int AS activos
       FROM courses`
    );

    res.json({
      courses,
      meta: {
        totalCursos: totals[0] ? totals[0].total : 0,
        cursosActivos: totals[0] ? totals[0].activos : 0
      }
    });
  } catch (err) {
    console.error('❌ Error fetching courses:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   GET /api/v1/courses/:id
 * @desc    Get single course with modules and lessons
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { rows: courses } = await pool.query(
      `SELECT * FROM courses WHERE id = $1 AND activo = TRUE`,
      [req.params.id]
    );
    if (courses.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    const course = courses[0];

    const { rows: modules } = await pool.query(
      `SELECT * FROM modules WHERE curso_id = $1 AND activo = TRUE ORDER BY orden ASC`,
      [course.id]
    );

    const courseWithModules = { ...course, modulos: [] };

    for (const mod of modules) {
      const { rows: lessons } = await pool.query(
        `SELECT * FROM lessons WHERE modulo_id = $1 AND activo = TRUE ORDER BY orden ASC`,
        [mod.id]
      );

      const lessonsWithQuiz = [];
      for (const lesson of lessons) {
        const { rows: quizzes } = await pool.query(
          `SELECT q.id, q.pregunta,
           (SELECT json_agg(
                     json_build_object('id', qo.id, 'opcion', qo.opcion, 'orden', qo.orden)
                     ORDER BY qo.orden
                   )
            FROM quiz_options qo
            WHERE qo.quiz_id = q.id) as opciones
           FROM quizzes q
           WHERE q.leccion_id = $1
           ORDER BY q.id`,
          [lesson.id]
        );
        lessonsWithQuiz.push({ ...lesson, quizzes });
      }

      courseWithModules.modulos.push({ ...mod, lecciones: lessonsWithQuiz });
    }

    res.json({ course: courseWithModules });
  } catch (err) {
    console.error('❌ Error fetching course:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   GET /api/v1/courses/:id/assessment
 * @desc    Examen final del curso: preguntas sin respuestas correctas
 * @access  Private
 */
router.get('/:id/assessment', authenticate, async (req, res) => {
  const cursoId = parsePositiveInt(req.params.id);

  if (!cursoId) {
    return res.status(400).json({ error: 'Identificador de curso inválido' });
  }

  try {
    const curso = await buscarCurso(pool, cursoId);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    if (!(await evaluacionDisponible(pool))) {
      return res.status(503).json({
        error: 'La evaluación final todavía no está habilitada en este entorno',
      });
    }

    const preguntas = construirPreguntas(await cargarFilasCurso(pool, cursoId));

    if (preguntas.length === 0) {
      return res.status(409).json({
        error: 'El curso todavía no tiene preguntas para la evaluación final',
      });
    }

    const requisitos = await estadoRequisitos(pool, req.user.id, cursoId);

    const { rows: historial } = await pool.query(
      `SELECT id, puntaje, aciertos, total_preguntas, aprobado, finalizado_en
         FROM quiz_attempts
        WHERE usuario_id = $1
          AND curso_id = $2
          AND alcance = $3
        ORDER BY finalizado_en DESC NULLS LAST, id DESC
        LIMIT 5`,
      [req.user.id, cursoId, ALCANCE_EVALUACION]
    );

    return res.json({
      assessment: {
        cursoId: curso.id,
        titulo: curso.titulo,
        area: curso.area,
        umbralAprobacion: umbralAprobacion(),
        totalPreguntas: preguntas.length,
        preguntas: preguntasPublicas(preguntas),
        requisitos,
        historial: historial.map((intento) => ({
          id: intento.id,
          puntaje: intento.puntaje === null ? null : Number(intento.puntaje),
          aciertos: intento.aciertos,
          totalPreguntas: intento.total_preguntas,
          aprobado: intento.aprobado,
          finalizadoEn: intento.finalizado_en,
        })),
      },
    });
  } catch (err) {
    console.error('❌ Error fetching course assessment:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   POST /api/v1/courses/:id/assessment/attempts
 * @desc    Califica el examen final en el servidor y guarda el intento
 * @access  Private
 */
router.post('/:id/assessment/attempts', authenticate, async (req, res) => {
  const cursoId = parsePositiveInt(req.params.id);

  if (!cursoId) {
    return res.status(400).json({ error: 'Identificador de curso inválido' });
  }

  const respuestas = req.body && req.body.answers;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const curso = await buscarCurso(client, cursoId);

    if (!curso) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    if (!(await evaluacionDisponible(client))) {
      await client.query('ROLLBACK');
      return res.status(503).json({
        error: 'La evaluación final todavía no está habilitada en este entorno',
      });
    }

    const preguntas = construirPreguntas(await cargarFilasCurso(client, cursoId));

    if (preguntas.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El curso todavía no tiene preguntas para la evaluación final',
      });
    }

    const requisitos = await estadoRequisitos(client, req.user.id, cursoId);

    if (!requisitos.habilitada) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'Completa las lecciones del curso antes de presentar la evaluación final',
        requisitos,
      });
    }

    const resultado = calificar(preguntas, respuestas);

    const { rows: intentos } = await client.query(
      `INSERT INTO quiz_attempts
         (usuario_id, curso_id, alcance, estado, finalizado_en, puntaje, aciertos, total_preguntas, aprobado)
       VALUES ($1, $2, $3, 'finalizado', CURRENT_TIMESTAMP, $4, $5, $6, $7)
       RETURNING id, estado, iniciado_en, finalizado_en, puntaje, aciertos, total_preguntas, aprobado`,
      [
        req.user.id,
        cursoId,
        ALCANCE_EVALUACION,
        resultado.puntaje,
        resultado.aciertos,
        resultado.totalPreguntas,
        resultado.aprobado,
      ]
    );

    for (const respuesta of resultado.graded) {
      await client.query(
        `INSERT INTO quiz_attempt_answers
           (intento_id, quiz_id, opcion_id, respuesta_correcta, pregunta_snapshot, opcion_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          intentos[0].id,
          respuesta.questionId,
          respuesta.selectedOptionId,
          respuesta.correct,
          respuesta.questionText,
          respuesta.selectedText,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      attempt: {
        id: intentos[0].id,
        estado: intentos[0].estado,
        iniciadoEn: intentos[0].iniciado_en,
        finalizadoEn: intentos[0].finalizado_en,
        puntaje: Number(intentos[0].puntaje),
        aciertos: intentos[0].aciertos,
        totalPreguntas: intentos[0].total_preguntas,
        aprobado: resultado.aprobado,
        umbralAprobacion: resultado.umbral,
      },
      results: resultado.graded.map((respuesta) => ({
        questionId: respuesta.questionId,
        correct: respuesta.correct,
        correctOptionId: respuesta.correctOptionId,
        explanation: respuesta.explanation,
        topic: respuesta.topic,
        area: respuesta.area,
      })),
      porLeccion: resultado.porLeccion,
      areasPrioritarias: resultado.areasPrioritarias,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    if (err instanceof ErrorEvaluacion) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    console.error('❌ Error grading course assessment:', err);
    return res.status(500).json({ error: 'No fue posible calificar la evaluación final' });
  } finally {
    client.release();
  }
});

module.exports = router;
