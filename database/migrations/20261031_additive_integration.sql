-- Additive integration migration for the merged course and quiz features.
-- Review existing column types, constraints, and table contents before applying.
BEGIN;

ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS modulo_id INTEGER,
    ADD COLUMN IF NOT EXISTS metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(20) NOT NULL DEFAULT 'borrador',
    ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE quiz_options
    ADD COLUMN IF NOT EXISTS explicacion_distractor TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quizzes_modulo_id_fkey'
          AND conrelid = 'quizzes'::regclass
    ) THEN
        ALTER TABLE quizzes
            ADD CONSTRAINT quizzes_modulo_id_fkey
            FOREIGN KEY (modulo_id) REFERENCES modules(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quizzes_estado_revision_check'
          AND conrelid = 'quizzes'::regclass
    ) THEN
        ALTER TABLE quizzes
            ADD CONSTRAINT quizzes_estado_revision_check
            CHECK (estado_revision IN ('borrador', 'revision', 'publicado', 'archivado'));
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'finalizado',
    iniciado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizado_en TIMESTAMP,
    puntaje DECIMAL(5,2),
    aciertos INTEGER NOT NULL DEFAULT 0,
    total_preguntas INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id SERIAL PRIMARY KEY,
    intento_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    opcion_id INTEGER REFERENCES quiz_options(id) ON DELETE SET NULL,
    respuesta_correcta BOOLEAN NOT NULL,
    pregunta_snapshot TEXT NOT NULL,
    opcion_snapshot TEXT,
    respondida_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    competencia VARCHAR(100) NOT NULL,
    afirmacion TEXT NOT NULL,
    evidencia TEXT NOT NULL,
    dificultad VARCHAR(20) CHECK (dificultad IN ('baja', 'media', 'alta')),
    tema VARCHAR(100),
    fuente VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'borrador'
        CHECK (estado IN ('borrador', 'revision', 'validada', 'publicada', 'archivada')),
    metadatos JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    url VARCHAR(500),
    estado VARCHAR(20) DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'requiere_cambios')),
    nota DECIMAL(5,2),
    feedback TEXT,
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_calificacion TIMESTAMP,
    evaluador_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS course_completion_rules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE UNIQUE,
    regla JSONB NOT NULL DEFAULT
        '{"min_lecciones_pct": 100, "min_promedio_pct": 80, "proyecto_requerido": true}'::jsonb,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_modulo ON quizzes(modulo_id);
CREATE INDEX IF NOT EXISTS idx_quiz_estado ON quizzes(estado_revision);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_usuario ON quiz_attempts(usuario_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_intento ON quiz_attempt_answers(intento_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_competencia ON question_bank(competencia);
CREATE INDEX IF NOT EXISTS idx_question_bank_estado ON question_bank(estado);
CREATE INDEX IF NOT EXISTS idx_question_bank_dificultad ON question_bank(dificultad);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_course ON projects(course_id);
CREATE INDEX IF NOT EXISTS idx_projects_estado ON projects(estado);

COMMIT;
