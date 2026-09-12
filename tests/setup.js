/**
 * Configuración común de Jest.
 * Carga las variables de entorno antes de importar la aplicación.
 */
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});
