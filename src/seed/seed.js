#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function seedDatabase() {
  const client = await pool.connect();

  try {
    const sqlPath = path.join(__dirname, 'data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🌱 Starting database seed...');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Seed completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function runSeed() {
  try {
    await seedDatabase();
    process.exitCode = 0;
  } catch (err) {
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = {
  seedDatabase,
  runSeed
};