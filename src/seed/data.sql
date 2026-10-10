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
('Legislación Educativa Colombiana', 'Legislación Educativa', 'Básico', 'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios.', 'fas fa-gavel', TRUE),
('Inteligencia Artificial para Docentes', 'Tecnología Educativa', 'Intermedio', 'Domina el uso pedagógico de la IA en el aula: planificación, evaluación, personalización y ética. 48 horas, 6 módulos, proyecto final.', 'fas fa-robot', TRUE);

-- Modules
WITH pedagogia_course AS (SELECT id FROM courses WHERE titulo = 'Fundamentos de Pedagogía y Didáctica'),
     legislacion_course AS (SELECT id FROM courses WHERE titulo = 'Legislación Educativa Colombiana'),
     ia_course AS (SELECT id FROM courses WHERE titulo = 'Inteligencia Artificial para Docentes')
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
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM ia_course),
    'Fundamentos de IA en Educación',
    'Conceptos básicos, tipos de IA y su aplicación pedagógica',
    1,
    'Explorador IA',
    'fas fa-robot',
    'blue',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM ia_course),
    'Planificación con IA',
    'Diseño de situaciones de aprendizaje asistido por IA generativa',
    2,
    'Planificador IA',
    'fas fa-calendar-alt',
    'green',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM ia_course),
    'Evaluación y Retroalimentación con IA',
    'Diseño de ítems, rúbricas, feedback automatizado y análisis de evidencias',
    3,
    'Evaluador IA',
    'fas fa-chart-line',
    'orange',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM ia_course),
    'Ética, Privacidad y Ciudadanía Digital con IA',
    'Sesgos, protección de datos, transparencia, propiedad intelectual, deepfakes',
    4,
    'Guardián Ético',
    'fas fa-shield-alt',
    'red',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM ia_course),
    'Liderazgo Pedagógico y Escalabilidad con IA',
    'Gestión del cambio, coaching, gobernanza, escalabilidad, investigación-acción',
    5,
    'Líder IA',
    'fas fa-users-cog',
    'purple',
    TRUE
UNION ALL
    SELECT
    (SELECT id FROM ia_course),
    'Proyecto Integrador: IA Ética en Mi Práctica Docente',
    'Definición de reto, diseño intervención, implementación, análisis, comunicación',
    6,
    'Practicante IA',
    'fas fa-project-diagram',
    'teal',
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
),
ia_modules AS (
    SELECT m.id, m.titulo FROM modules m
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
)
INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
SELECT
    m.id, '¿Qué es la Pedagogía?', 'Conceptos básicos de pedagogía', NULL, 1, TRUE, TRUE
FROM pedagogia_modules m WHERE m.titulo = 'Fundamentos de Pedagogía'
UNION ALL
SELECT
    m.id, 'Corrientes pedagógicas contemporáneas', 'Estudio de las principales corrientes pedagógicas', NULL, 2, TRUE, TRUE
FROM pedagogia_modules m WHERE m.titulo = 'Corrientes Pedagógicas'
UNION ALL
SELECT
    m.id, 'Ley General de Educación (Ley 115 de 1994)', 'Marco normativo principal del sistema educativo colombiano', NULL, 1, TRUE, TRUE
FROM legislacion_modules m WHERE m.titulo = 'Marco Normativo Colombiano'
UNION ALL
SELECT
    m.id, 'Constitución Política de Colombia', 'Principios fundamentales de la educación en la Constitución', NULL, 1, TRUE, TRUE
