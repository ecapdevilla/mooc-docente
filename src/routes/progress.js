const express = require('express');
const router = express.Router();

const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateProgress } = require('../utils/validators');

/**
 * @route   POST /api/v1/progress/lesson/:lessonId
 * @desc    Complete a lesson
 * @access  Private
 */
router.post('/lesson/:lessonId', authenticate, async (req, res) => {
  try {
    const lessonId = Number(req.params.lessonId);
    const usuarioId = req.user.id;

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({
        error: 'Identificador de lección inválido'
      });
    }

    const validation = validateProgress(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        error: validation.error.details.map(d => d.message).join(', ')
      });
    }

    const puntaje =
      validation.value.puntaje !== undefined
        ? validation.value.puntaje
        : 100;

    // Verificar que la lección exista y esté activa
    const { rows: lessonRows } = await pool.query(
      `SELECT
         l.id,
         l.modulo_id,
         m.curso_id
       FROM lessons l
       JOIN modules m ON m.id = l.modulo_id
       JOIN courses c ON c.id = m.curso_id
       WHERE l.id = $1
         AND l.activo = TRUE
         AND m.activo = TRUE
         AND c.activo = TRUE`,
      [lessonId]
    );

    if (lessonRows.length === 0) {
      return res.status(404).json({
        error: 'Lección no encontrada'
      });
    }

    const lesson = lessonRows[0];
    const moduloId = lesson.modulo_id;
    const cursoId = lesson.curso_id;

    // Inscribir automáticamente al usuario en el curso
    // si aún no existe la inscripción.
    await pool.query(
      `INSERT INTO enrollments
         (usuario_id, curso_id, fecha_inscripcion)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (usuario_id, curso_id)
       DO NOTHING`,
      [usuarioId, cursoId]
    );

    // Crear o actualizar el progreso de la lección
    const { rows: progressRows } = await pool.query(
      `INSERT INTO user_progress
         (
           usuario_id,
           leccion_id,
           completada,
           fecha_completada,
           intentos,
           puntaje
         )
       VALUES (
         $1,
         $2,
         TRUE,
         CURRENT_TIMESTAMP,
         1,
         $3
       )
       ON CONFLICT (usuario_id, leccion_id)
       DO UPDATE SET
         completada = TRUE,
         fecha_completada = CURRENT_TIMESTAMP,
         intentos = user_progress.intentos + 1,
         puntaje = EXCLUDED.puntaje
       RETURNING *`,
      [usuarioId, lessonId, puntaje]
    );

    // Total de lecciones activas del módulo
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM lessons
       WHERE modulo_id = $1
         AND activo = TRUE`,
      [moduloId]
    );

    const totalLessons = totalRows[0].total;

    // Lecciones completadas por el usuario en ese módulo
    const { rows: completedRows } = await pool.query(
      `SELECT COUNT(*)::int AS completed
       FROM user_progress up
       JOIN lessons l
         ON l.id = up.leccion_id
       WHERE up.usuario_id = $1
         AND l.modulo_id = $2
         AND l.activo = TRUE
         AND up.completada = TRUE`,
      [usuarioId, moduloId]
    );

    const completedLessons = completedRows[0].completed;

    const moduleProgress =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    // Calcular progreso global del curso
    const { rows: courseProgressRows } = await pool.query(
      `SELECT
         COUNT(l.id)::int AS total_lessons,
         COUNT(
           CASE
             WHEN up.completada = TRUE THEN 1
           END
         )::int AS completed_lessons
       FROM modules m
       JOIN lessons l
         ON l.modulo_id = m.id
        AND l.activo = TRUE
       LEFT JOIN user_progress up
         ON up.leccion_id = l.id
        AND up.usuario_id = $1
       WHERE m.curso_id = $2
         AND m.activo = TRUE`,
      [usuarioId, cursoId]
    );

    const courseTotals = courseProgressRows[0];

    const courseProgress =
      courseTotals.total_lessons > 0
        ? Math.round(
            (courseTotals.completed_lessons /
              courseTotals.total_lessons) *
              100
          )
        : 0;

    await pool.query(
      `UPDATE enrollments
       SET progreso_total = $1
       WHERE usuario_id = $2
         AND curso_id = $3`,
      [courseProgress, usuarioId, cursoId]
    );

    // Revisar si el usuario ganó un badge
    let badgeEarned = null;

    if (moduleProgress === 100) {
      const { rows: moduleRows } = await pool.query(
        `SELECT
           id,
           badge_nombre,
           badge_icono,
           badge_color
         FROM modules
         WHERE id = $1`,
        [moduloId]
      );

      if (
        moduleRows.length > 0 &&
        moduleRows[0].badge_nombre
      ) {
        const moduleData = moduleRows[0];

        // Buscar badge existente
        let { rows: badgeRows } = await pool.query(
          `SELECT id
           FROM badges
           WHERE modulo_id = $1
             AND nombre = $2
           LIMIT 1`,
          [
            moduloId,
            moduleData.badge_nombre
          ]
        );

        // Crear badge si todavía no existe
        if (badgeRows.length === 0) {
          const created = await pool.query(
            `INSERT INTO badges
               (
                 modulo_id,
                 nombre,
                 descripcion,
                 icono,
                 color
               )
             VALUES (
               $1,
               $2,
               $3,
               $4,
               $5
             )
             RETURNING id`,
            [
              moduloId,
              moduleData.badge_nombre,
              `Badge obtenido al completar el módulo ${moduleData.badge_nombre}`,
              moduleData.badge_icono,
              moduleData.badge_color
            ]
          );

          badgeRows = created.rows;
        }

        const badgeId = badgeRows[0].id;

        const { rows: existingBadge } = await pool.query(
          `SELECT id
           FROM user_badges
           WHERE usuario_id = $1
             AND badge_id = $2`,
          [usuarioId, badgeId]
        );

        if (existingBadge.length === 0) {
          await pool.query(
            `INSERT INTO user_badges
               (usuario_id, badge_id)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id, badge_id)
             DO NOTHING`,
            [usuarioId, badgeId]
          );

          badgeEarned = {
            id: badgeId,
            nombre: moduleData.badge_nombre,
            icono: moduleData.badge_icono,
            color: moduleData.badge_color
          };
        }
      }
    }

    return res.json({
      message: 'Lección completada',
      progress: {
        lesson: progressRows[0],
        moduleProgress,
        courseProgress,
        badgeEarned
      }
    });

  } catch (err) {
    console.error(
      '❌ Error completing lesson:',
      err
    );

    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});


/**
 * @route   GET /api/v1/progress
 * @desc    Get user progress overview
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const usuarioId = req.user.id;

    /*
     * IMPORTANTE:
     * Las lecciones se consultan desde lessons,
     * no desde user_progress.
     *
     * Así un usuario nuevo ve todas las lecciones
     * disponibles aunque todavía no haya iniciado.
     */
    const { rows: modules } = await pool.query(
      `SELECT
         m.id,
         m.curso_id,
         m.titulo,
         m.descripcion,
         m.orden,
         m.badge_nombre,
         m.badge_icono,
         m.badge_color,
         m.activo,
         c.titulo AS curso_titulo,

         COUNT(l.id)::int AS total_lessons,

         COUNT(
           CASE
             WHEN up.completada = TRUE THEN 1
           END
         )::int AS completed_lessons,

         COALESCE(
           json_agg(
             json_build_object(
               'id', l.id,
               'modulo_id', l.modulo_id,
               'titulo', l.titulo,
               'orden', l.orden,
               'completada', COALESCE(up.completada, FALSE)
             )
             ORDER BY l.orden, l.id
           ) FILTER (WHERE l.id IS NOT NULL),
           '[]'
         ) AS lessons

       FROM modules m

       JOIN courses c
         ON c.id = m.curso_id

       LEFT JOIN lessons l
         ON l.modulo_id = m.id
        AND l.activo = TRUE

       LEFT JOIN user_progress up
         ON up.leccion_id = l.id
        AND up.usuario_id = $1

       WHERE
         m.activo = TRUE
         AND c.activo = TRUE

       GROUP BY
         m.id,
         c.titulo

       ORDER BY
         m.curso_id,
         m.orden`,
      [usuarioId]
    );

    const modulesWithProgress = modules.map(mod => {
      const totalLessons =
        Number(mod.total_lessons) || 0;

      const completedLessons =
        Number(mod.completed_lessons) || 0;

      const percent =
        totalLessons > 0
          ? Math.round(
              (completedLessons / totalLessons) * 100
            )
          : 0;

      return {
        ...mod,
        totalLessons,
        completedLessons,
        percent,
        completed:
          totalLessons > 0 &&
          completedLessons === totalLessons
      };
    });

    const totalLessons =
      modulesWithProgress.reduce(
        (total, mod) =>
          total + mod.totalLessons,
        0
      );

    const completedLessons =
      modulesWithProgress.reduce(
        (total, mod) =>
          total + mod.completedLessons,
        0
      );

    const globalProgress =
      totalLessons > 0
        ? Math.round(
            (completedLessons /
              totalLessons) *
              100
          )
        : 0;

    const { rows: badges } = await pool.query(
      `SELECT
         b.id,
         b.modulo_id,
         b.nombre,
         b.descripcion,
         b.icono,
         b.color,
         b.imagen,
         ub.fecha_obtencion
       FROM user_badges ub
       JOIN badges b
         ON b.id = ub.badge_id
       WHERE ub.usuario_id = $1
       ORDER BY ub.fecha_obtencion DESC`,
      [usuarioId]
    );

    return res.json({
      globalProgress,
      modules: modulesWithProgress,
      badges,
      totalLessons,
      completedLessons
    });

  } catch (err) {
    console.error(
      '❌ Error fetching progress:',
      err
    );

    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;