#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '$') {
      let j = i + 1;
      let tag = '';
      while (j < sql.length && sql[j] !== '$' && sql[j] !== '\n') {
        tag += sql[j];
        j++;
      }
      if (sql[j] === '$') {
        const close = '$' + tag + '$';
        current += sql.substring(i, j);
        i = j;
        while (i < sql.length && !sql.startsWith(close, i)) {
          current += sql[i];
          i++;
        }
        if (i < sql.length) {
          current += sql.substring(i, i + close.length);
          i += close.length;
        }
      } else {
        current += '$';
      }
    } else if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        current += sql[i];
        i++;
      }
    } else if (sql[i] === '\'') {
      current += '\'';
      i++;
      while (i < sql.length) {
        if (sql[i] === '\'') {
          if (i + 1 < sql.length && sql[i + 1] === '\'') {
            current += '\'\'';
            i += 2;
            continue;
          }
          current += '\'';
          i++;
          break;
        }
        current += sql[i];
        i++;
      }
    } else if (sql[i] === ';') {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
      i++;
    } else {
      current += sql[i];
      i++;
    }
  }
  const stmt = current.trim();
  if (stmt) statements.push(stmt);
  return statements;
}

const runSeed = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'data.sql'), 'utf8');
    const statements = splitStatements(sql);
    console.log(`Total statements: ${statements.length}`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      try {
        await pool.query(stmt);
      } catch (err) {
        console.error(`❌ Statement ${i + 1} failed:`);
        console.error(stmt.substring(0, 500));
        console.error('---');
        throw err;
      }
    }
    console.log('✅ Seed completed successfully');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1)
  }
};

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runSeed };