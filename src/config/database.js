require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, '\n');
const isSupabase = databaseUrl
  ? /aws-[a-z0-9-]+\.pooler\.supabase\.com/.test(databaseUrl)
  : false;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not defined. Check .env file.');
  process.exit(1);
}

const useSsl = isProduction || isSupabase || Boolean(sslCa);
let connectionString = databaseUrl;

if (useSsl) {
  const parsedUrl = new URL(databaseUrl);
  const sslParameters = new Set(['sslmode', 'sslcert', 'sslkey', 'sslrootcert']);
  for (const parameter of [...parsedUrl.searchParams.keys()]) {
    if (sslParameters.has(parameter.toLowerCase())) {
      parsedUrl.searchParams.delete(parameter);
    }
  }
  connectionString = parsedUrl.toString();
}

const pool = new Pool({
  connectionString,
  // En serverless (Vercel) cada instancia abre su propio pool: conviene
  // limitarlo para no agotar las conexiones del pooler de Supabase.
  max: isProduction ? 3 : 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ...(useSsl && {
    ssl: {
      rejectUnauthorized: true,
      ...(sslCa && { ca: sslCa }),
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