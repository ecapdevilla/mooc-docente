/**
 * Contrato de la Etapa 1: el SPA está modularizado.
 *
 * `indexInicial.html` ya no contiene estilos ni lógica en línea: enlaza
 * `public/styles/app.css` y carga en orden los archivos de `public/js/`.
 * Esta suite protege ese contrato para que el HTML no vuelva a convertirse en
 * aplicación, hoja de estilos y fuente de datos al mismo tiempo.
 */

const fs = require('fs');
const path = require('path');

const { api, closePool } = require('./helpers');
const { leerModulos } = require('./spa-dom');

const RAIZ = path.join(__dirname, '..');
const HTML_SPA = fs.readFileSync(path.join(RAIZ, 'indexInicial.html'), 'utf8');
const VERCEL = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));

const scriptsDelSpa = [...HTML_SPA.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(
  (coincidencia) => coincidencia[1]
);

afterAll(closePool);

describe('Etapa 1 · SPA modularizado', () => {
  test('el HTML no contiene estilos ni JavaScript de la aplicación en línea', () => {
    expect(HTML_SPA).not.toMatch(/<style[\s>]/i);
    expect(HTML_SPA).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(HTML_SPA).toContain('<link rel="stylesheet" href="/styles/app.css">');
    expect(HTML_SPA).not.toMatch(/<script[^>]*type="module"/i);
  });

  test('carga los archivos clásicos en el orden del pipeline', () => {
    expect(scriptsDelSpa.length).toBeGreaterThanOrEqual(16);
    expect(scriptsDelSpa[0]).toBe('/js/datos/modulos.js');
    expect(scriptsDelSpa[scriptsDelSpa.length - 1]).toBe('/js/principal.js');

    scriptsDelSpa.forEach((ruta) => {
      const archivo = path.join(RAIZ, 'public', ruta.replace(/^\//, ''));
      expect(fs.existsSync(archivo)).toBe(true);
      expect(fs.statSync(archivo).size).toBeGreaterThan(200);
    });
  });

  test('los módulos son scripts clásicos: sin export/import ni IIFE contenedor', () => {
    scriptsDelSpa.forEach((ruta) => {
      const codigo = fs.readFileSync(path.join(RAIZ, 'public', ruta.replace(/^\//, '')), 'utf8');
      expect(codigo).not.toMatch(/^\s*export\s/m);
      expect(codigo).not.toMatch(/^\s*import\s+[^(]/m);
    });

    const principal = fs.readFileSync(path.join(RAIZ, 'public', 'js', 'principal.js'), 'utf8');
    expect(principal).toMatch(/\(function init\(\)/);
  });

  test('la hoja de estilos conserva la identidad visual completa', () => {
    const css = fs.readFileSync(path.join(RAIZ, 'public', 'styles', 'app.css'), 'utf8');

    expect(css.length).toBeGreaterThan(90000);
    expect(css).toContain('--');
    expect(css.toLowerCase()).toContain('#14284b');
  });

  test('los datos del catálogo siguen siendo consumibles y consistentes', () => {
    const modulos = leerModulos();

    expect(Array.isArray(modulos)).toBe(true);
    expect(modulos.length).toBe(3);

    modulos.forEach((modulo) => {
      expect(typeof modulo.title).toBe('string');
      expect(modulo.lessons.length).toBeGreaterThan(0);

      modulo.lessons.forEach((leccion) => {
        const quiz = leccion.quiz || {};
        expect(Array.isArray(quiz.options)).toBe(true);
        expect(quiz.options.length).toBe(4);
        expect(Number.isInteger(quiz.correct)).toBe(true);
        expect(quiz.correct).toBeGreaterThanOrEqual(0);
        expect(quiz.correct).toBeLessThan(quiz.options.length);
      });
    });
  });

  test('la política CSP permite los manejadores en línea que aún usa el marcado', async () => {
    const res = await api.get('/');
    const csp = res.headers['content-security-policy'] || '';
    const manejadores = (HTML_SPA.match(/\son[a-z]+="/g) || []).length;

    // Contrato temporal de la Etapa 1: mientras el marcado use `onclick`/
    // `onsubmit`, la CSP servida por Express debe permitirlos o el SPA queda
    // inerte. La Etapa 2 los sustituye por delegación y vuelve a 'none'.
    expect(manejadores).toBeGreaterThan(0);
    expect(csp).toContain("script-src-attr 'unsafe-inline'");
  });

  test('Express sirve el HTML, la hoja de estilos y los módulos', async () => {
    const html = await api.get('/');
    const css = await api.get('/styles/app.css');
    const principal = await api.get('/js/principal.js');
    const datos = await api.get('/js/datos/modulos.js');

    expect(html.status).toBe(200);
    expect(html.text).toContain('/styles/app.css');

    expect(css.status).toBe(200);
    expect(css.headers['content-type']).toContain('text/css');

    expect(principal.status).toBe(200);
    expect(datos.status).toBe(200);
    expect(datos.text).toContain('const MODULES');
  });

  test('Vercel enruta los archivos estáticos antes del catch-all del SPA', () => {
    const rutas = VERCEL.routes.map((ruta) => ruta.src);
    const indiceJs = rutas.indexOf('/js/(.*)');
    const indiceEstilos = rutas.indexOf('/styles/(.*)');
    const indiceCatchAll = rutas.indexOf('/(.*)');

    expect(indiceJs).toBeGreaterThan(-1);
    expect(indiceEstilos).toBeGreaterThan(-1);
    expect(indiceCatchAll).toBeGreaterThan(indiceJs);
    expect(indiceCatchAll).toBeGreaterThan(indiceEstilos);

    const destinos = VERCEL.routes.filter((ruta) => /^\/(js|styles)\/\(\.\*\)$/.test(ruta.src));
    expect(destinos.map((ruta) => ruta.dest)).toEqual(
      expect.arrayContaining(['public/js/$1', 'public/styles/$1'])
    );

    const cacheables = VERCEL.headers.filter((header) => /^\/(js|styles)\/\(\.\*\)$/.test(header.source));
    expect(cacheables).toHaveLength(2);
  });
});
