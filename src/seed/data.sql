/* ============================================================
   Seed data - MéritoDocente MOOC Platform
   Versión corregida e idempotente
   ============================================================ */


/* ============================================================
   1. USUARIOS DEMO
   ============================================================ */

INSERT INTO users
(nombre, email, password_hash, telefono, departamento, rol, activo)
VALUES
(
    'Admin Demo',
    'admin@meritodocente.com',
    '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6',
    '+573001234567',
    'Cundinamarca',
    'admin',
    TRUE
),
(
    'Professor User',
    'prof@meritodocente.com',
    '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6',
    '+573009876543',
    'Antioquia',
    'teacher',
    TRUE
),
(
    'Student User',
    'student@meritodocente.com',
    '$2b$12$LQv3c1yqBwN2G5xE6Y/3BeO4Z5V7W8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6',
    '+573012345678',
    'Bogotá D.C.',
    'estudiante',
    TRUE
)
ON CONFLICT (email) DO NOTHING;


/* ============================================================
   2. CURSOS
   ============================================================ */

INSERT INTO courses
(titulo, area, nivel, descripcion, icono, activo)
SELECT
    'Fundamentos de Pedagogía y Didáctica',
    'Pedagogía y Didáctica',
    'Básico',
    'Domina los conceptos esenciales de la pedagogía moderna y las estrategias didácticas para el aula.',
    'fas fa-chalkboard-teacher',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE titulo = 'Fundamentos de Pedagogía y Didáctica'
);


INSERT INTO courses
(titulo, area, nivel, descripcion, icono, activo)
SELECT
    'Legislación Educativa Colombiana',
    'Legislación Educativa',
    'Básico',
    'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios.',
    'fas fa-gavel',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE titulo = 'Legislación Educativa Colombiana'
);


/* ============================================================
   3. MÓDULOS
   ============================================================ */

INSERT INTO modules
(curso_id, titulo, descripcion, orden,
 badge_nombre, badge_icono, badge_color, activo)
SELECT
    c.id,
    'Fundamentos de Pedagogía',
    'Conceptos esenciales de pedagogía y didáctica',
    1,
    'Pedagogo Inicial',
    'fas fa-chalkboard-teacher',
    'gold',
    TRUE
FROM courses c
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
AND NOT EXISTS (
    SELECT 1
    FROM modules m
    WHERE m.curso_id = c.id
    AND m.titulo = 'Fundamentos de Pedagogía'
);


INSERT INTO modules
(curso_id, titulo, descripcion, orden,
 badge_nombre, badge_icono, badge_color, activo)
SELECT
    c.id,
    'Corrientes Pedagógicas',
    'Corrientes pedagógicas contemporáneas y sus autores',
    2,
    'Pensador',
    'fas fa-brain',
    'green',
    TRUE
FROM courses c
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
AND NOT EXISTS (
    SELECT 1
    FROM modules m
    WHERE m.curso_id = c.id
    AND m.titulo = 'Corrientes Pedagógicas'
);


INSERT INTO modules
(curso_id, titulo, descripcion, orden,
 badge_nombre, badge_icono, badge_color, activo)
SELECT
    c.id,
    'Marco Normativo Colombiano',
    'Leyes y decretos que rigen la educación en Colombia',
    1,
    'Conocedor Normativo',
    'fas fa-gavel',
    'blue',
    TRUE
FROM courses c
WHERE c.titulo = 'Legislación Educativa Colombiana'
AND NOT EXISTS (
    SELECT 1
    FROM modules m
    WHERE m.curso_id = c.id
    AND m.titulo = 'Marco Normativo Colombiano'
);


INSERT INTO modules
(curso_id, titulo, descripcion, orden,
 badge_nombre, badge_icono, badge_color, activo)
SELECT
    c.id,
    'Constitución y Legislación',
    'Constitución Política y leyes educativas',
    2,
    'Legislador',
    'fas fa-scroll',
    'purple',
    TRUE
FROM courses c
WHERE c.titulo = 'Legislación Educativa Colombiana'
AND NOT EXISTS (
    SELECT 1
    FROM modules m
    WHERE m.curso_id = c.id
    AND m.titulo = 'Constitución y Legislación'
);


/* ============================================================
   4. LECCIONES
   IMPORTANTE:
   La tabla lessons utiliza "contenido", no "descripcion".
   ============================================================ */

INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    '¿Qué es la Pedagogía?',
    'Conceptos básicos de pedagogía',
    1,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
AND m.titulo = 'Fundamentos de Pedagogía'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = '¿Qué es la Pedagogía?'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Corrientes pedagógicas contemporáneas',
    'Estudio de las principales corrientes pedagógicas',
    1,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
