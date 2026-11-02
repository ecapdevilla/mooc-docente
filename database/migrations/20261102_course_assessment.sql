-- Evaluación final por curso (migración aditiva y reversible).
--
-- Objetivo: asociar los intentos de examen final a un curso y guardar el
-- veredicto calculado en el servidor, sin tocar los intentos de diagnóstico
-- ya registrados ni el esquema de preguntas.
-- NO ejecutar en Production sin seguir docs/calificacion-segura-cuestionarios.md.
BEGIN;

ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS curso_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS alcance VARCHAR(20) NOT NULL DEFAULT 'diagnostico';

ALTER TABLE quiz_attempts
    ADD COLUMN IF NOT EXISTS aprobado BOOLEAN;

ALTER TABLE quiz_attempts
    DROP CONSTRAINT IF EXISTS quiz_attempts_alcance_check;

ALTER TABLE quiz_attempts
    ADD CONSTRAINT quiz_attempts_alcance_check
    CHECK (alcance IN ('diagnostico', 'evaluacion_curso'));

COMMENT ON COLUMN quiz_attempts.curso_id IS
    'Curso evaluado cuando alcance = evaluacion_curso; NULL en el simulacro de diagnóstico.';

COMMENT ON COLUMN quiz_attempts.alcance IS
    'Origen del intento: diagnostico (simulacro post-login) o evaluacion_curso (examen final del curso).';

COMMENT ON COLUMN quiz_attempts.aprobado IS
    'Veredicto del examen final calculado en el servidor con el umbral vigente; NULL en diagnóstico.';

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_usuario_curso
    ON quiz_attempts(usuario_id, curso_id)
    WHERE curso_id IS NOT NULL;

COMMIT;
