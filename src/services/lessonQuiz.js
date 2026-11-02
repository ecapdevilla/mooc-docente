/**
 * Reglas compartidas para calificar cuestionarios de lección en el backend.
 *
 * El puntaje de una lección nunca se recibe del cliente: se deriva de las
 * respuestas registradas en `lesson_quiz_responses`, que solo escribe el
 * servidor después de validar la pregunta, la opción y la lección.
 */

const PUNTAJE_APROBACION = 100;
const TABLA_RESPUESTAS = 'lesson_quiz_responses';

/**
 * Comprueba si la migración de respuestas de lección está aplicada.
 * Evita errores 500 cuando el código se despliega antes que la migración.
 */
async function respuestasDisponibles(queryable) {
  const { rows } = await queryable.query(
    'SELECT to_regclass($1) AS tabla',
    [`public.${TABLA_RESPUESTAS}`]
  );

  return Boolean(rows[0] && rows[0].tabla);
}

/**
 * Calcula el dominio de una lección a partir de las respuestas registradas.
 * Una lección está dominada cuando todas sus preguntas se respondieron bien
 * al menos una vez.
 */
async function dominioLeccion(queryable, usuarioId, leccionId) {
  const { rows } = await queryable.query(
    `SELECT
       (SELECT COUNT(*)::int
          FROM quizzes q
         WHERE q.leccion_id = $2) AS total_quizzes,
       (SELECT COUNT(DISTINCT r.quiz_id)::int
          FROM lesson_quiz_responses r
          JOIN quizzes q ON q.id = r.quiz_id
         WHERE q.leccion_id = $2
           AND r.usuario_id = $1
           AND r.respuesta_correcta = TRUE) AS mastered_quizzes,
       (SELECT COUNT(*)::int
          FROM lesson_quiz_responses r
         WHERE r.usuario_id = $1
           AND r.leccion_id = $2) AS total_respuestas`,
    [usuarioId, leccionId]
  );

  const fila = rows[0] || {};
  const totalQuizzes = Number(fila.total_quizzes) || 0;
  const masteredQuizzes = Math.min(Number(fila.mastered_quizzes) || 0, totalQuizzes);

  return {
    totalQuizzes,
    masteredQuizzes,
    totalRespuestas: Number(fila.total_respuestas) || 0,
    dominada: totalQuizzes > 0 && masteredQuizzes === totalQuizzes,
  };
}

module.exports = {
  PUNTAJE_APROBACION,
  TABLA_RESPUESTAS,
  dominioLeccion,
  respuestasDisponibles,
};
