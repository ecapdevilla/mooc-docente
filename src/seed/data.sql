/* Seed data for MéritoDocente MOOC Platform */

-- First, we need to know what user roles exist before inserting users
INSERT INTO users (nombre, email, password_hash, telefono, departamento, rol, activo) VALUES
('Admin Demo', 'admin@meritodocente.com', '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6', '+573001234567', 'Cundinamarca', 'admin', TRUE),
('Professor User', 'prof@meritodocente.com', '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6', '+573009876543', 'Antioquia', 'teacher', TRUE),
('Student User', 'student@meritodocente.com', '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6', '+573012345678', 'Bogotá D.C.', 'estudiante', TRUE);

-- Get user IDs for enrollments
DO $$
DECLARE
    admin_id INTEGER;
    professor_id INTEGER;
    student_id INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE email = 'admin@meritodocente.com';
    SELECT id INTO professor_id FROM users WHERE email = 'prof@meritodocente.com';
    SELECT id INTO student_id FROM users WHERE email = 'student@meritodocente.com';

    -- Create course for admin and professor
    INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo) VALUES
    ('Fundamentos de Pedagogía y Didáctica', 'Pedagogía y Didáctica', 'Básico', 'Domina los conceptos esenciales de la pedagogía moderna y las estrategias didácticas para el aula.', 'fas fa-chalkboard-teacher', TRUE);
    
    INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo) VALUES
    ('Legislación Educativa Colombiana', 'Legislación Educativa', 'Básico', 'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios.', 'fas fa-gavel', TRUE);

    -- Get course IDs
    admin_course_id := (SELECT id FROM courses WHERE titulo = 'Fundamentos de Pedagogía y Didáctica');
    professor_course_id := (SELECT id FROM courses WHERE titulo = 'Legislación Educativa Colombiana');

    -- Enroll students in courses
    INSERT INTO enrollments (usuario_id, curso_id, fecha_inscripcion) VALUES
    (admin_id, admin_course_id, CURRENT_TIMESTAMP),
    (admin_id, professor_course_id, CURRENT_TIMESTAMP),
    (professor_id, admin_course_id, CURRENT_TIMESTAMP),
    (student_id, admin_course_id, CURRENT_TIMESTAMP),
    (student_id, professor_course_id, CURRENT_TIMESTAMP);

END $$;

-- Modules for Pedagogía y Didáctica course
WITH pedagogia_course_id AS (SELECT id FROM courses WHERE titulo = 'Fundamentos de Pedagogía y Didáctica'),
     legislacion_course_id AS (SELECT id FROM courses WHERE titulo = 'Legislación Educativa Colombiana')
