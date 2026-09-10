const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

router.get('/health', async (req, res) => {
  const { rows } = await pool.query('SELECT 1');
  res.json({ status: 'ok', db: 'connected' });
});

module.exports = router;