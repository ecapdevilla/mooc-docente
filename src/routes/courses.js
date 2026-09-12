const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

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
       ORDER BY c.creado_en DESC`
    );
    res.json({ courses });
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
          `SELECT q.*,
           (SELECT json_agg(
                     json_build_object('id', qo.id, 'opcion', qo.opcion, 'es_correcta', qo.es_correcta, 'orden', qo.orden)
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

module.exports = router;