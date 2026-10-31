require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const isSupabase = databaseUrl
  ? /aws-[a-z0-9-]+\.pooler\.supabase\.com/.test(databaseUrl)
  : false;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not defined. Check .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  // En serverless (Vercel) cada instancia abre su propio pool: conviene
  // limitarlo para no agotar las conexiones del pooler de Supabase.
  max: isProduction ? 3 : 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ...((isProduction || isSupabase) && {
    ssl: {
      rejectUnauthorized: true,
    },
  }),
});

pool.on('connect', () => {
  console.log('📊 Database connected');
});

pool.on('error', (err) => {
  console.error('📊 Database error:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};