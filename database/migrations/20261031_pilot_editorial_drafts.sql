BEGIN;

CREATE TABLE md_pilot_editorial_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL REFERENCES md_pilot_exams(codigo) ON DELETE RESTRICT,
    version TEXT NOT NULL,
    source_version TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador', 'revision')),
    creado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (codigo, version),
    CHECK (length(btrim(version)) > 0)
);

CREATE TABLE md_pilot_editorial_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES md_pilot_editorial_versions(id) ON DELETE RESTRICT,
    source_question_id TEXT REFERENCES md_pilot_questions(id) ON DELETE RESTRICT,
    orden INTEGER NOT NULL CHECK (orden > 0),
    categoria TEXT NOT NULL CHECK (length(btrim(categoria)) > 0),
    evidencia TEXT NOT NULL CHECK (length(btrim(evidencia)) > 0),
    enunciado TEXT NOT NULL CHECK (length(btrim(enunciado)) > 0),
    clave TEXT NOT NULL CHECK (clave IN ('A', 'B', 'C', 'D')),
    justificacion TEXT NOT NULL CHECK (length(btrim(justificacion)) > 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (version_id, orden),
    UNIQUE (version_id, source_question_id),
    UNIQUE (id, version_id)
);

CREATE TABLE md_pilot_editorial_options (
    question_id UUID NOT NULL REFERENCES md_pilot_editorial_questions(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL CHECK (codigo IN ('A', 'B', 'C', 'D')),
    texto TEXT NOT NULL CHECK (length(btrim(texto)) > 0),
    retroalimentacion TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (question_id, codigo)
);

CREATE TABLE md_pilot_editorial_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version_id UUID NOT NULL REFERENCES md_pilot_editorial_versions(id) ON DELETE RESTRICT,
    question_id UUID REFERENCES md_pilot_editorial_questions(id) ON DELETE RESTRICT,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accion TEXT NOT NULL CHECK (
        (accion = 'version_creada' AND question_id IS NULL) OR
        (accion IN ('pregunta_creada', 'pregunta_actualizada') AND question_id IS NOT NULL)
    ),
    antes JSONB,
    despues JSONB NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (question_id, version_id)
        REFERENCES md_pilot_editorial_questions(id, version_id) ON DELETE RESTRICT
);

CREATE INDEX md_pilot_editorial_versions_exam_idx
    ON md_pilot_editorial_versions (codigo, creado_en DESC);
CREATE INDEX md_pilot_editorial_questions_version_category_idx
    ON md_pilot_editorial_questions (version_id, categoria, orden);
CREATE INDEX md_pilot_editorial_questions_source_idx
    ON md_pilot_editorial_questions (source_question_id);
CREATE INDEX md_pilot_editorial_audit_question_created_idx
    ON md_pilot_editorial_audit (question_id, creado_en DESC);

CREATE FUNCTION md_pilot_editorial_guard_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Las versiones editoriales no se pueden eliminar'
            USING ERRCODE = '55000';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.codigo IS DISTINCT FROM OLD.codigo
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.source_version IS DISTINCT FROM OLD.source_version
       OR NEW.creado_por IS DISTINCT FROM OLD.creado_por THEN
        RAISE EXCEPTION 'La identidad y el origen de una versión son inmutables'
            USING ERRCODE = '55000';
    END IF;

    IF NEW.estado NOT IN ('borrador', 'revision') THEN
        RAISE EXCEPTION 'La publicación y el archivo requieren el procedimiento editorial seguro'
            USING ERRCODE = '55000';
    END IF;

    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER md_pilot_editorial_versions_immutable
BEFORE UPDATE OR DELETE ON md_pilot_editorial_versions
FOR EACH ROW EXECUTE FUNCTION md_pilot_editorial_guard_version();

CREATE FUNCTION md_pilot_editorial_guard_child()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_version_id UUID;
    v_estado TEXT;
    v_question_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'md_pilot_editorial_questions' THEN
        IF TG_OP = 'UPDATE' THEN
            IF NEW.id IS DISTINCT FROM OLD.id THEN
                RAISE EXCEPTION 'El identificador de una pregunta editorial es inmutable'
                    USING ERRCODE = '55000';
            END IF;
            IF NEW.version_id IS DISTINCT FROM OLD.version_id THEN
                RAISE EXCEPTION 'Una pregunta no puede cambiar de versión'
                    USING ERRCODE = '55000';
            END IF;
            IF NEW.source_question_id IS DISTINCT FROM OLD.source_question_id THEN
                RAISE EXCEPTION 'El origen de una pregunta editorial es inmutable'
                    USING ERRCODE = '55000';
            END IF;
        END IF;
        v_version_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.version_id ELSE NEW.version_id END;
    ELSE
        IF TG_OP = 'UPDATE' THEN
            IF NEW.question_id IS DISTINCT FROM OLD.question_id THEN
                RAISE EXCEPTION 'Una opción no puede cambiar de pregunta'
                    USING ERRCODE = '55000';
            END IF;
        END IF;
        v_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
        SELECT version_id INTO v_version_id
        FROM md_pilot_editorial_questions
        WHERE id = v_question_id
        FOR SHARE;
        IF NOT FOUND THEN
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RAISE EXCEPTION 'La pregunta editorial asociada no existe'
                USING ERRCODE = '23503';
        END IF;
    END IF;

    SELECT estado INTO v_estado
    FROM md_pilot_editorial_versions
    WHERE id = v_version_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La versión editorial asociada no existe'
            USING ERRCODE = '23503';
    END IF;
    IF v_estado <> 'borrador' THEN
        RAISE EXCEPTION 'Solo se pueden cambiar preguntas de versiones en borrador'
            USING ERRCODE = '55000';
    END IF;

    IF TG_TABLE_NAME = 'md_pilot_editorial_questions' AND TG_OP = 'UPDATE' THEN
        NEW.actualizado_en := now();
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER md_pilot_editorial_questions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON md_pilot_editorial_questions
FOR EACH ROW EXECUTE FUNCTION md_pilot_editorial_guard_child();