AND m.titulo = 'Corrientes Pedagógicas'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Corrientes pedagógicas contemporáneas'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Ley General de Educación (Ley 115 de 1994)',
    'Marco normativo principal del sistema educativo colombiano',
    1,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
AND m.titulo = 'Marco Normativo Colombiano'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Constitución Política de Colombia',
    'Principios fundamentales de la educación en la Constitución',
    1,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
AND m.titulo = 'Constitución y Legislación'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Constitución Política de Colombia'
);


/* ============================================================
   5. QUIZZES
   ============================================================ */

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    '¿Cuál es la diferencia central entre pedagogía y didáctica?',
    'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.',
    'La pedagogía y la didáctica tienen campos relacionados, pero no son conceptos idénticos.'
FROM lessons l
WHERE l.titulo = '¿Qué es la Pedagogía?'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta =
        '¿Cuál es la diferencia central entre pedagogía y didáctica?'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Según Ausubel, el aprendizaje significativo ocurre cuando:',
    'El nuevo contenido se relaciona con los saberes previos del estudiante.',
    'El aprendizaje significativo requiere relacionar la nueva información con conocimientos previos.'
FROM lessons l
WHERE l.titulo = 'Corrientes pedagógicas contemporáneas'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta =
        'Según Ausubel, el aprendizaje significativo ocurre cuando:'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?',
    'Los fines de la educación, niveles y actores del sistema educativo colombiano.',
    'La Ley 115 desarrolla elementos fundamentales de la organización del sistema educativo colombiano.'
FROM lessons l
WHERE l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta =
        '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    '¿Cuál es el artículo principal que garantiza la educación en la Constitución?',
    'El artículo 67 reconoce la educación como un derecho y un servicio público.',
    'Revisa el artículo 67 de la Constitución Política de Colombia.'
FROM lessons l
WHERE l.titulo = 'Constitución Política de Colombia'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta =
        '¿Cuál es el artículo principal que garantiza la educación en la Constitución?'
);


/* ============================================================
   6. OPCIONES QUIZ - PEDAGOGÍA
   ============================================================ */

/* Reconciliación: el seed es la fuente canónica de las opciones.
   Se eliminan opciones obsoletas de los quizzes sembrados y luego
   se reinserta el set completo (idempotente). */
