#!/usr/bin/env node
/**
 * Prepara la base apuntada por DATABASE_URL para desarrollo y pruebas.
 *
 * Aplica, en orden, el esquema canónico y las migraciones que dependen solo de
 * las tablas versionadas en el repositorio. Las migraciones del editor piloto
 * (`md_pilot_editorial_*`) requieren las tablas base `md_pilot_exams` y
 * `md_pilot_questions`, creadas directamente en Supabase y sin DDL en este
 * repositorio: se informan como omitidas en lugar de romper la preparación.
 *
 * Es idempotente: si los objetos ya existen se omiten. Después de ejecutarlo,
 * `npm run seed` carga los datos canónicos.
 *
 * Uso:
 *   npm run db:preparar
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/merito_test_local" npm run db:preparar
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const RAIZ = path.resolve(__dirname, '..');

const ARCHIVOS = [
  ['database/schema.sql', true],
  ['database/migrations/20261031_additive_integration.sql', true],
  ['database/migrations/20261031_pilot_editorial_drafts.sql', false],
  ['database/migrations/20261101_add_pilot_editorial_source_url.sql', false],
  ['database/migrations/20261101_lesson_quiz_responses.sql', true],
  ['database/migrations/20261102_course_assessment.sql', true],
  ['database/migrations/20261106_lessons_descripcion.sql', true],
  ['database/migrations/20261107_course_badges.sql', true],
];

// Códigos de "el objeto ya existe": repetir la preparación no es un error.
const YA_EXISTE = ['42P07', '42701', '42710', '42P16'];

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL. Copia .env.example a .env y ajusta la cadena.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let faltantes = 0;

  try {
    for (const [archivo, requerida] of ARCHIVOS) {
      const sql = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');

      try {
        await pool.query(sql);
        console.log('OK       ' + archivo);
      } catch (error) {
        if (YA_EXISTE.includes(error.code)) {
          console.log('YA EXISTE ' + archivo);
        } else if (!requerida) {
          console.log('OMITIDA  ' + archivo + ' :: ' + error.code + ' ' + error.message);
        } else {
          faltantes += 1;
          console.log('FALLA    ' + archivo + ' :: ' + error.code + ' ' + error.message);
        }
      }
    }
  } finally {
    await pool.end();
  }

  if (faltantes > 0) {
    console.error(`\n${faltantes} archivo(s) no se pudieron aplicar. Revisa DATABASE_URL y los permisos.`);
    process.exit(1);
  }

  console.log('\nBase preparada. Siguiente paso: npm run seed');
})();
