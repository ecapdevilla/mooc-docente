require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

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
  ...(isProduction && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
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