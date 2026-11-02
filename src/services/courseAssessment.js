/**
 * Reglas compartidas para la evaluación final de un curso (T2.4).
 *
 * El navegador nunca calcula el resultado: solo envía qué opción eligió para
 * cada pregunta. El servidor valida pertenencia, califica contra
 * `quiz_options.es_correcta`, deriva el veredicto con el umbral vigente y
 * persiste el intento con un snapshot de la pregunta y la opción.
 *
 * Umbral: `COURSE_ASSESSMENT_PASSING_SCORE` (porcentaje 0-100; por defecto 80).
 * Requisito de lecciones: `COURSE_ASSESSMENT_REQUIRES_LESSONS=true` exige haber
 * completado todas las lecciones del curso antes de calificar (por defecto no).
 */

const UMBRAL_APROBACION_POR_DEFECTO = 80;
const ALCANCE_EVALUACION = 'evaluacion_curso';

class ErrorEvaluacion extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Porcentaje mínimo de aciertos para aprobar. Se lee en cada solicitud para
 * que un cambio de configuración no requiera reiniciar el proceso.
 */
function umbralAprobacion() {
  const configurado = Number(process.env.COURSE_ASSESSMENT_PASSING_SCORE);
  if (!Number.isFinite(configurado) || configurado < 0 || configurado > 100) {
    return UMBRAL_APROBACION_POR_DEFECTO;
  }
  return configurado;
}

/** Indica si el curso exige lecciones completadas antes del examen final. */
function exigeLecciones() {
  return process.env.COURSE_ASSESSMENT_REQUIRES_LESSONS === 'true';
}

/**
 * Comprueba si la migración de evaluación por curso está aplicada. Evita
 * errores 500 cuando el código se despliega antes que la migración.
 */