FROM legislacion_modules m WHERE m.titulo = 'Constitución y Legislación'
-- Modulo 1: Fundamentos de IA
UNION ALL SELECT m.id, '1.1 Historia de la IA', 'Evolución de la IA', $$<h2>Historia de la IA</h2><p>Breve historia y evolución de la IA en la educación.</p>$$, 1, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Fundamentos de IA en Educación'
UNION ALL SELECT m.id, '1.2 Conceptos clave', 'Términos', $$<h2>Conceptos Clave</h2><p>Definición de Machine Learning, Redes Neuronales, etc.</p>$$, 2, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Fundamentos de IA en Educación'
UNION ALL SELECT m.id, '1.3 IA débil vs fuerte', 'Tipos', $$<h2>Tipos de IA</h2><p>Diferencias entre IA enfocada e IA general.</p>$$, 3, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Fundamentos de IA en Educación'
UNION ALL SELECT m.id, '1.4 IA Generativa', 'Modelos generativos', $$<h2>IA Generativa</h2><p>LLMs, generación de imágenes y texto.</p>$$, 4, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Fundamentos de IA en Educación'
UNION ALL SELECT m.id, '1.5 Mitos de la IA', 'Realidades', $$<h2>Mitos</h2><p>Desmitificando el reemplazo docente.</p>$$, 5, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Fundamentos de IA en Educación'
-- Modulo 2: Planificación
UNION ALL SELECT m.id, '2.1 Prompts efectivos', 'Ingeniería de prompts', $$<h2>Prompts</h2><p>Estructura de un buen prompt.</p>$$, 1, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Planificación con IA'
UNION ALL SELECT m.id, '2.2 Diseño de sílabo', 'Planificación', $$<h2>Sílabo</h2><p>Generación de estructuras curriculares.</p>$$, 2, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Planificación con IA'
UNION ALL SELECT m.id, '2.3 Actividades interactivas', 'Creación', $$<h2>Actividades</h2><p>Juegos y dinámicas generadas con IA.</p>$$, 3, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Planificación con IA'
UNION ALL SELECT m.id, '2.4 Adaptación curricular', 'Ajustes', $$<h2>Adaptación</h2><p>Personalización para DUA.</p>$$, 4, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Planificación con IA'
UNION ALL SELECT m.id, '2.5 Recursos multimedia', 'Generación', $$<h2>Recursos</h2><p>Creación de imágenes y audio.</p>$$, 5, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Planificación con IA'
-- Modulo 3: Evaluación
UNION ALL SELECT m.id, '3.1 Rúbricas automatizadas', 'Creación', $$<h2>Rúbricas</h2><p>Diseño de matrices de evaluación.</p>$$, 1, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Evaluación y Retroalimentación con IA'
UNION ALL SELECT m.id, '3.2 Feedback personalizado', 'Retroalimentación', $$<h2>Feedback</h2><p>Comentarios formativos escalables.</p>$$, 2, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Evaluación y Retroalimentación con IA'
UNION ALL SELECT m.id, '3.3 Análisis de resultados', 'Métricas', $$<h2>Análisis</h2><p>Identificación de brechas de aprendizaje.</p>$$, 3, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Evaluación y Retroalimentación con IA'
UNION ALL SELECT m.id, '3.4 Prevención de plagio', 'Originalidad', $$<h2>Prevención</h2><p>Uso ético y detectores (sus límites).</p>$$, 4, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Evaluación y Retroalimentación con IA'
UNION ALL SELECT m.id, '3.5 Evaluaciones adaptativas', 'Pruebas', $$<h2>Evaluaciones</h2><p>Quizzes que cambian según el nivel.</p>$$, 5, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Evaluación y Retroalimentación con IA'
-- Modulo 4: Ética
UNION ALL SELECT m.id, '4.1 Privacidad de datos', 'Protección', $$<h2>Privacidad</h2><p>Leyes de protección del menor.</p>$$, 1, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
UNION ALL SELECT m.id, '4.2 Sesgos algorítmicos', 'Equidad', $$<h2>Sesgos</h2><p>Discriminación en IA y cómo mitigarla.</p>$$, 2, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
UNION ALL SELECT m.id, '4.3 Propiedad intelectual', 'Derechos', $$<h2>Propiedad</h2><p>Derechos de autor en obras generadas.</p>$$, 3, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
UNION ALL SELECT m.id, '4.4 Uso responsable', 'Ciudadanía', $$<h2>Uso Responsable</h2><p>Fomentar pensamiento crítico.</p>$$, 4, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
UNION ALL SELECT m.id, '4.5 Políticas escolares', 'Normas', $$<h2>Políticas</h2><p>Creación de manuales de convivencia sobre IA.</p>$$, 5, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
-- Modulo 5: Liderazgo
UNION ALL SELECT m.id, '5.1 Gestión del cambio', 'Liderazgo', $$<h2>Gestión del Cambio</h2><p>Vencer la resistencia docente.</p>$$, 1, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
UNION ALL SELECT m.id, '5.2 Capacitación docente', 'Formación', $$<h2>Capacitación</h2><p>Modelos de formación entre pares.</p>$$, 2, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
UNION ALL SELECT m.id, '5.3 Integración institucional', 'Escalabilidad', $$<h2>Integración</h2><p>Plataformas a nivel de colegio.</p>$$, 3, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
UNION ALL SELECT m.id, '5.4 Casos de éxito', 'Ejemplos', $$<h2>Casos</h2><p>Estudios de colegios innovadores.</p>$$, 4, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
UNION ALL SELECT m.id, '5.5 Futuro de la IA', 'Tendencias', $$<h2>Futuro</h2><p>Hacia dónde va la edtech.</p>$$, 5, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
-- Modulo 6: Proyecto
UNION ALL SELECT m.id, '6.1 Definición del reto', 'Fase 1', $$<h2>Reto</h2><p>Identificar problema áulico.</p>$$, 1, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
UNION ALL SELECT m.id, '6.2 Diseño de intervención', 'Fase 2', $$<h2>Diseño</h2><p>Plantear solución con IA.</p>$$, 2, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
UNION ALL SELECT m.id, '6.3 Implementación', 'Fase 3', $$<h2>Implementación</h2><p>Llevar al aula.</p>$$, 3, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
UNION ALL SELECT m.id, '6.4 Análisis de impacto', 'Fase 4', $$<h2>Análisis</h2><p>Medir resultados.</p>$$, 4, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
UNION ALL SELECT m.id, '6.5 Presentación final', 'Fase 5', $$<h2>Presentación</h2><p>Exponer a la comunidad.</p>$$, 5, TRUE, TRUE FROM ia_modules m WHERE m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente';

