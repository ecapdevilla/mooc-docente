-- Diagnóstico de solo lectura del catálogo académico (Bloque 1).
-- Ejecutar en Supabase → SQL Editor o con scripts/diagnostico-catalogo.js.
-- No contiene INSERT/UPDATE/DELETE/DDL: únicamente consultas de verificación.

-- 1. Identidad de la conexión (confirma proyecto, base, esquema y búsqueda)
SELECT
    current_database() AS base_de_datos,
    current_user AS usuario_bd,
    current_schema() AS esquema_actual,
    current_setting('search_path') AS search_path,
    inet_server_addr()::text AS servidor,
    version() AS version_postgres;

-- 2. Existencia de las tablas del catálogo en el esquema público
SELECT tabla, existe
FROM (
    SELECT 'courses' AS tabla, to_regclass('public.courses') IS NOT NULL AS existe
    UNION ALL SELECT 'modules', to_regclass('public.modules') IS NOT NULL
    UNION ALL SELECT 'lessons', to_regclass('public.lessons') IS NOT NULL
    UNION ALL SELECT 'quizzes', to_regclass('public.quizzes') IS NOT NULL
    UNION ALL SELECT 'quiz_options', to_regclass('public.quiz_options') IS NOT NULL
    UNION ALL SELECT 'enrollments', to_regclass('public.enrollments') IS NOT NULL
    UNION ALL SELECT 'user_progress', to_regclass('public.user_progress') IS NOT NULL
    UNION ALL SELECT 'lesson_quiz_responses', to_regclass('public.lesson_quiz_responses') IS NOT NULL
) AS catalogo
ORDER BY tabla;

-- 3. Conteos por estado: distingue "sin cursos" de "todos inactivos"
SELECT 'courses' AS tabla, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE activo)::int AS activos FROM courses
UNION ALL
SELECT 'modules', COUNT(*)::int, COUNT(*) FILTER (WHERE activo)::int FROM modules
UNION ALL
SELECT 'lessons', COUNT(*)::int, COUNT(*) FILTER (WHERE activo)::int FROM lessons
UNION ALL
SELECT 'quizzes', COUNT(*)::int, COUNT(*) FILTER (WHERE TRUE)::int FROM quizzes
UNION ALL
SELECT 'quiz_options', COUNT(*)::int, COUNT(*) FILTER (WHERE es_correcta)::int FROM quiz_options;

-- 4. Catálogo tal como lo entrega GET /api/v1/courses (solo cursos activos)
SELECT
    c.id,
    c.titulo,
    c.area,
    c.nivel,
    c.activo,
    c.creado_en,
    (SELECT COUNT(*)::int FROM modules m WHERE m.curso_id = c.id AND m.activo) AS modulos_activos,
    (SELECT COUNT(*)::int
       FROM modules m
       JOIN lessons l ON l.modulo_id = m.id AND l.activo
      WHERE m.curso_id = c.id AND m.activo) AS lecciones_activas
FROM courses c
ORDER BY c.id;

-- 5. Cursos con módulos pero sin lecciones activas (navegación incompleta)
SELECT c.id, c.titulo, COUNT(l.id)::int AS lecciones_activas
FROM courses c
JOIN modules m ON m.curso_id = c.id AND m.activo
LEFT JOIN lessons l ON l.modulo_id = m.id AND l.activo
GROUP BY c.id, c.titulo
HAVING COUNT(l.id) = 0
ORDER BY c.id;

-- 6. Relaciones huérfanas o inactivas que romperían curso → módulo → lección
SELECT 'modules sin curso' AS problema, COUNT(*)::int AS total
FROM modules m LEFT JOIN courses c ON c.id = m.curso_id
WHERE c.id IS NULL OR c.activo = FALSE
UNION ALL
SELECT 'lessons sin módulo activo', COUNT(*)::int
FROM lessons l LEFT JOIN modules m ON m.id = l.modulo_id
WHERE m.id IS NULL OR m.activo = FALSE
UNION ALL
SELECT 'quizzes sin lección activa', COUNT(*)::int
FROM quizzes q LEFT JOIN lessons l ON l.id = q.leccion_id
WHERE l.id IS NULL OR l.activo = FALSE
UNION ALL
SELECT 'quizzes sin opciones', COUNT(*)::int
FROM quizzes q
WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id);

-- 7. Integridad de cuestionarios (4 opciones y exactamente 1 correcta)
SELECT
    q.id AS quiz_id,
    l.id AS leccion_id,
    c.titulo AS curso,
    COUNT(qo.id)::int AS opciones,
    COUNT(*) FILTER (WHERE qo.es_correcta)::int AS correctas
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
LEFT JOIN quiz_options qo ON qo.quiz_id = q.id
GROUP BY q.id, l.id, c.titulo
HAVING COUNT(qo.id) <> 4 OR COUNT(*) FILTER (WHERE qo.es_correcta) <> 1
ORDER BY q.id;

-- 8. Cursos que el SPA espera emparejar por título (loadCourseMap)
SELECT
    esperado.titulo AS curso_esperado_por_el_spa,
    c.id AS id_en_bd,
    c.activo
FROM (
    VALUES
        ('Fundamentos de Pedagogía y Didáctica'),
        ('Legislación Educativa Colombiana'),
        ('Inteligencia Artificial para Docentes')
) AS esperado(titulo)
LEFT JOIN courses c ON lower(trim(c.titulo)) = lower(trim(esperado.titulo));

-- 9. Títulos duplicados (rompen el emparejamiento por título único)
SELECT lower(trim(titulo)) AS titulo_normalizado, COUNT(*)::int AS repeticiones
FROM courses
GROUP BY lower(trim(titulo))
HAVING COUNT(*) > 1;

-- 10. Privilegios del rol de la API sobre el catálogo
SELECT tabla,
       has_table_privilege(current_user, tabla, 'SELECT') AS puede_leer
FROM (VALUES ('courses'), ('modules'), ('lessons'), ('quizzes'), ('quiz_options')) AS t(tabla);

-- 11. Existencia del resto de tablas del esquema (identidad y resultados)
--     Un login con formato válido que responde 500 suele indicar tabla o
--     columna ausente en `users`.
SELECT tabla, to_regclass('public.' || tabla) IS NOT NULL AS existe
FROM (VALUES
    ('users'),
    ('badges'),
    ('user_badges'),
    ('user_progress'),
    ('projects'),
    ('course_completion_rules'),
    ('question_bank'),
    ('quiz_attempts'),
    ('quiz_attempt_answers')
) AS t(tabla)
ORDER BY tabla;

-- 12. Columnas actuales de `users` (no falla si la tabla no existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