CREATE TRIGGER md_pilot_editorial_options_immutable
BEFORE INSERT OR UPDATE OR DELETE ON md_pilot_editorial_options
FOR EACH ROW EXECUTE FUNCTION md_pilot_editorial_guard_child();

CREATE FUNCTION md_pilot_editorial_audit_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'El historial editorial es append-only'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER md_pilot_editorial_audit_append_only
BEFORE UPDATE OR DELETE ON md_pilot_editorial_audit
FOR EACH ROW EXECUTE FUNCTION md_pilot_editorial_audit_immutable();

CREATE TRIGGER md_pilot_editorial_audit_no_truncate
BEFORE TRUNCATE ON md_pilot_editorial_audit
FOR EACH STATEMENT EXECUTE FUNCTION md_pilot_editorial_audit_immutable();

REVOKE ALL ON FUNCTION md_pilot_editorial_guard_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION md_pilot_editorial_guard_child() FROM PUBLIC;
REVOKE ALL ON FUNCTION md_pilot_editorial_audit_immutable() FROM PUBLIC;

CREATE FUNCTION md_pilot_editorial_validate_question_shape()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_question_id UUID;
    v_key TEXT;
    v_count INTEGER;
    v_distinct_count INTEGER;
    v_distinct_text_count INTEGER;
    v_blank_count INTEGER;
    v_key_exists BOOLEAN;
BEGIN
    IF TG_TABLE_NAME = 'md_pilot_editorial_questions' THEN
        v_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    ELSE
        v_question_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
    END IF;

    SELECT clave INTO v_key
    FROM md_pilot_editorial_questions
    WHERE id = v_question_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT
        count(*)::INTEGER,
        count(DISTINCT codigo)::INTEGER,
        count(DISTINCT lower(btrim(texto)))::INTEGER,
        count(*) FILTER (WHERE length(btrim(texto)) = 0)::INTEGER,
        coalesce(bool_or(codigo = v_key), false)
    INTO v_count, v_distinct_count, v_distinct_text_count, v_blank_count, v_key_exists
    FROM md_pilot_editorial_options
    WHERE question_id = v_question_id;

    IF v_count <> 4 OR v_distinct_count <> 4 OR v_distinct_text_count <> 4
       OR v_blank_count <> 0 OR NOT v_key_exists THEN
        RAISE EXCEPTION 'Cada pregunta debe tener cuatro opciones A-D completas y una clave válida'
            USING ERRCODE = '23514';
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER md_pilot_editorial_question_shape_check
AFTER INSERT OR UPDATE ON md_pilot_editorial_questions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION md_pilot_editorial_validate_question_shape();

CREATE CONSTRAINT TRIGGER md_pilot_editorial_option_shape_check
AFTER INSERT OR UPDATE OR DELETE ON md_pilot_editorial_options
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION md_pilot_editorial_validate_question_shape();

REVOKE ALL ON FUNCTION md_pilot_editorial_validate_question_shape() FROM PUBLIC;

ALTER TABLE md_pilot_editorial_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_options FORCE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_pilot_editorial_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
    md_pilot_editorial_versions,
    md_pilot_editorial_questions,
    md_pilot_editorial_options,
    md_pilot_editorial_audit
FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE
            md_pilot_editorial_versions,
            md_pilot_editorial_questions,
            md_pilot_editorial_options,
            md_pilot_editorial_audit
        FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE
            md_pilot_editorial_versions,
            md_pilot_editorial_questions,
            md_pilot_editorial_options,
            md_pilot_editorial_audit
        FROM authenticated;
    END IF;
END;
$$;

DO $$
DECLARE
    audit_sequence REGCLASS := pg_get_serial_sequence(
        'md_pilot_editorial_audit',
        'id'
    )::regclass;
BEGIN
    IF audit_sequence IS NOT NULL THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC', audit_sequence);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon', audit_sequence);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM authenticated', audit_sequence);
        END IF;
    END IF;
END;
$$;

COMMIT;
