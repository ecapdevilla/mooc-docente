/**
 * Punto de entrada serverless para desplegar la API en Vercel.
 *
 * Vercel enruta /api/(.*) hacia esta función (ver vercel.json).
 * src/server.js no abre puerto cuando se importa (require.main !== module),
 * por eso este archivo solo envuelve la aplicación Express.
 */

const app = require('../src/server');

module.exports = (req, res) => {
  const original = req.url || '/';

  // `/health` se sirve desde esta función (ver vercel.json) pero vive fuera de
  // `/api/v1`: si se normalizara como el resto, se convertiría en
  // `/api/v1/health` y respondería 404.
  const esRutaSalud = original === '/health' || original.startsWith('/health?');

  // Vercel puede entregar la ruta original (/api/v1/...) o una sin el prefijo
  // cuando aplica el rewrite. Normalizamos para que Express siempre la reconozca.
  if (!esRutaSalud && !original.startsWith('/api/v1')) {
    let tail = original.replace(/^\/api/, '').replace(/^\/index(\.js)?/, '');
    if (!tail.startsWith('/')) tail = `/${tail}`;
    req.url = tail === '/' ? '/api/v1' : `/api/v1${tail}`;
  }

  return app(req, res);
};
