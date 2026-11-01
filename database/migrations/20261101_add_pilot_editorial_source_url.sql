BEGIN;

DO $preflight$
BEGIN
    IF to_regclass('public.md_pilot_editorial_questions') IS NULL THEN
        RAISE EXCEPTION 'No existe public.md_pilot_editorial_questions; instalar primero la migración editorial aprobada';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'md_pilot_editorial_questions'
          AND column_name = 'fuente_url'
    ) THEN
        RAISE EXCEPTION 'La columna fuente_url ya existe; detener y revisar el esquema antes de continuar';
    END IF;
END;
$preflight$;

ALTER TABLE public.md_pilot_editorial_questions
    ADD COLUMN fuente_url TEXT,
    ADD CONSTRAINT md_pilot_editorial_questions_source_url_length_check
        CHECK (fuente_url IS NULL OR length(btrim(fuente_url)) BETWEEN 1 AND 2048);

COMMIT;
