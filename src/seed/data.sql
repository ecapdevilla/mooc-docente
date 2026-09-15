-- Seed data for MéritoDocente MOOC Platform (idempotente)
-- Se truncan las tablas involucradas y luego se vuelven a poblar con los mismos datos.

TRUNCATE TABLE user_badges, user_progress, enrollments, badges, quiz_options, quizzes, lessons, modules, courses, users RESTART IDENTITY CASCADE;

-- Users
INSERT INTO users (nombre, email, password_hash, telefono, departamento, rol, activo) VALUES
('Admin Demo', 'admin@meritodocente.com', '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6', '+573001234567', 'Cundinamarca', 'admin', TRUE),
('Professor User', 'prof@meritodocente.com', '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6', '+573009876543', 'Antioquia', 'teacher', TRUE),
('Student User', 'student@meritodocente.com', '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6', '+573012345678', 'Bogotá D.C.', 'estudiante', TRUE);

-- Courses
INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo) VALUES
('Fundamentos de Pedagogía y Didáctica', 'Pedagogía y Didáctica', 'Básico', 'Domina los conceptos esenciales de la pedagogía moderna y las estrategias didácticas para el aula.', 'fas fa-chalkboard-teacher', TRUE),
('Legislación Educativa Colombiana', 'Legislación Educativa', 'Básico', 'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios.', 'fas fa-gavel', TRUE);

-- Modules
WITH pedagogia_course AS (SELECT id FROM courses WHERE titulo = 'Fundamentos de Pedagogía y Didáctica'),
     legislacion_course AS (SELECT id FROM courses WHERE titulo = 'Legislación Educativa Colombiana')
INSERT INTO modules (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
SELECT
    (SELECT id FROM pedagogia_course),
    'Fundamentos de Pedagogía',
    'Conceptos esenciales de pedagogía y didáctica',
    1,
    'Pedagogo Inicial',
    'fas fa-chalkboard-teacher',
    'gold',
    TRUE
UNION ALL
SELECT
    (SELECT id FROM pedagogia_course),
    'Corrientes Pedagógicas',
    'Corrientes pedagógicas contemporáneas y sus autores',
    2,
    'Pensador',
    'fas fa-brain',
    'green',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM legislacion_course),
    'Marco Normativo Colombiano',
    'Leyes y decretos que rigen la educación en Colombia',
    1,
    'Conocedor Normativo',
    'fas fa-gavel',
    'blue',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM legislacion_course),
    'Constitución y Legislación',
    'Constitución Política y leyes educativas',
    2,
    'Legislador',
    'fas fa-scroll',
    'purple',
    TRUE;

-- Lessons
WITH pedagogia_modules AS (
    SELECT m.id, m.titulo FROM modules m
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
),
legislacion_modules AS (
    SELECT m.id, m.titulo FROM modules m
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Legislación Educativa Colombiana'
)
INSERT INTO lessons (modulo_id, titulo, descripcion, orden, tiene_quiz, activo)
SELECT
    m.id,
    '¿Qué es la Pedagogía?',
    'Conceptos básicos de pedagogía',
    1,
    TRUE,
    TRUE
FROM pedagogia_modules m
WHERE m.titulo = 'Fundamentos de Pedagogía'
UNION ALL
SELECT
    m.id,
    'Corrientes pedagógicas contemporáneas',
    'Estudio de las principales corrientes pedagógicas',
    2,
    TRUE,
    TRUE
FROM pedagogia_modules m
WHERE m.titulo = 'Corrientes Pedagógicas'
UNION ALL
SELECT
    m.id,
    'Ley General de Educación (Ley 115 de 1994)',
    'Marco normativo principal del sistema educativo colombiano',
    1,
    TRUE,
    TRUE
FROM legislacion_modules m
WHERE m.titulo = 'Marco Normativo Colombiano'
UNION ALL
SELECT
    m.id,
    'Constitución Política de Colombia',
    'Principios fundamentales de la educación en la Constitución',
    1,
    TRUE,
    TRUE
FROM legislacion_modules m
WHERE m.titulo = 'Constitución y Legislación';

