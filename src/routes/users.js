const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, telefono, departamento, rol, activo, foto_perfil, fecha_registro FROM users WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('❌ Error fetching profile:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { nombre, telefono, departamento } = req.body;
    const { rows } = await pool.query(
      'UPDATE users SET nombre = $1, telefono = $2, departamento = $3, actualizado_en = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, nombre, email, telefono, departamento, rol, activo, foto_perfil, fecha_registro',
      [nombre, telefono, departamento, req.user.id]
    );
    res.json({ user: rows[0], message: 'Perfil actualizado exitosamente' });
  } catch (err) {
    console.error('❌ Error updating profile:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   GET /api/v1/users/enrollments
 * @desc    Get user enrollments
 * @access  Private
 */
router.get('/enrollments', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, c.titulo, c.area, e.fecha_inscripcion, e.progreso_total 
       FROM enrollments e 
       JOIN courses c ON e.curso_id = c.id 
       WHERE e.usuario_id = $1 
       ORDER BY e.fecha_inscripcion DESC`,
      [req.user.id]
    );
    res.json({ enrollments: rows });
  } catch (err) {
    console.error('❌ Error fetching enrollments:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;