DELETE FROM quiz_options qo
USING quizzes q, lessons l
WHERE qo.quiz_id = q.id
  AND l.id = q.leccion_id
  AND (
    (
      l.titulo = '¿Qué es la Pedagogía?'
      AND q.pregunta = '¿Cuál es la diferencia central entre pedagogía y didáctica?'
    )
    OR (
      l.titulo = 'Corrientes pedagógicas contemporáneas'
      AND q.pregunta = 'Según Ausubel, el aprendizaje significativo ocurre cuando:'
    )
    OR (
      l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
      AND q.pregunta = '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
    )
    OR (
      l.titulo = 'Constitución Política de Colombia'
      AND q.pregunta = '¿Cuál es el artículo principal que garantiza la educación en la Constitución?'
    )
  );

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT
    q.id,
    v.opcion,
    v.es_correcta,
    v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (
    VALUES
    (
        'La pedagogía solo se aplica en primaria y la didáctica en secundaria.',
        FALSE,
        1
    ),
    (
        'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.',
        TRUE,
        2
    ),
    (
        'Son sinónimos exactos y se usan indistintamente.',
        FALSE,
        3
    ),
    (
        'La didáctica es teórica y la pedagogía es exclusivamente práctica.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = '¿Qué es la Pedagogía?'
AND q.pregunta =
    '¿Cuál es la diferencia central entre pedagogía y didáctica?'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
);


/* ============================================================
   7. OPCIONES QUIZ - AUSUBEL
   ============================================================ */

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT
    q.id,
    v.opcion,
    v.es_correcta,
    v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (
    VALUES
    (
        'El estudiante memoriza la información sin relacionarla.',
        FALSE,
        1
    ),
    (
        'El nuevo contenido se relaciona con los saberes previos del estudiante.',
        TRUE,
        2
    ),
    (
        'El docente expone contenidos sin participación del estudiante.',
        FALSE,
        3
    ),
    (
        'Se evalúa únicamente mediante pruebas estandarizadas.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Corrientes pedagógicas contemporáneas'
AND q.pregunta =
    'Según Ausubel, el aprendizaje significativo ocurre cuando:'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
);


/* ============================================================
   8. OPCIONES QUIZ - LEY 115
   ============================================================ */

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT
    q.id,
    v.opcion,
    v.es_correcta,
    v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (
    VALUES
    (
        'Únicamente el calendario escolar.',
        FALSE,
        1
    ),
    (
        'Los fines de la educación, niveles y actores del sistema educativo colombiano.',
        TRUE,
        2
    ),
    (
        'Únicamente el salario de los docentes.',
        FALSE,
        3
    ),
    (
        'Exclusivamente el régimen disciplinario de los estudiantes.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
AND q.pregunta =
    '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
);


/* ============================================================
   9. OPCIONES QUIZ - CONSTITUCIÓN
   ============================================================ */

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT
    q.id,
    v.opcion,
    v.es_correcta,
    v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (
    VALUES
    (
        'El artículo 67 reconoce la educación como un derecho y un servicio público.',
        TRUE,
        1
    ),
    (
        'El artículo 71 establece exclusivamente la educación ambiental.',
        FALSE,
        2
    ),
    (
        'El artículo 365 regula exclusivamente la organización curricular.',
        FALSE,
        3
    ),
    (
        'Ninguno de los anteriores.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Constitución Política de Colombia'
AND q.pregunta =
    '¿Cuál es el artículo principal que garantiza la educación en la Constitución?'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
);


/* ============================================================
   10. BADGES
   ============================================================ */

INSERT INTO badges
(modulo_id, nombre, descripcion, icono, color)
SELECT
    m.id,
    m.badge_nombre,
    CONCAT('Badge obtenido al completar ', m.titulo),
    m.badge_icono,
    m.badge_color
FROM modules m
WHERE m.badge_nombre IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM badges b
    WHERE b.modulo_id = m.id
    AND b.nombre = m.badge_nombre
);


/* ============================================================
   11. INSCRIPCIONES
   Todos los usuarios demo quedan inscritos en los dos cursos.
   ON CONFLICT evita duplicados.
   ============================================================ */

INSERT INTO enrollments
(usuario_id, curso_id, fecha_inscripcion)
SELECT
    u.id,
    c.id,
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN courses c
WHERE u.email IN (
    'admin@meritodocente.com',
    'prof@meritodocente.com',
    'student@meritodocente.com'
)
AND c.titulo IN (
    'Fundamentos de Pedagogía y Didáctica',
    'Legislación Educativa Colombiana'
)
ON CONFLICT (usuario_id, curso_id) DO NOTHING;


/* ============================================================
   12. PROGRESO INICIAL
   Solo se genera progreso para las lecciones de cursos
   en los cuales el usuario está inscrito.
   ============================================================ */

INSERT INTO user_progress
(
    usuario_id,
    leccion_id,
    completada,
    fecha_completada,
    intentos,
    puntaje
)
SELECT
    e.usuario_id,
    l.id,
    FALSE,
    NULL,
    0,
    0
FROM enrollments e
JOIN modules m
    ON m.curso_id = e.curso_id
JOIN lessons l
    ON l.modulo_id = m.id
WHERE e.usuario_id IN (
    SELECT id
    FROM users
    WHERE email IN (
        'admin@meritodocente.com',
        'prof@meritodocente.com',
        'student@meritodocente.com'
    )
)
ON CONFLICT (usuario_id, leccion_id) DO NOTHING;


/* ============================================================
   13. ACTIVIDAD DE EJEMPLO

   Profesor y estudiante tendrán completada
   la primera lección de Pedagogía.
   Usamos UPDATE y NO un segundo INSERT,
   evitando violar UNIQUE(usuario_id, leccion_id).
   ============================================================ */

UPDATE user_progress up
SET
    completada = TRUE,
    fecha_completada = CURRENT_TIMESTAMP,
    intentos = 1,
    puntaje = 100
FROM users u,
     lessons l,
     modules m,
     courses c
WHERE up.usuario_id = u.id
AND up.leccion_id = l.id
AND l.modulo_id = m.id
AND m.curso_id = c.id
AND u.email IN (
    'prof@meritodocente.com',
    'student@meritodocente.com'
)
AND c.titulo = 'Fundamentos de Pedagogía y Didáctica'
AND l.titulo = '¿Qué es la Pedagogía?';


/* ============================================================
   14. RESULTADO
   ============================================================ */

SELECT
    '✅ Seed data inserted successfully' AS resultado;

SELECT
    (SELECT COUNT(*) FROM users) AS usuarios,
    (SELECT COUNT(*) FROM courses) AS cursos,
    (SELECT COUNT(*) FROM modules) AS modulos,
    (SELECT COUNT(*) FROM lessons) AS lecciones,
    (SELECT COUNT(*) FROM quizzes) AS preguntas,
    (SELECT COUNT(*) FROM quiz_options) AS opciones,
    (SELECT COUNT(*) FROM enrollments) AS inscripciones,
    (SELECT COUNT(*) FROM user_progress) AS registros_progreso,
    (SELECT COUNT(*) FROM badges) AS badges;