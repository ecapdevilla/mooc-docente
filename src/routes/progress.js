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
    const { lessonId } = req.params;
    const { usuarioId } = req.user;
    const { puntaje } = req.body || {};

    const { rows } = await pool.query(
      `SELECT id FROM lessons WHERE id = $1 AND activo = TRUE`,
      [lessonId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lección no encontrada' });
    }

    const result = await pool.query(
      `INSERT INTO user_progress (usuario_id, leccion_id, completada, fecha_completada, intentos, puntaje)
       VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP, 1, $3)
ON CONFLICT (usuario_id, leccion_id) 
        DO UPDATE SET completada = TRUE, fecha_completada = CURRENT_TIMESTAMP, intentos = user_progress.intentos + 1, puntaje = EXCLUDED.puntaje
       RETURNING *`,
      [usuarioId, lessonId, puntaje || 100]
    );

    // Calculate module progress
    const { rows: lessonData } = await pool.query(
      `SELECT modulo_id FROM lessons WHERE id = $1`,
      [lessonId]
    );
    const moduloId = lessonData[0].modulo_id;

    const { rows: progress } = await pool.query(
      `SELECT COUNT(*) as total FROM lessons l JOIN modules m ON l.modulo_id = m.id WHERE m.id = $1 AND l.activo = TRUE`,
      [moduloId]
    );
    const totalLessons = parseInt(progress[0].total);

    const { rows: completed } = await pool.query(
      `SELECT COUNT(*) as done FROM user_progress WHERE usuario_id = $1 AND leccion_id IN (SELECT id FROM lessons WHERE modulo_id = $2) AND completada = TRUE`,
      [usuarioId, moduloId]
    );
    const doneLessons = parseInt(completed[0].done);
    const moduleProgress = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;

    // Update enrollment progress
    await pool.query(
      `UPDATE enrollments SET progreso_total = (
        SELECT COALESCE(AVG(
          (SELECT COUNT(*) FROM user_progress WHERE usuario_id = $1 AND leccion_id IN (SELECT id FROM lessons WHERE modulo_id = m.id AND completada = TRUE))::decimal / 
          NULLIF((SELECT COUNT(*) FROM lessons l2 JOIN modules m2 ON l2.modulo_id = m2.id WHERE m2.id = m.id AND l2.activo = TRUE)::decimal, 0) * 100, 0
        ))
        FROM modules m WHERE m.curso_id = (SELECT curso_id FROM modules WHERE id = $2 LIMIT 1)
      ) WHERE usuario_id = $1 AND curso_id = (SELECT curso_id FROM modules WHERE id = $2 LIMIT 1)`,
      [usuarioId, moduloId]
    );

    // Check if all lessons completed (badge eligibility)
    const { rows: moduleData } = await pool.query(
      `SELECT m.id as modulo_id, m.badge_nombre, m.badge_icono, m.badge_color
       FROM modules m WHERE m.id = $1`,
      [moduloId]
    );

    let badgeEarned = null;
    if (moduleData.length > 0 && moduleProgress === 100) {
      const modData = moduleData[0];
      if (modData.badge_nombre) {
        const { rows: existingBadge } = await pool.query(
          `SELECT id FROM user_badges WHERE usuario_id = $1 AND badge_id = (SELECT id FROM badges WHERE modulo_id = $2 AND nombre = $3 LIMIT 1)`,
          [usuarioId, modData.modulo_id, modData.badge_nombre]
        );
        if (existingBadge.rows.length === 0) {
          const { rows: badge } = await pool.query(
            `INSERT INTO badges (modulo_id, nombre, icono, color) VALUES ($1, $2, $3, $4) 
             ON CONFLICT DO NOTHING 
             RETURNING id`,
            [modData.modulo_id, modData.badge_nombre, modData.badge_icono, modData.badge_color]
          );
          if (badge.rows.length > 0) {
            await pool.query(
              `INSERT INTO user_badges (usuario_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [usuarioId, badge.rows[0].id]
            );
            badgeEarned = { id: badge.rows[0].id, nombre: modData.badge_nombre, icono: modData.badge_icono, color: modData.badge_color };
          }
        }
      }
    }

    res.json({
      message: 'Lección completada',
      progress: { lessonDone: true, moduleProgress, badgeEarned },
    });
  } catch (err) {
    console.error('❌ Error completing lesson:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   GET /api/v1/progress
 * @desc    Get user progress overview
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows: userProgress } = await pool.query(
      `SELECT up.leccion_id, l.titulo as leccion_titulo, up.completada, up.fecha_completada, up.puntaje, l.modulo_id
       FROM user_progress up
       JOIN lessons l ON up.leccion_id = l.id
       WHERE up.usuario_id = $1
       ORDER BY up.fecha_completada DESC`,
      [req.user.id]
    );

    const { rows: modules } = await pool.query(
      `SELECT m.*, c.titulo as curso_titulo 
       FROM modules m 
       JOIN courses c ON m.curso_id = c.id 
       WHERE c.activo = TRUE 
       ORDER BY m.orden ASC`
    );

    const progressMap = {};
    userProgress.forEach(up => {
      if (!progressMap[up.leccion_id]) {
        progressMap[up.leccion_id] = up;
      }
    });

    const modulesWithProgress = modules.map(mod => {
      const modLessons = userProgress.filter(up => up.modulo_id === mod.id);
      const totalLessons = modLessons.length;
      const completedLessons = modLessons.filter(up => up.completada).length;
      const percent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const completed = percent === 100 && totalLessons > 0;
      return { ...mod, totalLessons, completedLessons, percent, completed };
    });

    const totalAllLessons = modulesWithProgress.reduce((acc, m) => acc + m.totalLessons, 0);
    const completedAllLessons = modulesWithProgress.reduce((acc, m) => acc + m.completedLessons, 0);
    const globalPercent = totalAllLessons ? Math.round((completedAllLessons / totalAllLessons) * 100) : 0;

    const { rows: badges } = await pool.query(
      `SELECT b.*, ub.fecha_obtencion 
       FROM user_badges ub 
       JOIN badges b ON ub.badge_id = b.id 
       WHERE ub.usuario_id = $1 
       ORDER BY ub.fecha_obtencion DESC`,
      [req.user.id]
    );

    res.json({
      globalProgress: globalPercent,
      modules: modulesWithProgress,
      badges,
      totalLessons: totalAllLessons,
      completedLessons: completedAllLessons,
    });
  } catch (err) {
    console.error('❌ Error fetching progress:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;