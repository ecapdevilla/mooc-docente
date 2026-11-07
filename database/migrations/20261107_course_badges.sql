-- Insignias de curso (aprobación del examen final).
--
-- Los badges existentes son por módulo (`badges.modulo_id`). Para la insignia de
-- "curso aprobado" que otorga el examen final se añade una columna opcional
-- `curso_id` y un índice único parcial para no duplicar la insignia del mismo
-- curso (los badges de módulo, con `curso_id` NULL, no se ven afectados).
--
-- Aditiva e idempotente: no altera los badges de módulo ya sembrados.
BEGIN;

ALTER TABLE badges
    ADD COLUMN IF NOT EXISTS curso_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_curso_nombre
    ON badges(curso_id, nombre)
    WHERE curso_id IS NOT NULL;

COMMENT ON COLUMN badges.curso_id IS
    'Curso evaluado cuando la insignia se otorga por aprobar el examen final; NULL en insignias de módulo.';

COMMIT;