-- Quizzes
WITH base_lessons_data AS (
    SELECT l.id, l.titulo FROM lessons l
    WHERE l.titulo IN ('¿Qué es la Pedagogía?', 'Corrientes pedagógicas contemporáneas',
                       'Ley General de Educación (Ley 115 de 1994)', 'Constitución Política de Colombia')
),
ia_lessons_data AS (
    SELECT l.id, l.titulo FROM lessons l
    JOIN modules m ON l.modulo_id = m.id
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
),
ia_modules_data AS (
    SELECT m.id, m.titulo FROM modules m
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
)
INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, metadatos, estado_revision)
SELECT
    l.id,
    NULL::integer,
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
    END,
    '{"competencia": "Pedagógica", "dificultad": "baja", "tema": "Fundamentos"}'::jsonb,
    'publicado'
FROM base_lessons_data l
UNION ALL
SELECT
    l.id,
    NULL::integer,
    'Pregunta de evaluación para: ' || l.titulo,
    'Explicación correcta detallada de ' || l.titulo,
    'Explicación del error común en ' || l.titulo,
    jsonb_build_object(
        'competencia', 'Uso y apropiación de IA',
        'afirmacion', 'Aplica conceptos de ' || l.titulo,
        'evidencia', 'Resuelve casos de uso',
        'dificultad', 'media',
        'tema', 'Inteligencia Artificial',
        'fuente', 'Banco de ítems'
    ),
    'revision'
FROM ia_lessons_data l
UNION ALL
SELECT
    NULL::integer,
    m.id,
    'Pregunta integradora del módulo: ' || m.titulo,
    'Respuesta correcta del módulo ' || m.titulo,
    'Distractor común del módulo ' || m.titulo,
    jsonb_build_object(
        'competencia', 'Integración de IA',
        'afirmacion', 'Sintetiza aprendizajes del módulo ' || m.titulo,
        'evidencia', 'Aplica conceptos integrados',
        'dificultad', 'alta',
        'tema', 'Módulo de IA',
        'fuente', 'Evaluación Módulo'
    ),
    'publicado'
FROM ia_modules_data m;

-- Quiz options
WITH base_quiz_data AS (
    SELECT q.id, q.leccion_id FROM quizzes q
    JOIN lessons l ON q.leccion_id = l.id
    WHERE l.titulo IN ('¿Qué es la Pedagogía?', 'Corrientes pedagógicas contemporáneas',
                       'Ley General de Educación (Ley 115 de 1994)', 'Constitución Política de Colombia')
),
ia_quiz_data AS (
    SELECT q.id, q.leccion_id FROM quizzes q
    JOIN lessons l ON q.leccion_id = l.id
    JOIN modules m ON l.modulo_id = m.id
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
),
ia_modules_quiz_data AS (
    SELECT q.id, q.modulo_id FROM quizzes q
    JOIN modules m ON q.modulo_id = m.id
    JOIN courses c ON m.curso_id = c.id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes' AND q.leccion_id IS NULL
)
INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
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
    sub.rn,
    CASE
        WHEN sub.titulo = 'Constitución Política de Colombia' AND sub.rn = 1 THEN NULL
        WHEN sub.titulo <> 'Constitución Política de Colombia' AND sub.rn = 2 THEN NULL
        ELSE 'Esta es una respuesta incorrecta de prueba.'
    END AS explicacion_distractor
FROM (
    SELECT
        q.id,
        l.titulo,
        s.rn
    FROM base_quiz_data q
    JOIN lessons l ON q.leccion_id = l.id
    CROSS JOIN (SELECT generate_series(1,4) as rn) s
) sub
UNION ALL
SELECT
    sub.id,
    'Opción ' || sub.rn || ' para: ' || sub.titulo,
    CASE WHEN sub.rn = 1 THEN TRUE ELSE FALSE END AS es_correcta,
    sub.rn,
    CASE WHEN sub.rn = 1 THEN NULL ELSE 'Distractor para analizar el nivel de apropiación de IA.' END AS explicacion_distractor
FROM (
    SELECT
        q.id,
        l.titulo,
        s.rn
    FROM ia_quiz_data q
    JOIN lessons l ON q.leccion_id = l.id
    CROSS JOIN (SELECT generate_series(1,4) as rn) s
) sub
UNION ALL
SELECT
    sub.id,
    'Opción de módulo ' || sub.rn || ' para: ' || sub.titulo,
    CASE WHEN sub.rn = 1 THEN TRUE ELSE FALSE END AS es_correcta,
    sub.rn,
    CASE WHEN sub.rn = 1 THEN NULL ELSE 'Distractor de módulo para analizar integración de conceptos.' END AS explicacion_distractor
FROM (
    SELECT
        q.id,
        m.titulo,
        s.rn
    FROM ia_modules_quiz_data q
    JOIN modules m ON q.modulo_id = m.id
    CROSS JOIN (SELECT generate_series(1,4) as rn) s
) sub
ORDER BY 1, 4;

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

