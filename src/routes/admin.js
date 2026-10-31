const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use('/database-identity', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.use(authenticate);
router.use(authorize('admin'));

router.get('/database-identity', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT current_user AS current_user, rolbypassrls, rolsuper
       FROM pg_roles
       WHERE rolname = current_user`
    );
    if (rows.length !== 1) {
      return res.status(500).json({ error: 'No fue posible verificar la identidad de la base de datos.' });
    }
    return res.json({
      current_user: rows[0].current_user,
      rolbypassrls: rows[0].rolbypassrls,
      rolsuper: rows[0].rolsuper,
    });
  } catch (error) {
    console.error('Database identity diagnostic failed.');
    return res.status(500).json({ error: 'No fue posible verificar la identidad de la base de datos.' });
  }
});

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