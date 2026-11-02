-- Calificación segura de cuestionarios de lección (apéndice histórico).
--
-- Migración aditiva y reversible: no altera ni elimina tablas existentes, no
-- modifica preguntas, opciones, intentos ni progreso histórico.
-- NO ejecutar en Production sin seguir docs/calificacion-segura-cuestionarios.md.
BEGIN;

CREATE TABLE IF NOT EXISTS lesson_quiz_responses (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leccion_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    opcion_id INTEGER REFERENCES quiz_options(id) ON DELETE SET NULL,
    respuesta_correcta BOOLEAN NOT NULL,
    pregunta_snapshot TEXT NOT NULL,
    opcion_snapshot TEXT NOT NULL,
    respondida_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE lesson_quiz_responses IS
    'Historial append-only de respuestas de cuestionarios de lección. El backend inserta una fila por envío; nunca actualiza ni elimina registros desde la API.';

COMMENT ON COLUMN lesson_quiz_responses.respuesta_correcta IS
    'Resultado calculado en el servidor con quiz_options.es_correcta; el cliente no puede enviarlo.';

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_responses_usuario_quiz
    ON lesson_quiz_responses(usuario_id, quiz_id);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_responses_usuario_leccion
    ON lesson_quiz_responses(usuario_id, leccion_id);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_responses_quiz
    ON lesson_quiz_responses(quiz_id);

COMMIT;