INSERT INTO modules (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
SELECT 
    (SELECT id FROM pedagogia_course_id), 
    'Fundamentos de Pedagogía', 
    'Conceptos esenciales de pedagogía y didáctica', 
    1, 
    'Pedagogo Inicial', 
    'fas fa-chalkboard-teacher', 
    'gold', 
    TRUE
UNION ALL
SELECT 
    (SELECT id FROM pedagogia_course_id), 
    'Corrientes Pedagógicas', 
    'Corrientes pedagógicas contemporáneas y sus autores', 
    2, 
    'Pensador', 
    'fas fa-brain', 
    'green', 
    TRUE
UNION ALL
SELECT 
    (SELECT id FROM legislacion_course_id), 
    'Marco Normativo Colombiano', 
    'Leyes y decretos que rigen la educación en Colombia', 
    1, 
    'Conocedor Normativo', 
    'fas fa-gavel', 
    'blue', 
    TRUE
UNION ALL
SELECT 
    (SELECT id FROM legislacion_course_id), 
    'Constitución y Legislación', 
    'Constitución Política y leyes educativas', 
    2, 
    'Legislador', 
    'fas fa-scroll', 
    'purple', 
    TRUE;

-- Insert lessons and quizzes for modules
WITH
    modules_data AS (
        SELECT id, titulo, curso_id FROM modules WHERE curso_id = (SELECT id FROM courses WHERE titulo = 'Fundamentos de Pedagogía y Didáctica')
    )
INSERT INTO lessons (modulo_id, titulo, descripcion, orden, tiene_quiz, activo)
SELECT 
    m.id,
    '¿Qué es la Pedagogía?',
    'Conceptos básicos de pedagogía', 
    1, TRUE, TRUE
FROM modules_data m
WHERE m.titulo = 'Fundamentos de Pedagogía'
UNION ALL
SELECT 
    m.id,
    'Corrientes pedagógicas contemporáneas',
    'Estudio de las principales corrientes pedagógicas', 
    2, TRUE, TRUE
FROM modules_data m
WHERE m.titulo = 'Corrientes Pedagógicas'
UNION ALL
SELECT 
    (SELECT id FROM modules WHERE titulo = 'Marco Normativo Colombiano'), 
    'Ley General de Educación (Ley 115 de 1994)', 
    'Marco normativo principal del sistema educativo colombiano', 
    1, TRUE, TRUE
UNION ALL
SELECT 
    (SELECT id FROM modules WHERE titulo = 'Constitución y Legislación'), 
    'Constitución Política de Colombia', 
    'Principios fundamentales de la educación en la Constitución', 
    1, TRUE, TRUE;

-- Insert quizzes for lessons
WITH 
    lessons_data AS (
        SELECT l.id, l.titulo FROM lessons l WHERE l.titulo IN ('¿Qué es la Pedagogía?', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Constitución Política de Colombia')
    ),
    quiz_options AS (
        SELECT id, titulo FROM modules WHERE titulo IN ('Fundamentos de Pedagogía', 'Corrientes Pedagógicas', 'Marco Normativo Colombiano', 'Constitución y Legislación')
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

-- Insert quiz options
INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT 
    q.id,
    CASE 
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = '¿Qué es la Pedagogía?') THEN
            CASE 
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 0 THEN 'La pedagogía solo se aplica en primaria y la didáctica en secundaria.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1 THEN 'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 2 THEN 'Son sinónimos exactos y se usan indistintamente.'
                ELSE 'La didáctica es teórica y la pedagogía es práctica.'
            END
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = 'Corrientes pedagógicas contemporáneas') THEN
            CASE 
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 0 THEN 'El estudiante memoriza sin comprender.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1 THEN 'El nuevo contenido se relaciona con los saberes previos del estudiante.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 2 THEN 'El docente expone sin participación del estudiante.'
                ELSE 'Se evalúa únicamente con pruebas estandarizadas.'
            END
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = 'Ley General de Educación (Ley 115 de 1994)') THEN
            CASE 
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 0 THEN 'Solo el calendario escolar.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1 THEN 'Los fines de la educación, niveles y actores del sistema educativo colombiano.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 2 THEN 'Únicamente el salario de los docentes.'
                ELSE 'El régimen disciplinario de los estudiantes.'
            END
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = 'Constitución Política de Colombia') THEN
            CASE 
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 0 THEN 'El artículo 67 garantiza el derecho fundamental a la educación.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1 THEN 'El artículo 71 establece la educación ambiental.'
                WHEN (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 2 THEN 'El artículo 365 regula el servicio civil.'
                ELSE 'Ninguno de los anteriores.'
            END
    END,
    CASE 
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = '¿Qué es la Pedagogía?') THEN
            (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = 'Corrientes pedagógicas contemporáneas') THEN
            (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = 'Ley General de Educación (Ley 115 de 1994)') THEN
            (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 1
        WHEN q.leccion_id = (SELECT id FROM lessons WHERE titulo = 'Constitución Política de Colombia') THEN
            (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) = 0
    END,
    (SELECT COUNT(*) FROM quiz_options WHERE quiz_id = q.id) + 1
FROM quizzes q;

-- Create initial user progress (all students enrolled but haven't started)
INSERT INTO user_progress (usuario_id, leccion_id, completada, fecha_completada, intentos, puntaje)
SELECT 
    u.id,
    l.id,
    FALSE,
    CURRENT_TIMESTAMP,
    0,
    0
FROM users u, lessons l
WHERE u.email IN ('admin@meritodocente.com', 'prof@meritodocente.com', 'student@meritodocente.com')
AND l.modulo_id IN (SELECT id FROM modules WHERE curso_id IN (SELECT id FROM courses));

-- Add badge data (already embedded in modules but we'll also insert standalone badges for completeness)
INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
SELECT DISTINCT 
    m.id,
    m.badge_nombre,
    CONCAT('Badge obtenido al completar ', m.titulo),
    m.badge_icono,
    m.badge_color
FROM modules m
WHERE m.badge_nombre IS NOT NULL;

-- Create enrollment relationships
INSERT INTO enrollments (usuario_id, curso_id, fecha_inscripcion)
SELECT DISTINCT
    u.id,
    c.id,
    CURRENT_TIMESTAMP
FROM users u, courses c
WHERE u.email IN ('admin@meritodocente.com', 'prof@meritodocente.com', 'student@meritodocente.com')
AND c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana');

-- Create some user progress to simulate activity
WITH
    user_data AS (SELECT id, email FROM users WHERE email IN ('prof@meritodocente.com', 'student@meritodocente.com')),
    lesson_data AS (SELECT id, modulo_id FROM lessons WHERE titulo = '¿Qué es la Pedagogía?')
INSERT INTO user_progress (usuario_id, leccion_id, completada, fecha_completada, intentos, puntaje)
SELECT 
    ud.id,
    ld.id,
    TRUE,
    CURRENT_TIMESTAMP,
    1,
    100
FROM user_data ud, lesson_data ld;

SELECT '✅ Seed data inserted successfully';