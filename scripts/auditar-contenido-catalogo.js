/**
 * Auditoría del contenido académico del lote de catálogo.
 *
 * Lee la fuente real (`public/js/datos/modulos.js`, const MODULES; archivo de
 * datos que carga `indexInicial.html`) con el mismo parser que
 * `scripts/generar-carga-catalogo.js` y mide, lección por lección:
 * extensión, estructura (subtítulos, listas), referencias normativas y la
 * calidad del cuestionario (4 opciones, respuesta correcta, retroalimentación).
 *
 * No escribe nada ni modifica contenido: solo documenta qué está completo y
 * qué requiere revisión académica antes de publicar comercialmente.
 *
 * Uso:
 *   npm run contenido:catalogo
 *   npm run contenido:catalogo -- --json
 */

const {
  CATALOGO,
  extraerModulosSpa,
} = require('./generar-carga-catalogo');

const NORMATIVA = /\b(Ley|Decreto|Resoluci[oó]n|CONPES|Sentencia|Acuerdo)\s*\d/gi;
// Umbrales sobre el contenido que realmente se almacena (espacios colapsados,
// igual que la carga): 1000 caracteres equivalen a ~1200 en la fuente HTML.
const MINIMO_COMPLETO = { caracteres: 1000, items: 5, retroalimentacion: 80 };

const contar = (texto, patron) => (texto.match(patron) || []).length;
const sinEtiquetas = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function auditarLeccion(curso, leccion, modulosSpa) {
  const moduloSpa = modulosSpa.find((modulo) => modulo.title === curso.titulo);
  const leccionSpa = moduloSpa
    ? (moduloSpa.lessons || []).find((item) => item.title === leccion.titulo)
    : null;

  if (!leccionSpa || !leccionSpa.content || leccionSpa.content.trim() === '') {
    return {
      curso: curso.titulo,
      modulo: leccion.modulo,
      leccion: leccion.titulo,
      hallazgo: 'sin contenido en la SPA',
    };
  }

  const contenido = leccionSpa.content;
  const contenidoAlmacenado = contenido.replace(/\s+/g, ' ');
  const texto = sinEtiquetas(contenido);
  const quiz = leccionSpa.quiz || {};
  const opciones = quiz.options || [];
  const correcta = Number.isInteger(quiz.correct) ? String.fromCharCode(65 + quiz.correct) : null;

  const metricas = {
    curso: curso.titulo,
    modulo: leccion.modulo,
    leccion: leccion.titulo,
    caracteres: contenidoAlmacenado.length,
    caracteresFuente: contenido.length,
    palabras: texto.split(' ').filter(Boolean).length,
    subtitulos: contar(contenido, /<h[34][ >]/gi),
    items: contar(contenido, /<li[ >]/gi),
    negritas: contar(contenido, /<strong[ >]/gi),
    tablas: contar(contenido, /<table[ >]/gi),
    citasNormativas: (texto.match(NORMATIVA) || []).length,
    opciones: opciones.length,
    correcta,
    retroalimentacionOk: (quiz.feedbackOk || '').length,
    retroalimentacionKo: (quiz.feedbackKo || '').length,
  };

  metricas.completo =
    metricas.caracteres >= MINIMO_COMPLETO.caracteres &&
    metricas.items >= MINIMO_COMPLETO.items &&
    metricas.subtitulos >= 1 &&
    metricas.opciones === 4 &&
    metricas.correcta !== null &&
    metricas.retroalimentacionOk >= MINIMO_COMPLETO.retroalimentacion &&
    metricas.retroalimentacionKo >= MINIMO_COMPLETO.retroalimentacion;

  return metricas;
}

function main() {
  const comoJson = process.argv.includes('--json');
  const modulosSpa = extraerModulosSpa();
  const filas = CATALOGO.flatMap((curso) =>
    curso.lecciones.map((leccion) => auditarLeccion(curso, leccion, modulosSpa))
  );

  if (comoJson) {
    console.log(JSON.stringify({ minimo: MINIMO_COMPLETO, lecciones: filas }, null, 2));
  } else {
    console.table(
      filas.map((fila) => ({
        curso: fila.curso.slice(0, 30),
        leccion: fila.leccion.slice(0, 38),
        car: fila.caracteres,
        pal: fila.palabras,
        sub: fila.subtitulos,
        items: fila.items,
        norm: fila.citasNormativas,
        opc: fila.opciones,
        ok: fila.correcta,
        expOk: fila.retroalimentacionOk,
        expKo: fila.retroalimentacionKo,
        estado: fila.completo ? 'completo' : 'revisar',
      }))
    );

    const completas = filas.filter((fila) => fila.completo).length;
    const respuestas = filas.reduce(
      (acumulado, fila) => {
        acumulado[fila.correcta] = (acumulado[fila.correcta] || 0) + 1;
        return acumulado;
      },
      {}
    );

    console.log(`\nLecciones auditadas: ${filas.length}`);
    console.log(`Completas con el mínimo actual: ${completas}`);
    console.log(`Requieren revisión académica: ${filas.length - completas}`);
    console.log(`Distribución de respuestas correctas: ${JSON.stringify(respuestas)}`);

    if (Object.keys(respuestas).length === 1) {
      console.log(
        'AVISO: todas las respuestas correctas caen en la misma posición; conviene' +
          ' variar la posición antes de la revisión académica.'
      );
    }
  }

  const incompletas = filas.filter((fila) => !fila.completo);

  if (incompletas.length > 0 && !comoJson) {
    console.log('\nPendientes de revisión académica:');
    for (const fila of incompletas) {
      console.log(` - ${fila.curso} › ${fila.leccion} (${fila.caracteres} car.)`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { auditarLeccion, MINIMO_COMPLETO };
