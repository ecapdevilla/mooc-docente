require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not defined. Check .env file.');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = /aws-[a-z0-9-]+\.pooler\.supabase\.com/.test(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: !!(isProduction || isSupabase),
  },
});

pool.on('connect', () => {
  console.log('📊 Database connected');
});

pool.on('error', (err) => {
  console.error('📊 Database error:', err);
  process.exit(-1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};