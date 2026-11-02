#!/usr/bin/env node
/**
 * Diagnóstico de solo lectura del catálogo académico.
 *
 * Uso:
 *   npm run diagnostico:catalogo -- --sql   # imprime las consultas, sin conectar
 *   npm run diagnostico:catalogo            # ejecuta las consultas y muestra JSON
 *
 * El script exige DATABASE_URL y aborta si alguna sentencia no es de lectura.
 * No ejecuta migraciones, seeds ni escrituras.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(
  __dirname,
  '..',
  'database',
  'diagnostics',
  '20261101_diagnostico_catalogo_solo_lectura.sql'
);

const PALABRAS_INICIALES_PERMITIDAS = ['select', 'with', 'show', 'explain'];

const PALABRAS_PROHIBIDAS = /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|merge|copy|vacuum|comment|reindex|cluster|call|do)\b/i;

/**
 * Indica si una sentencia SQL es de solo lectura.
 * Se usa como barrera antes de enviar cualquier consulta a la base.
 */
function esSoloLectura(sql) {
  const limpio = String(sql || '')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim();

  if (!limpio) return false;

  const primera = limpio.split(/\s+/)[0].toLowerCase();

  if (!PALABRAS_INICIALES_PERMITIDAS.includes(primera)) return false;

  return !PALABRAS_PROHIBIDAS.test(limpio);
}

/**
 * Lee el archivo de diagnóstico y devuelve las sentencias normalizadas.
 */
function obtenerConsultas() {
  const contenido = fs.readFileSync(SQL_PATH, 'utf8');

  return contenido
    .split(/;\s*(?:\r?\n|$)/)
    .map((sentencia) => sentencia.trim())
    .filter((sentencia) => sentencia && !/^--\s*$/.test(sentencia))
    .map((sentencia) => `${sentencia};`);
}

async function ejecutar() {
  const consultas = obtenerConsultas();

  if (process.argv.includes('--sql')) {
    consultas.forEach((consulta, indice) => {
      console.log(`-- Consulta ${indice + 1}\n${consulta}\n`);
    });
    return 0;
  }

  const inseguras = consultas
    .map((consulta, indice) => ({ consulta, indice }))
    .filter(({ consulta }) => !esSoloLectura(consulta));

  if (inseguras.length > 0) {
    console.error(
      '❌ Se abortó el diagnóstico: hay sentencias que no son de solo lectura.',
      inseguras.map(({ indice }) => indice + 1)
    );
    return 1;
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      '❌ DATABASE_URL no está definida. Copia .env.example a .env o ejecuta el SQL con --sql en el editor de Supabase.'
    );
    return 1;
  }

  const { pool } = require('../src/config/database');
  const resultados = [];

  try {
    for (const [indice, consulta] of consultas.entries()) {
      try {
        const { rows } = await pool.query(consulta);
        resultados.push({ consulta: indice + 1, filas: rows });
      } catch (err) {
        resultados.push({ consulta: indice + 1, error: err.message });
      }
    }

    console.log(JSON.stringify({ consultas: resultados.length, resultados }, null, 2));
    return 0;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  ejecutar()
    .then((codigo) => {
      process.exitCode = codigo;
    })
    .catch((err) => {
      console.error('❌ Error ejecutando el diagnóstico:', err.message);
      process.exitCode = 1;
    });
}

module.exports = {
  SQL_PATH,
  esSoloLectura,
  obtenerConsultas,
};
