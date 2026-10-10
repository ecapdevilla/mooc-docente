-- Database schema for MéritoDocente MOOC platform
-- Run this script to create all tables

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    departamento VARCHAR(100),
    rol VARCHAR(50) DEFAULT 'estudiante',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    foto_perfil VARCHAR(255),
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL,
    nivel VARCHAR(50),
    descripcion TEXT,
    icono VARCHAR(100),
    imagen_portada VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modules table
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    badge_nombre VARCHAR(100),
    badge_icono VARCHAR(100),
    badge_color VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE
);

-- Lessons table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    contenido TEXT,
    orden INTEGER DEFAULT 0,
    tiene_quiz BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE
);

-- Quiz table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    leccion_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    modulo_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    pregunta TEXT NOT NULL,
    explicacion_correcta TEXT,
    explicacion_incorrecta TEXT,
    metadatos JSONB DEFAULT '{}',
    estado_revision VARCHAR(20) DEFAULT 'borrador' CHECK (estado_revision IN ('borrador','revision','publicado','archivado')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz options table
CREATE TABLE quiz_options (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    opcion TEXT NOT NULL,
    es_correcta BOOLEAN DEFAULT FALSE,
    orden INTEGER DEFAULT 0,
    explicacion_distractor TEXT
);

-- User progress table
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leccion_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completada BOOLEAN DEFAULT FALSE,
    fecha_completada TIMESTAMP,
    intentos INTEGER DEFAULT 0,
    puntaje DECIMAL(5,2),
    UNIQUE(usuario_id, leccion_id)
);

-- Badges table
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(100),
    color VARCHAR(20),
    imagen VARCHAR(255)
);

-- User badges table (many-to-many)
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    fecha_obtencion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, badge_id)
);

-- Question bank table (reusable questions with full metadata)
CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,
    competencia VARCHAR(100) NOT NULL,
    afirmacion TEXT NOT NULL,
    evidencia TEXT NOT NULL,
    dificultad VARCHAR(20) CHECK (dificultad IN ('baja','media','alta')),
    tema VARCHAR(100),
    fuente VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','revision','validada','publicada','archivada')),
    metadatos JSONB DEFAULT '{}',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (final project submissions)
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    url VARCHAR(500),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_revision','aprobado','rechazado','requiere_cambios')),
    nota DECIMAL(5,2),
    feedback TEXT,
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_calificacion TIMESTAMP,
    evaluador_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Course completion rules table
CREATE TABLE course_completion_rules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE UNIQUE,
    regla JSONB NOT NULL DEFAULT '{"min_lecciones_pct": 100, "min_promedio_pct": 80, "proyecto_requerido": true}',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    curso_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progreso_total DECIMAL(5,2) DEFAULT 0,
    UNIQUE(usuario_id, curso_id)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_activo ON users(activo);
CREATE INDEX idx_modules_curso ON modules(curso_id);
CREATE INDEX idx_lessons_modulo ON lessons(modulo_id);
CREATE INDEX idx_quiz_leccion ON quizzes(leccion_id);
CREATE INDEX idx_quiz_modulo ON quizzes(modulo_id);
CREATE INDEX idx_quiz_estado ON quizzes(estado_revision);
CREATE INDEX idx_user_progress_usuario ON user_progress(usuario_id);
CREATE INDEX idx_user_progress_leccion ON user_progress(leccion_id);
CREATE INDEX idx_user_badges_usuario ON user_badges(usuario_id);
CREATE INDEX idx_enrollments_usuario ON enrollments(usuario_id);
CREATE INDEX idx_enrollments_curso ON enrollments(curso_id);
CREATE INDEX idx_question_bank_competencia ON question_bank(competencia);
CREATE INDEX idx_question_bank_estado ON question_bank(estado);
CREATE INDEX idx_question_bank_dificultad ON question_bank(dificultad);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_course ON projects(course_id);
CREATE INDEX idx_projects_estado ON projects(estado);

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: We'll add triggers if needed, but we have created_at/updated_at in courses only for now