#!/usr/bin/env node
// Seed script to initialize database with test data
const { seedDatabase } = require('./src/seed/seed');

const runSeed = async () => {
  try {
    await seedDatabase();
    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };