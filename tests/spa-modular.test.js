/**
 * Contrato de la Etapa 1: el SPA está modularizado.
 *
 * `indexInicial.html` ya no contiene estilos ni lógica en línea: enlaza
 * `public/styles/app.css` y carga en orden los archivos de `public/js/`.
 * Esta suite protege ese contrato para que el HTML no vuelva a convertirse en
 * aplicación, hoja de estilos y fuente de datos al mismo tiempo. Desde la T2.5
 * también comprueba que no reaparezca el frontend duplicado (`index.html`,
 * `app.js`, `public/api-client.js`, `public/auth.js`) y que la CSP que declara
 * `vercel.json` sea la misma que sirve Express.
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
    expect(scriptsDelSpa.length).toBeGreaterThanOrEqual(18);
    expect(scriptsDelSpa[0]).toBe('/js/datos/modulos.js');
    expect(scriptsDelSpa[scriptsDelSpa.length - 1]).toBe('/js/principal.js');
    expect(scriptsDelSpa).toContain('/js/nucleo/acciones.js');
    expect(scriptsDelSpa).toContain('/js/nucleo/ruta.js');
    expect(scriptsDelSpa.indexOf('/js/nucleo/ruta.js')).toBeLessThan(
      scriptsDelSpa.indexOf('/js/principal.js')
    );

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

  test('el marcado no usa manejadores en línea y la CSP los bloquea', async () => {
    const res = await api.get('/');
    const csp = res.headers['content-security-policy'] || '';
    const manejadores = (HTML_SPA.match(/\son[a-z]+="/g) || []).length;

    // Contrato de la Etapa 2 (T2.1): sin atributos `on*` la directiva vuelve a
    // su valor seguro. Si el marcado reintroduce un `onclick`, esta prueba y la
    // de `spa-acciones.test.js` fallan antes de romper la interfaz publicada.
    expect(manejadores).toBe(0);
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).not.toContain("script-src-attr 'unsafe-inline'");
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

  test('T2.5 · el frontend duplicado ya no existe ni se publica', () => {
    ['index.html', 'app.js', 'public/api-client.js', 'public/auth.js'].forEach((relativo) => {
      expect(fs.existsSync(path.join(RAIZ, relativo))).toBe(false);
    });

    const referencias = [
      ...VERCEL.builds.map((build) => build.src),
      ...VERCEL.routes.map((ruta) => `${ruta.src} ${ruta.dest}`),
    ].join(' ');

    expect(referencias).not.toMatch(/index\.html|app\.js|api-client|auth\.js/);
  });

  test('la CSP del HTML estático es la misma que sirve Express', async () => {
    const cspDeVercel = (fuente) => {
      const entrada = VERCEL.headers.find((header) => header.source === fuente);
      const cabecera = (entrada ? entrada.headers : []).find(
        (header) => header.key === 'Content-Security-Policy'
      );

      return cabecera && cabecera.value;
    };

    // Production sirve el HTML desde la capa estática de Vercel, que no pasa por
    // Helmet. Sin esta cabecera, la CSP solo aplicaba a `npm run dev` y a la
    // función serverless. Comparar con Express evita que ambas capas se separen.
    const respuesta = await api.get('/');
    const cspExpress = respuesta.headers['content-security-policy'];

    expect(cspExpress).toContain("script-src-attr 'none'");
    expect(cspDeVercel('/')).toBe(cspExpress);
    expect(cspDeVercel('/indexInicial.html')).toBe(cspExpress);
  });
});
