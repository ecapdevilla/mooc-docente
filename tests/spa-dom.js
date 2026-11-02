/**
 * Utilidades compartidas por las pruebas de interfaz del SPA.
 *
 * Desde la Etapa 1 el SPA no es un archivo autocontenido: `indexInicial.html`
 * enlaza `public/styles/app.css` y carga 17 archivos clásicos de
 * `public/js/`. jsdom no descarga recursos por sí solo, así que aquí se
 * resuelve cada `/js/...` y `/styles/...` desde el disco con un
 * `ResourceLoader`. Así las pruebas ejecutan exactamente los archivos que
 * sirve Express y no una copia.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM, ResourceLoader } = require('jsdom');

const RAIZ = path.join(__dirname, '..');
const RUTA_HTML = path.join(RAIZ, 'indexInicial.html');
const RUTA_DATOS = path.join(RAIZ, 'public', 'js', 'datos', 'modulos.js');
const RUTA_CSS = path.join(RAIZ, 'public', 'styles', 'app.css');

const HTML_SPA = fs.readFileSync(RUTA_HTML, 'utf8');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sirve desde disco los recursos locales del SPA. Cualquier otro recurso
 * (CDN de fuentes o iconos) se omite: las pruebas no dependen de red.
 * jsdom exige que `fetch` devuelva una promesa (o `null` para no cargar).
 */
class CargadorLocal extends ResourceLoader {
  fetch(url) {
    let ruta;
    try {
      ruta = new URL(url).pathname;
    } catch (error) {
      return null;
    }

    const esPublico =
      /^\/(js|styles)\//.test(ruta) ||
      /^\/(api-client|auth|diagnosticoPiloto)\.(js|css)$/.test(ruta);

    if (!esPublico) return null;

    const archivo = path.join(RAIZ, 'public', ruta.replace(/^\//, ''));

    if (!fs.existsSync(archivo)) {
      return Promise.reject(new Error(`Recurso del SPA no encontrado: ${ruta}`));
    }

    return Promise.resolve(fs.readFileSync(archivo));
  }
}

/**
 * Lee `MODULES` del archivo de datos sin ejecutar la aplicación: el literal se
 * evalúa en un contexto vacío, igual que en `scripts/generar-carga-catalogo.js`.
 */
function leerModulos() {
  const fuente = fs.readFileSync(RUTA_DATOS, 'utf8');
  return vm.runInNewContext(`${fuente}\nMODULES`, {}, { timeout: 5000 });
}

/** Espera a que el arranque del SPA haya definido los manejadores de sesión. */
async function esperarListo(window, timeout = 10000) {
  const inicio = Date.now();

  while (typeof window.handleRegister !== 'function') {
    if (Date.now() - inicio > timeout) {
      throw new Error('El SPA no terminó de cargar: revisa los archivos de public/js.');
    }
    await esperar(10);
  }
}

/**
 * Carga el SPA real en jsdom y espera su inicialización.
 * Devuelve el `JSDOM` completo para poder usar `dom.window` y cerrarlo.
 */
async function cargarSpa({ url = 'http://localhost/', beforeParse, html = HTML_SPA, timeout = 10000 } = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url,
    resources: new CargadorLocal(),
    beforeParse(win) {
      // jsdom no implementa alert/confirm/scroll ni carga imágenes
      win.alert = () => {};
      win.confirm = () => true;
      win.scrollTo = () => {};
      win.Element.prototype.scrollIntoView = () => {};

      if (beforeParse) beforeParse(win);
    },
  });

  await esperarListo(dom.window, timeout);
  return dom;
}

module.exports = {
  RAIZ,
  RUTA_HTML,
  RUTA_DATOS,
  RUTA_CSS,
  HTML_SPA,
  esperar,
  leerModulos,
  esperarListo,
  cargarSpa,
};
