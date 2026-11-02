/**
 * Clasificación de errores HTTP relacionados con el cuerpo de la solicitud.
 *
 * `body-parser` marca un JSON malformado con `type = 'entity.parse.failed'` y
 * un `SyntaxError` que lleva el cuerpo recibido. En el runtime serverless de
 * Vercel el mismo caso llega con `status = 400` y sin `type`, por lo que la
 * detección no puede depender de una sola forma del error. Clasificar mal este
 * caso tiene dos consecuencias: el cliente recibe un mensaje genérico y, si se
 * registra el error completo, el cuerpo (con credenciales) acaba en los logs.
 */

const tienePropia = (objeto, clave) =>
  Boolean(objeto) && Object.prototype.hasOwnProperty.call(objeto, clave);

/**
 * @param {unknown} error Error recibido por el manejador global.
 * @param {boolean} [esPeticionJson] La petición declaraba `application/json`.
 * @returns {boolean} true si el fallo proviene de analizar el cuerpo JSON.
 */
function esCuerpoJsonInvalido(error, esPeticionJson = false) {
  if (!error || typeof error !== 'object') return false;

  if (error.type === 'entity.parse.failed' || error.type === 'entity.verify.failed') {
    return true;
  }

  const esErrorDeCliente = error.status === 400 || error.statusCode === 400;

  if (!esErrorDeCliente) return false;

  // `instanceof` falla cuando el SyntaxError se creó en otro contexto (por
  // ejemplo, dentro del bundle del runtime de Vercel), así que se compara el
  // nombre. `body` es la señal que adjunta body-parser al cuerpo rechazado.
  if (error.name === 'SyntaxError' || tienePropia(error, 'body')) return true;

  // Último recurso: en una petición JSON, un 400 que llega al manejador global
  // no puede venir de la lógica de negocio (esas validaciones responden sin
  // lanzar), así que corresponde al análisis del cuerpo. Es la forma que toma
  // el error cuando el runtime entrega el fallo del flujo de lectura.
  return esPeticionJson;
}

module.exports = { esCuerpoJsonInvalido };
