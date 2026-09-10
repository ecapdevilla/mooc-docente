const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (admin only)
 */
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre, email, telefono, departamento, rol, activo, fecha_registro FROM users ORDER BY fecha_registro DESC');
    res.json({ users: rows });
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user role (admin only)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { rol, activo } = req.body;
    const { rows } = await pool.query(
      'UPDATE users SET rol = COALESCE($1, rol), activo = COALESCE($2, activo) WHERE id = $3 RETURNING id, nombre, email, telefono, departamento, rol, activo',
      [rol, activo, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: rows[0], message: 'Usuario actualizado' });
  } catch (err) {
    console.error('❌ Error updating user:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;