async function evaluacionDisponible(queryable) {
  const { rows } = await queryable.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_name = 'quiz_attempts'
        AND column_name = 'curso_id'`
  );

  return rows.length > 0;
}

/**
 * Carga las preguntas del curso con sus opciones, sin filtrar por estado de
 * publicación (los quizzes del catálogo actual no lo registran).
 */
async function cargarFilasCurso(queryable, cursoId) {
  const { rows } = await queryable.query(
    `SELECT
       q.id AS quiz_id,
       q.pregunta,
       q.explicacion_correcta,
       q.explicacion_incorrecta,
       l.id AS leccion_id,
       l.titulo AS leccion,
       c.area,
       c.id AS curso_id,
       qo.id AS opcion_id,
       qo.opcion,
       qo.orden,
       qo.es_correcta
     FROM quizzes q
     JOIN lessons l ON l.id = q.leccion_id AND l.activo = TRUE
     JOIN modules m ON m.id = l.modulo_id AND m.activo = TRUE
     JOIN courses c ON c.id = m.curso_id AND c.activo = TRUE
     JOIN quiz_options qo ON qo.quiz_id = q.id
     WHERE c.id = $1
     ORDER BY q.id, qo.orden, qo.id`,
    [cursoId]
  );

  return rows;
}

/** Agrupa las filas planas en preguntas con sus opciones. */
function construirPreguntas(filas) {
  const preguntas = new Map();

  for (const fila of filas) {
    if (!preguntas.has(fila.quiz_id)) {
      preguntas.set(fila.quiz_id, {
        id: fila.quiz_id,
        pregunta: fila.pregunta,
        leccionId: fila.leccion_id,
        leccion: fila.leccion,
        area: fila.area,
        explicacionCorrecta: fila.explicacion_correcta,
        explicacionIncorrecta: fila.explicacion_incorrecta,
        opciones: [],
      });
    }

    preguntas.get(fila.quiz_id).opciones.push({
      id: fila.opcion_id,
      opcion: fila.opcion,
      orden: fila.orden,
      esCorrecta: fila.es_correcta === true,
    });
  }

  return [...preguntas.values()];
}

/** Proyección pública de una pregunta: nunca incluye la clave ni explicaciones. */
function preguntasPublicas(preguntas) {
  return preguntas.map((pregunta) => ({
    id: pregunta.id,
    pregunta: pregunta.pregunta,
    leccion: pregunta.leccion,
    area: pregunta.area,
    opciones: pregunta.opciones.map(({ id, opcion, orden }) => ({ id, opcion, orden })),
  }));
}

/**
 * Valida y califica las respuestas recibidas.
 * @throws {ErrorEvaluacion} 400 si el cuerpo es inconsistente, 409 si una
 * pregunta no tiene exactamente una respuesta correcta configurada.
 */
function calificar(preguntas, respuestas) {
  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    throw new ErrorEvaluacion(400, 'Debes enviar las respuestas del examen final.');
  }

  const enviadas = respuestas.map((respuesta) => ({
    questionId: Number(respuesta && respuesta.questionId),
    optionId: Number(respuesta && respuesta.optionId),
  }));

  const idsValidos = enviadas.every(
    (respuesta) => Number.isInteger(respuesta.questionId) && Number.isInteger(respuesta.optionId)
  );

  if (!idsValidos) {
    throw new ErrorEvaluacion(400, 'Cada respuesta debe indicar su pregunta y una opción válida.');
  }

  const unicas = new Set(enviadas.map((respuesta) => respuesta.questionId));
  const esperadas = new Set(preguntas.map((pregunta) => pregunta.id));

  if (
    unicas.size !== enviadas.length ||
    unicas.size !== esperadas.size ||
    [...esperadas].some((id) => !unicas.has(id))
  ) {
    throw new ErrorEvaluacion(400, 'Debes responder cada pregunta del examen una sola vez.');
  }

  const respuestaPorPregunta = new Map(
    enviadas.map((respuesta) => [respuesta.questionId, respuesta.optionId])
  );

  const graded = preguntas.map((pregunta) => {
    const opcionId = respuestaPorPregunta.get(pregunta.id);
    const seleccionada = pregunta.opciones.find((opcion) => opcion.id === opcionId);

    if (!seleccionada) {
      throw new ErrorEvaluacion(400, 'Una opción no pertenece a la pregunta indicada.');
    }

    const correctas = pregunta.opciones.filter((opcion) => opcion.esCorrecta);

    if (correctas.length !== 1) {
      throw new ErrorEvaluacion(409, 'Una pregunta no tiene una única respuesta correcta configurada.');
    }

    const correcto = seleccionada.esCorrecta === true;

    return {
      questionId: pregunta.id,
      questionText: pregunta.pregunta,
      selectedOptionId: seleccionada.id,
      selectedText: seleccionada.opcion,
      correctOptionId: correctas[0].id,
      correct: correcto,
      topic: pregunta.leccion,
      area: pregunta.area,
      explanation: correcto
        ? (pregunta.explicacionCorrecta || 'Respuesta correcta.')
        : (pregunta.explicacionIncorrecta || 'Revisa el contenido de la lección e inténtalo de nuevo.'),
    };
  });

  const aciertos = graded.filter((respuesta) => respuesta.correct).length;
  const totalPreguntas = graded.length;
  const puntaje = Math.round((aciertos / totalPreguntas) * 10000) / 100;
  const umbral = umbralAprobacion();

  return {
    graded,
    aciertos,
    totalPreguntas,
    puntaje,
    umbral,
    aprobado: puntaje >= umbral,
    porLeccion: agruparPorLeccion(graded),
    areasPrioritarias: areasPrioritarias(graded, umbral),
  };
}

/** Desempeño agrupado por lección (tema), ordenado de menor a mayor porcentaje. */
function agruparPorLeccion(graded) {
  const grupos = new Map();

  for (const respuesta of graded) {
    const clave = respuesta.topic || 'Sin tema';
    if (!grupos.has(clave)) grupos.set(clave, { leccion: clave, aciertos: 0, total: 0 });

    const grupo = grupos.get(clave);
    grupo.total += 1;
    if (respuesta.correct) grupo.aciertos += 1;
  }

  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      porcentaje: Math.round((grupo.aciertos / grupo.total) * 10000) / 100,
    }))
    .sort((a, b) => a.porcentaje - b.porcentaje);
}

/** Áreas cuyo desempeño queda por debajo del umbral de aprobación. */
function areasPrioritarias(graded, umbral) {
  const areas = new Map();

  for (const respuesta of graded) {
    const clave = respuesta.area || 'General';
    if (!areas.has(clave)) areas.set(clave, { area: clave, aciertos: 0, total: 0 });

    const grupo = areas.get(clave);
    grupo.total += 1;
    if (respuesta.correct) grupo.aciertos += 1;
  }

  return [...areas.values()]
    .map((grupo) => ({
      ...grupo,
      porcentaje: Math.round((grupo.aciertos / grupo.total) * 10000) / 100,
    }))
    .filter((grupo) => grupo.porcentaje < umbral)
    .sort((a, b) => a.porcentaje - b.porcentaje);
}

/** Cuenta lecciones activas del curso y cuántas completó la persona. */
async function estadoRequisitos(queryable, usuarioId, cursoId) {
  const { rows } = await queryable.query(
    `SELECT
       (SELECT COUNT(*)::int
          FROM lessons l
          JOIN modules m ON m.id = l.modulo_id
         WHERE m.curso_id = $2
           AND l.activo = TRUE
           AND m.activo = TRUE) AS lecciones_totales,
       (SELECT COUNT(*)::int
          FROM user_progress up
          JOIN lessons l ON l.id = up.leccion_id
          JOIN modules m ON m.id = l.modulo_id
         WHERE up.usuario_id = $1
           AND m.curso_id = $2
           AND up.completada = TRUE
           AND l.activo = TRUE
           AND m.activo = TRUE) AS lecciones_completadas`,
    [usuarioId, cursoId]
  );

  const fila = rows[0] || {};
  const leccionesTotales = Number(fila.lecciones_totales) || 0;
  const leccionesCompletadas = Number(fila.lecciones_completadas) || 0;
  const requeridas = exigeLecciones();

  return {
    leccionesTotales,
    leccionesCompletadas,
    exigeLecciones: requeridas,
    habilitada: !requeridas || leccionesCompletadas >= leccionesTotales,
  };
}

module.exports = {
  ALCANCE_EVALUACION,
  ErrorEvaluacion,
  UMBRAL_APROBACION_POR_DEFECTO,
  agruparPorLeccion,
  areasPrioritarias,
  calificar,
  cargarFilasCurso,
  construirPreguntas,
  estadoRequisitos,
  evaluacionDisponible,
  exigeLecciones,
  preguntasPublicas,
  umbralAprobacion,
};
