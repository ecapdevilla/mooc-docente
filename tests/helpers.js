/**
 * Utilidades compartidas por las pruebas de API.
 * Usa supertest sobre la app de Express sin abrir puerto.
 */

const request = require('supertest');

const app = require('../src/server');
const { pool } = require('../src/config/database');

const api = request(app);

function uniqueEmail(prefix = 'prueba') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1000000)}@meritodocente.com`;
}

/**
 * Registra un usuario de prueba a través de la API real.
 */
async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'Agente12345';

  const payload = {
    nombre: overrides.nombre || 'Docente Prueba',
    email,
    password,
  };

  if (overrides.telefono) payload.telefono = overrides.telefono;

  const res = await api.post('/api/v1/auth/register').send(payload);

  return {
    email,
    password,
    res,
    token: res.body.token,
    user: res.body.user,
  };
}

async function deleteUser(email) {
  if (!email) return;
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}

async function closePool() {
  await pool.end();
}

module.exports = {
  api,
  pool,
  uniqueEmail,
  registerUser,
  deleteUser,
  closePool,
};