-- Quizzes
WITH lessons_data AS (
    SELECT l.id, l.titulo FROM lessons l
    WHERE l.titulo IN ('¿Qué es la Pedagogía?', 'Corrientes pedagógicas contemporáneas',
                       'Ley General de Educación (Ley 115 de 1994)', 'Constitución Política de Colombia')
)
INSERT INTO quizzes (leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    CASE
        WHEN l.titulo = '¿Qué es la Pedagogía?' THEN '¿Cuál es la diferencia central entre pedagogía y didáctica?'
        WHEN l.titulo = 'Corrientes pedagógicas contemporáneas' THEN 'Según Ausubel, el aprendizaje significativo ocurre cuando:'
        WHEN l.titulo = 'Ley General de Educación (Ley 115 de 1994)' THEN '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
        WHEN l.titulo = 'Constitución Política de Colombia' THEN '¿Cuál es el artículo principal que garantiza la educación en la Constitución?'
    END,
    CASE
        WHEN l.titulo = '¿Qué es la Pedagogía?' THEN 'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.'
        WHEN l.titulo = 'Corrientes pedagógicas contemporáneas' THEN 'El nuevo contenido se relaciona con los saberes previos del estudiante.'
        WHEN l.titulo = 'Ley General de Educación (Ley 115 de 1994)' THEN 'Los fines de la educación, niveles y actores del sistema educativo colombiano.'
        WHEN l.titulo = 'Constitución Política de Colombia' THEN 'El artículo 67 garantiza el derecho fundamental a la educación.'
    END,
    CASE
        WHEN l.titulo = '¿Qué es la Pedagogía?' THEN 'La pedagogía solo se aplica en primaria y la didáctica en secundaria.'
        WHEN l.titulo = 'Corrientes pedagógicas contemporáneas' THEN 'El estudiante memoriza sin comprender.'
        WHEN l.titulo = 'Ley General de Educación (Ley 115 de 1994)' THEN 'Solo el calendario escolar.'
        WHEN l.titulo = 'Constitución Política de Colombia' THEN 'Ninguna de las anteriores.'
    END
FROM lessons_data l;

-- Quiz options
WITH quiz_data AS (
    SELECT q.id, q.leccion_id FROM quizzes q
    JOIN lessons l ON q.leccion_id = l.id
    WHERE l.titulo IN ('¿Qué es la Pedagogía?', 'Corrientes pedagógicas contemporáneas',
                       'Ley General de Educación (Ley 115 de 1994)', 'Constitución Política de Colombia')
)
INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT
    sub.id,
    CASE
        WHEN sub.titulo = '¿Qué es la Pedagogía?' THEN
            CASE (sub.rn)
                WHEN 1 THEN 'La pedagogía solo se aplica en primaria y la didáctica en secundaria.'
                WHEN 2 THEN 'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.'
                WHEN 3 THEN 'Son sinónimos exactos y se usan indistintamente.'
                ELSE 'La didáctica es teórica y la pedagogía es práctica.'
            END
        WHEN sub.titulo = 'Corrientes pedagógicas contemporáneas' THEN
            CASE (sub.rn)
                WHEN 1 THEN 'El estudiante memoriza sin comprender.'
                WHEN 2 THEN 'El nuevo contenido se relaciona con los saberes previos del estudiante.'
                WHEN 3 THEN 'El docente expone sin participación del estudiante.'
                ELSE 'Se evalúa únicamente con pruebas estandarizadas.'
            END
        WHEN sub.titulo = 'Ley General de Educación (Ley 115 de 1994)' THEN
            CASE (sub.rn)
                WHEN 1 THEN 'Solo el calendario escolar.'
                WHEN 2 THEN 'Los fines de la educación, niveles y actores del sistema educativo colombiano.'
                WHEN 3 THEN 'Únicamente el salario de los docentes.'
                ELSE 'El régimen disciplinario de los estudiantes.'
            END
        WHEN sub.titulo = 'Constitución Política de Colombia' THEN
            CASE (sub.rn)
                WHEN 1 THEN 'El artículo 67 garantiza el derecho fundamental a la educación.'
                WHEN 2 THEN 'El artículo 71 establece la educación ambiental.'
                WHEN 3 THEN 'El artículo 365 regula el servicio civil.'
                ELSE 'Ninguno de los anteriores.'
            END
    END,
    CASE
        WHEN sub.titulo = 'Constitución Política de Colombia' AND sub.rn = 1 THEN TRUE
        WHEN sub.titulo <> 'Constitución Política de Colombia' AND sub.rn = 2 THEN TRUE
        ELSE FALSE
    END AS es_correcta,
    sub.rn
FROM (
    SELECT
        q.id,
        l.titulo,
        ROW_NUMBER() OVER (PARTITION BY q.id ORDER BY (SELECT NULL)) AS rn
    FROM quiz_data q
    JOIN lessons l ON q.leccion_id = l.id
) sub
ORDER BY sub.id, sub.rn;

-- Badges (standalone)
INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
SELECT DISTINCT
    m.id,
    m.badge_nombre,
    CONCAT('Badge obtenido al completar ', m.titulo),
    m.badge_icono,
    m.badge_color
FROM modules m
WHERE m.badge_nombre IS NOT NULL;

-- Enrollments (re‑crear relaciones)
WITH users_data AS (
    SELECT id FROM users WHERE email IN ('admin@meritodocente.com', 'prof@meritodocente.com', 'student@meritodocente.com')
),
courses_data AS (
    SELECT id FROM courses WHERE titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana')
)
INSERT INTO enrollments (usuario_id, curso_id, fecha_inscripcion)
SELECT
    u.id,
    c.id,
    CURRENT_TIMESTAMP
FROM users_data u
CROSS JOIN courses_data c;

-- Initial user progress (sin iniciar)
INSERT INTO user_progress (usuario_id, leccion_id, completada, fecha_completada, intentos, puntaje)
SELECT
    u.id,
    l.id,
    FALSE,
    CURRENT_TIMESTAMP,
    0,
    0
FROM users u
JOIN lessons l ON l.modulo_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana')
);

-- Activity progress (professor & student completed first lesson)
INSERT INTO user_progress (usuario_id, leccion_id, completada, fecha_completada, intentos, puntaje)
SELECT
    u.id,
    l.id,
    TRUE,
    CURRENT_TIMESTAMP,
    1,
    100
FROM users u
JOIN lessons l ON l.titulo = '¿Qué es la Pedagogía?'
WHERE u.email IN ('prof@meritodocente.com', 'student@meritodocente.com')
ON CONFLICT (usuario_id, leccion_id) DO UPDATE SET completada = TRUE, fecha_completada = CURRENT_TIMESTAMP, intentos = user_progress.intentos + 1, puntaje = EXCLUDED.puntaje;

SELECT '✅ Seed data inserted successfully';

