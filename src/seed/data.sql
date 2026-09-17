/* ============================================================
   Seed data - MéritoDocente MOOC Platform
   Versión corregida e idempotente
   ============================================================ */

/* Tablas de intentos del quiz independiente. Se mantienen aquí
   para que el seed también prepare bases existentes. */
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


INSERT INTO courses
(titulo, area, nivel, descripcion, icono, activo)
SELECT
    'Evaluación Educativa y Autonomía Institucional',
    'Evaluación Educativa',
    'Avanzado',
    'Analiza situaciones complejas sobre evaluación, SIEE, PEI y autonomía institucional en el contexto educativo colombiano.',
    'fas fa-clipboard-check',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE titulo = 'Evaluación Educativa y Autonomía Institucional'
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


INSERT INTO modules
(curso_id, titulo, descripcion, orden,
 badge_nombre, badge_icono, badge_color, activo)
SELECT
    c.id,
    'Evaluación y Autonomía Institucional',
    'Análisis normativo y toma de decisiones pedagógicas',
    1,
    'Analista Institucional',
    'fas fa-clipboard-check',
    'blue',
    TRUE
FROM courses c
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM modules m
    WHERE m.curso_id = c.id
    AND m.titulo = 'Evaluación y Autonomía Institucional'
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


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Evaluación integral y autonomía del SIEE',
    'Análisis de criterios, ponderaciones y evidencias en la evaluación institucional.',
    1,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Evaluación integral y autonomía del SIEE'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'PEI, participación y autonomía institucional',
    'Análisis del procedimiento para actualizar el PEI y distribuir responsabilidades entre los órganos escolares.',
    2,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'PEI, participación y autonomía institucional'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Convivencia escolar y protección frente al acoso',
    'Análisis de responsabilidades institucionales ante situaciones de acoso y ciberacoso.',
    3,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Convivencia escolar y protección frente al acoso'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Educación inclusiva y ajustes pedagógicos',
    'Análisis de barreras, apoyos, ajustes y seguimiento sin reducir las expectativas de aprendizaje.',
    4,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Educación inclusiva y ajustes pedagógicos'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'PEI, currículo y autonomía institucional',
    'Análisis de diagnóstico institucional, currículo, participación y actualización del PEI.',
    5,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'PEI, currículo y autonomía institucional'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Gobierno escolar y distribución de competencias',
    'Análisis de las funciones de los órganos del gobierno escolar y las responsabilidades institucionales.',
    6,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Gobierno escolar y distribución de competencias'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Función docente, planeación y contexto',
    'Análisis de la responsabilidad profesional docente para contextualizar la planeación y articularla con el currículo y el PEI.',
    7,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Función docente, planeación y contexto'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Familia, autonomía escolar y responsabilidad docente',
    'Análisis de la participación familiar, la autonomía pedagógica y la responsabilidad institucional en el acompañamiento.',
    8,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Familia, autonomía escolar y responsabilidad docente'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Protección de derechos, confidencialidad y actuación institucional',
    'Análisis de la actuación docente e institucional ante posibles situaciones de vulneración de derechos.',
    9,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Protección de derechos, confidencialidad y actuación institucional'
);


INSERT INTO lessons
(modulo_id, titulo, contenido, orden, tiene_quiz, activo)
SELECT
    m.id,
    'Familia, información y participación educativa',
    'Análisis del derecho de las familias a la información y participación, junto con la protección de datos y la autonomía profesional docente.',
    10,
    TRUE,
    TRUE
FROM modules m
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Evaluación Educativa y Autonomía Institucional'
AND m.titulo = 'Evaluación y Autonomía Institucional'
AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.modulo_id = m.id
    AND l.titulo = 'Familia, información y participación educativa'
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


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Al finalizar un período, una prueba acumulativa arroja resultados bajos para dos estudiantes, aunque su portafolio evidencia progresión, las rúbricas muestran superación de desempeños y la autoevaluación es consistente. Si el SIEE ya contempla criterios, valoración integral y seguimiento, ¿qué decisión respeta mejor la autonomía institucional sin alterar extemporáneamente las reglas de evaluación?',
    'La decisión correcta es mantener los criterios y ponderaciones definidos previamente en el SIEE y resolver la tensión mediante una actividad adicional equivalente, siempre que sea compatible con el sistema adoptado. Así se integran nuevas evidencias sin reponderar la prueba durante el período.',
    'No es procedente conservar mecánicamente la prueba ignorando el proceso, reponderarla después de conocer los resultados ni sustituirla unilateralmente por evidencias procesuales. La autonomía exige aplicar el SIEE previamente adoptado y no cambiar sus reglas sobre la marcha.'
FROM lessons l
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Al finalizar un período, una prueba acumulativa arroja resultados bajos%'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'En una institución educativa oficial, el SIEE establece desde el inicio del año que la valoración es continua, que los estudiantes con desempeños bajos deben recibir estrategias de apoyo durante cada período y que la promoción se determina con base en el proceso desarrollado a lo largo del año. Al finalizar el cuarto período, una estudiante de grado octavo presenta desempeño bajo en dos áreas. En una de ellas las dificultades fueron identificadas desde el segundo período, pero las actividades de apoyo previstas no se desarrollaron; en la otra sí existen evidencias de apoyo, retroalimentación y nuevas oportunidades de valoración, aunque no alcanzó los desempeños. ¿Qué decisión institucional es más consistente con el Decreto 1290 de 2009?',
    'La institución debe revisar separadamente el proceso de cada área: aplicar el SIEE donde sí hubo apoyo y seguimiento, y subsanar la omisión donde las estrategias previstas no se garantizaron, permitiendo demostrar los aprendizajes sin convertir automáticamente una prueba final no prevista en el SIEE en el criterio de promoción.',
    'No basta con aplicar mecánicamente la no promoción ni corresponde crear una prueba extraordinaria general no prevista. La autonomía institucional debe ejercerse junto con la valoración integral, el seguimiento y la garantía efectiva de las estrategias de apoyo establecidas en el SIEE.'
FROM lessons l
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'En una institución educativa oficial, el SIEE establece desde el inicio del año%'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Al finalizar el tercer período, una docente de grado séptimo encuentra que tres estudiantes no alcanzaron los desempeños previstos en su área. El SIEE establece valoración continua, diversidad de evidencias, retroalimentación y estrategias de apoyo durante cada período. Al revisar los registros, observa que uno de los estudiantes obtuvo resultados bajos en las dos pruebas escritas, pero sus producciones posteriores, corregidas a partir de retroalimentación, evidencian progresión consistente; otro presenta resultados bajos tanto en pruebas como en actividades de aplicación, pese a haber participado en las estrategias de apoyo; y del tercero existen calificaciones bajas, pero no aparecen registros suficientes de retroalimentación ni de las actividades de apoyo que debían implementarse. La coordinación académica solicita cerrar las valoraciones dentro del plazo institucional y advierte que los criterios de evaluación y sus ponderaciones fueron comunicados desde el inicio del año. Las familias de los tres estudiantes solicitan una actividad adicional antes del cierre, argumentando que debe garantizarse igualdad de oportunidades. ¿Cuál actuación permite resolver de manera más consistente los tres casos?',
    'Debe conservarse el SIEE e individualizar la respuesta: valorar la progresión del primer caso sin convertirla automáticamente en aprobación, aplicar los criterios al segundo con las evidencias disponibles y garantizar en el tercero las acciones de seguimiento y apoyo omitidas antes de atribuirle exclusivamente las consecuencias del cierre.',
    'La igualdad no exige una recuperación idéntica para los tres casos ni permite que un órgano colegiado sustituya el análisis pedagógico. Tampoco corresponde reemplazar automáticamente valoraciones previas: la respuesta debe atender las diferencias en evidencias, apoyos y garantías del proceso.'
FROM lessons l
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Al finalizar el tercer período, una docente de grado séptimo%'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Durante un proyecto de grado octavo, cuatro estudiantes crean un grupo de mensajería para distribuir tareas. Con el transcurso de las semanas, uno de ellos comienza a recibir montajes de sus fotografías, mensajes despectivos y audios en los que dos compañeros ridiculizan reiteradamente su forma de hablar. Parte del contenido se publica durante fines de semana desde dispositivos personales. El estudiante informa a su directora de grupo, pero solicita que nadie sea citado porque teme que la situación empeore. Al indagar sin confrontar públicamente a los involucrados, la docente encuentra indicios de reiteración y constata que el estudiante ha dejado de participar en el proyecto y ha faltado algunos días. Uno de los señalados reconoce haber enviado mensajes, aunque sostiene que existía confianza entre ellos y que nunca pretendió causar daño. La madre del estudiante afectado conoce posteriormente la situación y exige la expulsión inmediata. El rector señala que antes de adoptar decisiones deben establecerse las características de los hechos y garantizarse los procedimientos institucionales. ¿Cuál actuación corresponde con mayor precisión a las responsabilidades que surgen de la situación?',
    'La actuación debe iniciar poniendo oportunamente los hechos en conocimiento de las instancias institucionales, adoptando medidas de acompañamiento y protección y garantizando la participación y los derechos de los involucrados, sin exigir que la docente determine por sí sola la existencia definitiva de acoso ni convertir la expulsión en sanción automática.',
    'La reserva solicitada no permite aplazar indefinidamente la activación institucional, y la reiteración no autoriza a clasificar o sancionar de manera automática. La institución debe proteger, verificar los hechos y respetar el procedimiento y los derechos de las partes.'
FROM lessons l
WHERE l.titulo = 'Convivencia escolar y protección frente al acoso'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Durante un proyecto de grado octavo, un estudiante recibe montajes%'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Una estudiante de sexto grado presenta durante el primer semestre dificultades persistentes para organizar información extensa, completar evaluaciones dentro del tiempo ordinario y seguir instrucciones que contienen varias acciones consecutivas. Sin embargo, cuando recibe instrucciones segmentadas, organizadores visuales y tiempos adicionales, alcanza los mismos aprendizajes previstos para el grupo. No existe diagnóstico clínico ni certificado de discapacidad. La familia informa que ha solicitado una valoración externa, pero esta tardará varios meses. En reunión de docentes se proponen cuatro alternativas. El director de grupo advierte además que algunas de las medidas implementadas inicialmente para la estudiante han resultado beneficiosas para otros alumnos y que el establecimiento debe evitar tanto disminuir injustificadamente las expectativas como convertir una respuesta pedagógica en un diagnóstico. ¿Qué curso de actuación resulta más consistente?',
    'La institución debe documentar las barreras y respuestas observadas, mantener los objetivos de aprendizaje, incorporar estrategias que favorezcan al grupo y aplicar apoyos o ajustes pedagógicamente justificados con seguimiento, sin condicionar necesariamente la respuesta a un diagnóstico clínico previo.',
    'No corresponde esperar el diagnóstico para remover barreras ni reducir anticipadamente las expectativas. Tampoco es necesario convertir una estrategia útil para el grupo en una medida exclusivamente individual: deben combinarse accesibilidad, apoyos pertinentes y seguimiento.'
FROM lessons l
WHERE l.titulo = 'Educación inclusiva y ajustes pedagógicos'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Una estudiante de sexto grado presenta dificultades persistentes%'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'En una institución oficial, el SIEE establece que la autoevaluación constituye una de las evidencias del proceso, que los resultados deben ser objeto de seguimiento continuo y que las estrategias de apoyo se desarrollan durante el período. En grado noveno, un estudiante obtiene desempeño alto en producciones escritas, proyectos y actividades de aplicación, pero bajo en una prueba acumulativa que representa el porcentaje individual más alto de la valoración. Su autoevaluación reconoce dificultades específicas presentes en la prueba y describe cómo las corrigió posteriormente en dos actividades. La docente comprueba esas mejoras. No obstante, al aplicar literalmente las ponderaciones previamente establecidas, el resultado numérico queda apenas por debajo del nivel aprobatorio. El Consejo Académico considera tres posibilidades: modificar excepcionalmente el porcentaje de la prueba; mantener el resultado matemático sin más análisis; o examinar cómo deben operar los criterios previamente definidos frente al conjunto de evidencias. La familia solicita que simplemente se elimine la prueba porque considera que la evaluación formativa no puede producir reprobación. ¿Qué decisión conserva mejor la coherencia entre las reglas institucionales y el proceso evaluativo?',
    'Debe mantenerse el marco de ponderaciones, pero interpretarse el resultado dentro del conjunto de criterios y evidencias que reconoce el SIEE, verificando los aprendizajes demostrados, la progresión posterior y el seguimiento, sin modificar retrospectivamente porcentajes ni eliminar discrecionalmente la prueba.',
    'No corresponde recalcular porcentajes o sustituir una evidencia de manera excepcional, pero tampoco basta con aceptar el resultado aritmético sin analizar el proceso. La decisión debe estar sustentada en los criterios y evidencias previstos por el SIEE.'
FROM lessons l
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'En una institución oficial, el SIEE establece que la autoevaluación es una evidencia%'
);


UPDATE quizzes q
SET pregunta = 'Al finalizar el tercer período, una docente de grado séptimo encuentra que tres estudiantes no alcanzaron los desempeños previstos en su área. El SIEE establece valoración continua, diversidad de evidencias, retroalimentación y estrategias de apoyo durante cada período. Al revisar los registros, observa que uno de los estudiantes obtuvo resultados bajos en las dos pruebas escritas, pero sus producciones posteriores, corregidas a partir de retroalimentación, evidencian progresión consistente; otro presenta resultados bajos tanto en pruebas como en actividades de aplicación, pese a haber participado en las estrategias de apoyo; y del tercero existen calificaciones bajas, pero no aparecen registros suficientes de retroalimentación ni de las actividades de apoyo que debían implementarse. La coordinación académica solicita cerrar las valoraciones dentro del plazo institucional y advierte que los criterios de evaluación y sus ponderaciones fueron comunicados desde el inicio del año. Las familias de los tres estudiantes solicitan una actividad adicional antes del cierre, argumentando que debe garantizarse igualdad de oportunidades. ¿Cuál actuación permite resolver de manera más consistente los tres casos?'
WHERE q.leccion_id = (SELECT l.id FROM lessons l WHERE l.titulo = 'Evaluación integral y autonomía del SIEE')
AND q.pregunta LIKE 'Al finalizar el tercer período, una docente de grado séptimo%';

UPDATE quizzes q
SET pregunta = 'Durante un proyecto de grado octavo, cuatro estudiantes crean un grupo de mensajería para distribuir tareas. Con el transcurso de las semanas, uno de ellos comienza a recibir montajes de sus fotografías, mensajes despectivos y audios en los que dos compañeros ridiculizan reiteradamente su forma de hablar. Parte del contenido se publica durante fines de semana desde dispositivos personales. El estudiante informa a su directora de grupo, pero solicita que nadie sea citado porque teme que la situación empeore. Al indagar sin confrontar públicamente a los involucrados, la docente encuentra indicios de reiteración y constata que el estudiante ha dejado de participar en el proyecto y ha faltado algunos días. Uno de los señalados reconoce haber enviado mensajes, aunque sostiene que existía confianza entre ellos y que nunca pretendió causar daño. La madre del estudiante afectado conoce posteriormente la situación y exige la expulsión inmediata. El rector señala que antes de adoptar decisiones deben establecerse las características de los hechos y garantizarse los procedimientos institucionales. ¿Cuál actuación corresponde con mayor precisión a las responsabilidades que surgen de la situación?'
WHERE q.leccion_id = (SELECT l.id FROM lessons l WHERE l.titulo = 'Convivencia escolar y protección frente al acoso')
AND q.pregunta LIKE 'Durante un proyecto de grado octavo, un estudiante recibe montajes%';

UPDATE quizzes q
SET pregunta = 'Una estudiante de sexto grado presenta durante el primer semestre dificultades persistentes para organizar información extensa, completar evaluaciones dentro del tiempo ordinario y seguir instrucciones que contienen varias acciones consecutivas. Sin embargo, cuando recibe instrucciones segmentadas, organizadores visuales y tiempos adicionales, alcanza los mismos aprendizajes previstos para el grupo. No existe diagnóstico clínico ni certificado de discapacidad. La familia informa que ha solicitado una valoración externa, pero esta tardará varios meses. En reunión de docentes se proponen cuatro alternativas. El director de grupo advierte además que algunas de las medidas implementadas inicialmente para la estudiante han resultado beneficiosas para otros alumnos y que el establecimiento debe evitar tanto disminuir injustificadamente las expectativas como convertir una respuesta pedagógica en un diagnóstico. ¿Qué curso de actuación resulta más consistente?'
WHERE q.leccion_id = (SELECT l.id FROM lessons l WHERE l.titulo = 'Educación inclusiva y ajustes pedagógicos')
AND q.pregunta LIKE 'Una estudiante de sexto grado presenta dificultades persistentes%';

UPDATE quizzes q
SET pregunta = 'En una institución oficial, el SIEE establece que la autoevaluación constituye una de las evidencias del proceso, que los resultados deben ser objeto de seguimiento continuo y que las estrategias de apoyo se desarrollan durante el período. En grado noveno, un estudiante obtiene desempeño alto en producciones escritas, proyectos y actividades de aplicación, pero bajo en una prueba acumulativa que representa el porcentaje individual más alto de la valoración. Su autoevaluación reconoce dificultades específicas presentes en la prueba y describe cómo las corrigió posteriormente en dos actividades. La docente comprueba esas mejoras. No obstante, al aplicar literalmente las ponderaciones previamente establecidas, el resultado numérico queda apenas por debajo del nivel aprobatorio. El Consejo Académico considera tres posibilidades: modificar excepcionalmente el porcentaje de la prueba; mantener el resultado matemático sin más análisis; o examinar cómo deben operar los criterios previamente definidos frente al conjunto de evidencias. La familia solicita que simplemente se elimine la prueba porque considera que la evaluación formativa no puede producir reprobación. ¿Qué decisión conserva mejor la coherencia entre las reglas institucionales y el proceso evaluativo?'
WHERE q.leccion_id = (SELECT l.id FROM lessons l WHERE l.titulo = 'Evaluación integral y autonomía del SIEE')
AND q.pregunta LIKE 'En una institución oficial, el SIEE establece que la autoevaluación es una evidencia%';


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Una institución identifica cambios en su población y diseña una propuesta pedagógica que exige ajustes curriculares. Antes de formalizar la modificación del PEI, considera implementarla transitoriamente por urgencia. ¿Cuál procedimiento distribuye con mayor precisión las competencias institucionales?',
    'La institución debe desarrollar el procedimiento participativo y elevar la propuesta al consejo directivo para que decida su adopción; el consejo académico aporta el análisis y la asesoría pedagógica, pero no reemplaza al órgano competente para adoptar el PEI.',
    'La urgencia pedagógica no habilita a implementar unilateralmente una modificación del PEI ni a postergar su adopción formal. El aval consultivo del consejo académico no sustituye el procedimiento participativo ni la decisión del consejo directivo.'
FROM lessons l
WHERE l.titulo = 'PEI, participación y autonomía institucional'
AND NOT EXISTS (
    SELECT 1
    FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Una institución identifica cambios en su población%'
);


INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Durante una actividad de laboratorio en grado décimo desaparece un teléfono celular. Dos estudiantes manifiestan haber visto a un compañero cerca del lugar donde estaba el dispositivo y uno afirma que anteriormente lo escuchó decir que necesitaba dinero. El coordinador revisa, con autorización del estudiante, su maleta y encuentra el teléfono entre sus pertenencias. El estudiante sostiene que otro compañero lo introdujo allí para perjudicarlo y solicita revisar las cámaras de seguridad. El manual de convivencia tipifica la apropiación de bienes ajenos como una conducta grave y contempla medidas que pueden afectar la permanencia del estudiante, previa aplicación del procedimiento correspondiente. La familia del propietario exige una sanción inmediata; varios docentes consideran que el hallazgo constituye evidencia suficiente; y el rector señala que la institución debe responder con prontitud porque la demora podría interpretarse como tolerancia frente a la conducta. ¿Cuál actuación institucional resulta más consistente?',
    'La institución debe documentar los hechos, preservar las evidencias, escuchar al estudiante y a quienes puedan aportar información, permitir la contradicción y decidir por la autoridad competente conforme al procedimiento, diferenciando medidas inmediatas de protección de una sanción que presuponga responsabilidad.',
    'El hallazgo material no elimina la presunción de responsabilidad ni permite sancionar de inmediato. Tampoco corresponde suspender sin garantías, remitir el caso y detener la actuación institucional o confundir una medida preventiva con una consecuencia disciplinaria.'
FROM lessons l
WHERE l.titulo = 'Convivencia escolar y protección frente al acoso'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Durante una actividad de laboratorio en grado décimo desaparece un teléfono celular%'
);

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Después de analizar los resultados institucionales de dos años consecutivos, el Consejo Académico concluye que existen dificultades en la articulación curricular entre quinto y sexto grado. Como respuesta, aprueba una reorganización que modifica secuencias de aprendizaje, criterios comunes de planeación y mecanismos de seguimiento entre áreas. El rector considera técnicamente pertinente la propuesta, pero advierte que algunos componentes inciden en elementos formalizados dentro del PEI y el plan de estudios. Un grupo de docentes solicita comenzar inmediatamente porque la propuesta ya fue aprobada por el órgano encargado de estudiar el currículo. El Consejo Directivo considera que puede modificar directamente los componentes pedagógicos antes de aprobarlos definitivamente. ¿Cuál actuación conserva mejor las competencias de los órganos involucrados?',
    'Debe reconocerse la función del Consejo Académico de estudiar, organizar y orientar los asuntos curriculares, pero tramitar las modificaciones que incidan en componentes institucionales mediante los procedimientos y órganos correspondientes, sin sustituir las competencias de adopción ni la elaboración técnica.',
    'La aprobación académica no basta para modificar componentes formalizados del PEI, y el Consejo Directivo no debe elaborar directamente los aspectos técnicos que corresponden al ámbito académico. La modificación debe seguir el procedimiento institucional.'
FROM lessons l
WHERE l.titulo = 'Gobierno escolar y distribución de competencias'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Después de analizar los resultados institucionales de dos años consecutivos%'
);

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Un docente de Ciencias Sociales de grado noveno decide reemplazar durante un período buena parte de las actividades previstas en el plan de área por una secuencia diseñada a partir de problemas contemporáneos del contexto local. La propuesta desarrolla argumentación, interpretación de fuentes y participación ciudadana, pero deja sin abordar algunos contenidos y desempeños programados. El docente sostiene que sus estudiantes alcanzan aprendizajes más significativos y que la libertad de cátedra le permite seleccionar contenidos y métodos. El jefe de área reconoce el valor de la propuesta, aunque advierte que los estudiantes deberán continuar posteriormente una secuencia curricular articulada con otros grados. ¿Cuál decisión armoniza mejor las responsabilidades involucradas?',
    'Debe analizarse la propuesta frente a los referentes curriculares, propósitos del área, aprendizajes previstos y articulación institucional; conservar las innovaciones pertinentes, ajustar lo necesario para garantizar los aprendizajes y tramitar las modificaciones mediante los espacios institucionales correspondientes.',
    'La libertad de cátedra no autoriza a sustituir unilateralmente los referentes institucionales ni obliga a eliminar toda innovación. La equivalencia no se presume por los resultados y no puede formalizarse retrospectivamente sin articulación institucional.'
FROM lessons l
WHERE l.titulo = 'Función docente, planeación y contexto'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Un docente de Ciencias Sociales de grado noveno decide reemplazar durante un período%'
);

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Una estudiante de grado octavo solicita hablar en privado con su directora de grupo. Le manifiesta que durante las últimas semanas ha recibido mensajes de un adulto conocido de su familia que le generan temor y que recientemente este le pidió encontrarse con él sin informar a sus padres. La estudiante insiste en que nadie conozca la conversación porque teme provocar un conflicto familiar y afirma que dejará de responder los mensajes. No presenta lesiones visibles ni informa que haya ocurrido un encuentro. La docente considera importante preservar su confianza, pero advierte que la información podría revelar una situación que excede el manejo pedagógico ordinario. ¿Cuál actuación resulta más consistente con las responsabilidades de la docente y del establecimiento?',
    'Debe comunicarse oportunamente la información por los conductos institucionales para activar las actuaciones de protección, preservar la intimidad frente a quienes no necesiten conocer el caso y evitar interrogatorios o investigaciones propias, sin usar la confidencialidad para posponer una actuación potencialmente protectora.',
    'La ausencia de lesiones o de un encuentro consumado no permite esperar nuevas evidencias. La docente no debe investigar por cuenta propia ni trasladar la decisión exclusivamente a la familia antes de activar los mecanismos institucionales de protección.'
FROM lessons l
WHERE l.titulo = 'Protección de derechos, confidencialidad y actuación institucional'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Una estudiante de grado octavo solicita hablar en privado%'
);

/* ============================================================
   6. OPCIONES QUIZ - PEDAGOGÍA
   ============================================================ */

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT l.id,
    'En grado octavo, cuatro estudiantes desarrollan durante seis semanas un proyecto interdisciplinario cuya valoración combina producto colectivo, sustentación individual, bitácora y coevaluación. Dos días antes de la entrega final, uno elimina deliberadamente una carpeta compartida que contenía parte del trabajo del equipo. La información puede recuperarse parcialmente y el estudiante reconoce haberla eliminado, aunque afirma que varios archivos eran elaboraciones suyas y que actuó molesto porque sus compañeros habían modificado sus aportes sin consultarlo. El manual de convivencia contempla procedimientos frente al uso inadecuado de recursos tecnológicos y afectaciones a otros integrantes. El SIEE establece que la valoración debe corresponder a evidencias del aprendizaje individual y colectivo. ¿Qué debe hacer la institución?',
    'Debe separar, aunque articular, las consecuencias de convivencia y la valoración de aprendizajes: reconstruir las evidencias, valorar los desempeños individuales y colectivos efectivamente demostrados y aplicar el procedimiento por la eliminación de archivos, sin usar la calificación como sanción ni ignorar sus efectos reales sobre las evidencias.',
    'La conducta no autoriza a asignar cero automáticamente ni a mantener intacta la calificación sin analizar las evidencias afectadas. La valoración académica y el procedimiento de convivencia tienen finalidades y garantías distintas.'
FROM lessons l WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.leccion_id=l.id AND q.pregunta LIKE 'En grado octavo, cuatro estudiantes desarrollan durante seis semanas%');

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT l.id,
    'Una institución oficial identifica un aumento sostenido de reprobación y ausentismo durante la transición de quinto a sexto. Después de analizar información académica, entrevistas con familias y observaciones docentes, un equipo propone reorganizar parcialmente el primer período de sexto con secuencias articuladas, acompañamiento y nuevos mecanismos de seguimiento. El Consejo Académico considera pertinente la propuesta y el rector dispone iniciar un piloto mientras se tramitan ajustes institucionales. ¿Cuál alternativa organiza con mayor precisión las actuaciones?',
    'Debe reconocerse la función del Consejo Académico en asuntos pedagógicos y curriculares, determinar qué puede desarrollarse dentro de la planeación vigente y qué exige modificaciones institucionales, y articular rectoría y órganos de gobierno según sus competencias, sin desplazar atribuciones por urgencia o jerarquía.',
    'La pertinencia académica no autoriza un piloto que modifique sin trámite componentes institucionales, y el Consejo Directivo no debe asumir la elaboración técnica. La respuesta debe distinguir implementación dentro de lo vigente y cambios que requieren adopción formal.'
FROM lessons l WHERE l.titulo = 'PEI, currículo y autonomía institucional'
AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.leccion_id=l.id AND q.pregunta LIKE 'Una institución oficial identifica un aumento sostenido de reprobación%');

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT l.id,
    'Una estudiante de séptimo grado ha trabajado durante el año con apoyos y ajustes documentados a partir de una valoración pedagógica. En Matemáticas conserva los mismos propósitos fundamentales del grado, utiliza material concreto, instrucciones segmentadas y tiempos diferenciados, y evidencia avances significativos, aunque algunas evidencias muestran que todavía no alcanza determinados desempeños. Algunas metas, apoyos y criterios quedaron documentados, pero no todas las acciones acordadas fueron ejecutadas con la regularidad prevista. ¿Qué actuación resulta más consistente antes de adoptar la decisión?',
    'Debe examinarse lo alcanzado a la luz de los criterios institucionales, propósitos curriculares y ajustes, verificando también si los apoyos fueron implementados; ante omisiones relevantes, deben adoptarse medidas pedagógicas antes de hacer recaer sus efectos sobre la estudiante, sin convertir progreso o uniformidad instrumental en promoción automática.',
    'Los ajustes no sustituyen automáticamente los criterios del grado ni hacen del progreso individual el único criterio. Tampoco permite la igualdad aplicar instrumentos idénticos ignorando barreras, apoyos previstos y omisiones institucionales.'
FROM lessons l WHERE l.titulo = 'Educación inclusiva y ajustes pedagógicos'
AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.leccion_id=l.id AND q.pregunta LIKE 'Una estudiante de séptimo grado ha trabajado durante el año%');

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT l.id,
    'Dos estudiantes de grado noveno mantienen desde hace meses una relación conflictiva, con insultos, exclusión y comentarios ofensivos en redes sociales. En tres ocasiones uno difundió montajes ridiculizando al otro, pero también existen respuestas ofensivas y una confrontación iniciada por este último. Una familia exige reconocer inmediatamente a su hijo como víctima de acoso y al otro como agresor. ¿Cuál actuación ofrece el tratamiento inicial más consistente?',
    'Debe reconstruirse la reiteración, efectos y dinámica de las conductas, incluyendo posibles relaciones de poder y actuaciones de ambos; adoptar medidas de protección necesarias y tramitar la situación por los protocolos, sin deducir automáticamente de la reciprocidad igualdad entre las partes ni de la reiteración una clasificación definitiva.',
    'La reciprocidad no convierte automáticamente el caso en conflicto ni la reiteración basta para clasificarlo como acoso. La institución debe caracterizar los hechos, proteger y aplicar el protocolo correspondiente con garantías.'
FROM lessons l WHERE l.titulo = 'Convivencia escolar y protección frente al acoso'
AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.leccion_id=l.id AND q.pregunta LIKE 'Dos estudiantes de grado noveno mantienen desde hace meses%');

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT l.id,
    'Durante el primer período, un estudiante de cuarto grado muestra disminución progresiva en participación y cumplimiento. La docente implementa cambios metodológicos y registra avances parciales. El padre exige copia completa de calificaciones, anotaciones, observaciones sobre otros estudiantes y comunicaciones internas entre docentes, además de autorización previa para cualquier cambio metodológico aplicado a su hijo. ¿Cuál respuesta institucional resulta más consistente?',
    'Debe garantizarse información pertinente y comprensible sobre el proceso del estudiante, avances, dificultades, criterios y acompañamiento, establecer diálogo y participación familiar y proteger la información de terceros, diferenciando ese derecho del supuesto poder de autorizar cada decisión metodológica ordinaria.',
    'La familia tiene derecho a conocer y participar en el acompañamiento, pero no a recibir información de terceros o comunicaciones internas sin límite ni a autorizar cada decisión profesional. Tampoco corresponde negar toda información adicional al boletín.'
FROM lessons l WHERE l.titulo = 'Familia, información y participación educativa'
AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.leccion_id=l.id AND q.pregunta LIKE 'Durante el primer período, un estudiante de cuarto grado%');

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Una institución educativa oficial inicia la revisión de su Proyecto Educativo Institucional después de identificar bajo desempeño sostenido en comprensión lectora en varios grados. El rector propone incorporar una estrategia transversal de lectura que comprometa a todas las áreas y solicita que cada docente incluya actividades de comprensión y argumentación relacionadas con los contenidos de su asignatura. Un grupo de profesores objeta que esta decisión invade la autonomía de cada área y sostiene que las dificultades lectoras deben ser atendidas exclusivamente por Lengua Castellana. El Consejo Académico, por su parte, propone modificar inmediatamente los planes de área y comenzar su implementación mientras posteriormente se actualizan los componentes correspondientes del PEI. Algunos padres apoyan la estrategia, pero solicitan participar antes de que se consoliden los cambios porque consideran que estos pueden modificar prácticas pedagógicas y criterios institucionales que afectan a sus hijos. ¿Cuál actuación articula de manera más consistente las competencias institucionales involucradas?',
    'La propuesta debe partir del diagnóstico, pasar por las instancias competentes, incluir la participación correspondiente y adoptar las modificaciones del PEI mediante el procedimiento institucional, sin reducir la comprensión lectora a un área ni reemplazar la participación por una decisión unilateral.',
    'El Consejo Académico no puede adoptar por sí solo modificaciones del PEI, el Consejo Directivo no absorbe todas las funciones pedagógicas y la autonomía de las áreas no justifica una respuesta fragmentada frente a un problema institucional.'
FROM lessons l
WHERE l.titulo = 'PEI, currículo y autonomía institucional'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Una institución educativa oficial inicia la revisión de su Proyecto Educativo Institucional%'
);

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'En una institución oficial se presentan dificultades reiteradas con el cumplimiento de horarios, la entrega tardía de informes académicos y diferencias entre docentes sobre orientaciones pedagógicas. Después de recibir quejas de varias familias, el Consejo Directivo aprueba un procedimiento obligatorio de seguimiento semanal a los docentes y dispone que los casos de incumplimiento sean evaluados directamente por dicho Consejo. El rector advierte que algunas actuaciones podrían corresponder a otras autoridades. El Consejo Académico sostiene que cualquier asunto relacionado con docentes debe pasar por él. ¿Cuál curso de acción preserva mejor la distribución institucional de responsabilidades?',
    'Debe diferenciarse la naturaleza de cada asunto: el Consejo Académico conserva lo relativo a orientación pedagógica, la rectoría ejerce las funciones de dirección, coordinación y seguimiento que le correspondan y cada órgano actúa dentro de sus atribuciones, sin que el Consejo Directivo absorba competencias específicas.',
    'La condición de máxima instancia no permite al Consejo Directivo absorber todas las competencias, ni el Consejo Académico reemplaza a la rectoría en funciones de dirección y seguimiento. Las decisiones deben tramitarse según la competencia normativa de cada actor.'
FROM lessons l
WHERE l.titulo = 'Gobierno escolar y distribución de competencias'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'En una institución oficial se presentan dificultades reiteradas con el cumplimiento de horarios%'
);

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Una docente de Ciencias Naturales de grado sexto recibe al inicio del año una planeación institucional utilizada durante los tres años anteriores. Esta contiene contenidos, actividades, tiempos e instrumentos de evaluación uniformes para todos los grupos. Durante las primeras semanas identifica conocimientos previos muy heterogéneos: algunos estudiantes resuelven situaciones de indagación, mientras otros tienen dificultades para interpretar información básica. Además, la institución dispone de nuevos recursos tecnológicos y el PEI establece fortalecer el aprendizaje autónomo, el trabajo colaborativo y la relación con el contexto. ¿Qué actuación corresponde de manera más completa a la responsabilidad profesional de la docente?',
    'Debe analizar la planeación a la luz del currículo, el PEI, los referentes aplicables y las características del grupo; conservar los propósitos institucionales y ajustar estrategias, secuencias, recursos y seguimiento cuando sea pedagógicamente necesario, documentándolo y articulándolo con la planeación institucional.',
    'La planeación institucional no debe aplicarse de manera rígida ni reemplazarse unilateralmente. La docente debe contextualizarla sin romper la coherencia curricular ni esperar a que una evaluación formal revele dificultades ya identificadas.'
FROM lessons l
WHERE l.titulo = 'Función docente, planeación y contexto'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Una docente de Ciencias Naturales de grado sexto recibe al inicio del año%'
);

INSERT INTO quizzes
(leccion_id, pregunta, explicacion_correcta, explicacion_incorrecta)
SELECT
    l.id,
    'Durante el segundo período, la madre de un estudiante de quinto grado solicita que su hijo no participe en un proyecto grupal porque considera que dos compañeros le hacen perder tiempo y pueden afectar su calificación. El estudiante manifiesta que desea continuar trabajando con el grupo. La docente verifica desacuerdos sobre la distribución de tareas, pero no encuentra elementos suficientes para establecer agresión. Las evidencias muestran que el estudiante cumple los aprendizajes, aunque necesita mejorar la negociación de responsabilidades. La madre exige un proyecto individual y afirma que puede decidir las condiciones de participación. ¿Cuál actuación resulta institucional y pedagógicamente más consistente?',
    'La institución debe analizar las dificultades con el estudiante y el grupo, implementar estrategias para mejorar la distribución de responsabilidades y hacer seguimiento; debe escuchar e informar a la familia e involucrarla en el acompañamiento, sin darle facultad unilateral para sustituir una decisión pedagógica ni desconocer la participación del estudiante.',
    'La familia participa y puede ser escuchada, pero no decide unilateralmente la metodología. Tampoco basta con rechazar la solicitud o remitirla directamente al Consejo Directivo: corresponde una intervención pedagógica y un seguimiento proporcionales a la situación.'
FROM lessons l
WHERE l.titulo = 'Familia, autonomía escolar y responsabilidad docente'
AND NOT EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.leccion_id = l.id
    AND q.pregunta LIKE 'Durante el segundo período, la madre de un estudiante de quinto grado%'
);

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
        OR (
            l.titulo = 'Evaluación integral y autonomía del SIEE'
            AND q.pregunta LIKE 'Al finalizar un período, una prueba acumulativa arroja resultados bajos%'
        )
        OR (
            l.titulo = 'Evaluación integral y autonomía del SIEE'
            AND q.pregunta LIKE 'En una institución educativa oficial, el SIEE establece desde el inicio del año%'
        )
        OR (
            l.titulo = 'Evaluación integral y autonomía del SIEE'
            AND q.pregunta LIKE 'Al finalizar el tercer período, una docente de grado séptimo%'
        )
        OR (
            l.titulo = 'Evaluación integral y autonomía del SIEE'
            AND q.pregunta LIKE 'En una institución oficial, el SIEE establece que la autoevaluación es una evidencia%'
        )
        OR (
            l.titulo = 'Convivencia escolar y protección frente al acoso'
            AND q.pregunta LIKE 'Durante un proyecto de grado octavo, un estudiante recibe montajes%'
        )
        OR (
            l.titulo = 'Educación inclusiva y ajustes pedagógicos'
            AND q.pregunta LIKE 'Una estudiante de sexto grado presenta dificultades persistentes%'
        )
        OR (
            l.titulo = 'PEI, currículo y autonomía institucional'
            AND q.pregunta LIKE 'Una institución educativa oficial inicia la revisión de su Proyecto Educativo Institucional%'
        )
        OR (
            l.titulo = 'Gobierno escolar y distribución de competencias'
            AND q.pregunta LIKE 'En una institución oficial se presentan dificultades reiteradas con el cumplimiento de horarios%'
        )
        OR (
            l.titulo = 'Función docente, planeación y contexto'
            AND q.pregunta LIKE 'Una docente de Ciencias Naturales de grado sexto recibe al inicio del año%'
        )
        OR (
            l.titulo = 'Familia, autonomía escolar y responsabilidad docente'
            AND q.pregunta LIKE 'Durante el segundo período, la madre de un estudiante de quinto grado%'
        )
        OR (
            l.titulo = 'Convivencia escolar y protección frente al acoso'
            AND q.pregunta LIKE 'Durante una actividad de laboratorio en grado décimo desaparece un teléfono celular%'
        )
        OR (
            l.titulo = 'Gobierno escolar y distribución de competencias'
            AND q.pregunta LIKE 'Después de analizar los resultados institucionales de dos años consecutivos%'
        )
        OR (
            l.titulo = 'Función docente, planeación y contexto'
            AND q.pregunta LIKE 'Un docente de Ciencias Sociales de grado noveno decide reemplazar durante un período%'
        )
        OR (
            l.titulo = 'Protección de derechos, confidencialidad y actuación institucional'
            AND q.pregunta LIKE 'Una estudiante de grado octavo solicita hablar en privado%'
        )
        OR (
            l.titulo = 'Evaluación integral y autonomía del SIEE'
            AND q.pregunta LIKE 'En grado octavo, cuatro estudiantes desarrollan durante seis semanas%'
        )
        OR (
            l.titulo = 'PEI, currículo y autonomía institucional'
            AND q.pregunta LIKE 'Una institución oficial identifica un aumento sostenido de reprobación%'
        )
        OR (
            l.titulo = 'Educación inclusiva y ajustes pedagógicos'
            AND q.pregunta LIKE 'Una estudiante de séptimo grado ha trabajado durante el año%'
        )
        OR (
            l.titulo = 'Convivencia escolar y protección frente al acoso'
            AND q.pregunta LIKE 'Dos estudiantes de grado noveno mantienen desde hace meses%'
        )
        OR (
            l.titulo = 'Familia, información y participación educativa'
            AND q.pregunta LIKE 'Durante el primer período, un estudiante de cuarto grado%'
        )
        OR (
            l.titulo = 'PEI, participación y autonomía institucional'
            AND q.pregunta LIKE 'Una institución identifica cambios en su población%'
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
   10. OPCIONES QUIZ - EVALUACIÓN Y AUTONOMÍA
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
        'Conservar la ponderación original de la prueba y usar las evidencias procesuales únicamente para definir apoyos, sin afectar la valoración.',
        FALSE,
        1
    ),
    (
        'Contrastar ambas fuentes y ajustar la incidencia de la prueba después de conocer los resultados, porque la progresión debe prevalecer.',
        FALSE,
        2
    ),
    (
        'Mantener los criterios y ponderaciones definidos en el SIEE y resolver la tensión mediante una actividad adicional equivalente y compatible con el sistema adoptado.',
        TRUE,
        3
    ),
    (
        'Sustituir la prueba por las evidencias procesuales para garantizar la permanencia, aunque el cambio no esté previsto en el SIEE.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND q.pregunta LIKE 'Al finalizar un período, una prueba acumulativa arroja resultados bajos%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
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
        'Aplicar el criterio de no promoción del SIEE en las dos áreas, porque la autonomía institucional permite trasladar a la estudiante la responsabilidad de las actividades de apoyo no realizadas.',
        FALSE,
        1
    ),
    (
        'Autorizar una prueba extraordinaria en las dos áreas y usar su resultado para decidir la promoción, aunque ese mecanismo no estuviera establecido previamente.',
        FALSE,
        2
    ),
    (
        'Revisar separadamente el proceso de cada área: aplicar el SIEE donde hubo apoyo y seguimiento, y subsanar la omisión donde no se garantizaron las estrategias previstas, sin convertir automáticamente una prueba final no prevista en el criterio de promoción.',
        TRUE,
        3
    ),
    (
        'Mantener las valoraciones y remitir el caso al consejo directivo para que determine si las inasistencias justificadas permiten autorizar actividades adicionales antes de aplicar el SIEE.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND q.pregunta LIKE 'En una institución educativa oficial, el SIEE establece desde el inicio del año%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
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
        'Conservar las ponderaciones y criterios establecidos, incorporar las evidencias obtenidas durante el proceso según las reglas del SIEE y diferenciar las actuaciones: valorar en el primer caso la progresión demostrada sin convertirla automáticamente en aprobación; aplicar en el segundo los criterios previstos considerando las estrategias ya desarrolladas; y, en el tercero, garantizar las acciones de seguimiento y apoyo omitidas antes de hacer recaer exclusivamente sobre el estudiante las consecuencias académicas del cierre.',
        TRUE,
        1
    ),
    (
        'Aplicar a los tres estudiantes una actividad equivalente de recuperación antes del cierre y ponderarla con las demás evidencias, porque la igualdad exige ofrecer una oportunidad común cuando varios estudiantes presentan desempeño bajo; posteriormente, conservar para cada uno el resultado más favorable entre la valoración acumulada y la recuperación.',
        FALSE,
        2
    ),
    (
        'Mantener provisionalmente las valoraciones obtenidas por los tres estudiantes y remitir los casos al Consejo Académico para que determine individualmente la promoción, pues las diferencias encontradas comprometen la aplicación uniforme del SIEE.',
        FALSE,
        3
    ),
    (
        'Aplicar los criterios y ponderaciones previamente comunicados en los dos primeros casos y autorizar únicamente al tercero una evaluación extraordinaria equivalente a las evidencias faltantes, utilizando su resultado para reemplazar las valoraciones anteriores.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND q.pregunta LIKE 'Al finalizar el tercer período, una docente de grado séptimo%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
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
        'Preservar inicialmente la solicitud de reserva del estudiante, realizar acompañamiento pedagógico y recopilar durante un período razonable evidencias adicionales antes de activar el procedimiento correspondiente.',
        FALSE,
        1
    ),
    (
        'Poner oportunamente los hechos conocidos en conocimiento de las instancias institucionales correspondientes, adoptar las medidas de acompañamiento y protección pertinentes y garantizar la participación y los derechos de los involucrados, sin supeditar la actuación a que el docente determine previamente por sí mismo la existencia definitiva de acoso ni convertir la solicitud de expulsión en una sanción automática.',
        TRUE,
        2
    ),
    (
        'Activar inmediatamente el procedimiento institucional clasificando preliminarmente los hechos como ciberacoso, dado que la reiteración y el medio tecnológico permiten establecer esa naturaleza independientemente de la intención alegada.',
        FALSE,
        3
    ),
    (
        'Diferenciar los mensajes enviados durante la jornada escolar de aquellos producidos fuera de ella, tramitar institucionalmente los primeros y comunicar los segundos a las familias para su manejo, salvo que exista evidencia de amenaza o riesgo grave.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Convivencia escolar y protección frente al acoso'
AND q.pregunta LIKE 'Durante un proyecto de grado octavo, un estudiante recibe montajes%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
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
        'Incorporar al trabajo del grupo aquellas estrategias que favorezcan diferentes formas de acceso y participación, documentar las barreras y respuestas observadas y mantener los objetivos de aprendizaje; cuando persistan necesidades particulares, implementar los apoyos o ajustes pedagógicamente justificados y efectuar seguimiento, sin condicionar necesariamente esas actuaciones a la obtención previa de un diagnóstico clínico.',
        TRUE,
        1
    ),
    (
        'Mantener para la estudiante los mismos instrumentos y tiempos mientras se obtiene la valoración externa, pero permitirle posteriormente recuperar las actividades no superadas mediante formatos alternativos.',
        FALSE,
        2
    ),
    (
        'Formalizar inmediatamente un plan individual que sustituya los objetivos en los que la estudiante presenta mayores dificultades por desempeños de menor complejidad, conservando los restantes.',
        FALSE,
        3
    ),
    (
        'Extender a todos los estudiantes los tiempos adicionales, la segmentación de instrucciones y los organizadores visuales, evitando medidas individuales mientras no exista diagnóstico.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Educación inclusiva y ajustes pedagógicos'
AND q.pregunta LIKE 'Una estudiante de sexto grado presenta dificultades persistentes%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
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
        'Mantener las ponderaciones previamente establecidas, pero interpretar el resultado dentro del conjunto de criterios y evidencias que el propio SIEE reconoce, verificando qué aprendizajes fueron efectivamente demostrados, qué progresión ocurrió después de la prueba y cómo deben operar las estrategias de seguimiento y apoyo.',
        TRUE,
        1
    ),
    (
        'Recalcular excepcionalmente la valoración reduciendo el peso de la prueba y aumentando proporcionalmente las evidencias procesuales, siempre que la modificación favorezca al estudiante.',
        FALSE,
        2
    ),
    (
        'Conservar estrictamente el resultado aritmético porque las ponderaciones fueron previamente conocidas y cualquier consideración posterior sobre progresión, autoevaluación o retroalimentación ya está representada en las demás calificaciones.',
        FALSE,
        3
    ),
    (
        'Sustituir la prueba acumulativa por las dos actividades posteriores en las que se evidenció superación de las dificultades, conservando el mismo porcentaje originalmente asignado al instrumento.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Evaluación integral y autonomía del SIEE'
AND q.pregunta LIKE 'En una institución oficial, el SIEE establece que la autoevaluación es una evidencia%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
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
        'Solicitar concepto del consejo académico e iniciar la implementación mientras el consejo directivo formaliza el ajuste.',
        FALSE,
        1
    ),
    (
        'Implementar la propuesta con aval interno del consejo académico y postergar la adopción formal hasta medir sus resultados.',
        FALSE,
        2
    ),
    (
        'Desarrollar el procedimiento participativo y elevar la propuesta al consejo directivo para decidir su adopción, manteniendo el consejo académico su función consultiva.',
        TRUE,
        3
    ),
    (
        'Implementar la modificación por decisión de rectoría, dado que responde a una necesidad pedagógica inmediata.',
        FALSE,
        4
    )
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'PEI, participación y autonomía institucional'
AND q.pregunta LIKE 'Una institución identifica cambios en su población%'
AND NOT EXISTS (
    SELECT 1
    FROM quiz_options qo
    WHERE qo.quiz_id = q.id
    AND qo.opcion = v.opcion
);


INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Encargar al Consejo Académico la formulación técnica de la estrategia y autorizar su incorporación inmediata en todos los planes de área, dado que este órgano orienta los procesos pedagógicos; posteriormente, el Consejo Directivo puede formalizar su inclusión en el PEI y socializarla con la comunidad educativa.', FALSE, 1),
    ('Construir la propuesta a partir del diagnóstico institucional, someter sus componentes pedagógicos y curriculares a las instancias que tienen competencia para estudiarlos y articularlos, garantizar la participación que corresponda a los integrantes de la comunidad educativa y adoptar las modificaciones del PEI mediante el procedimiento institucional previsto, sin reducir la comprensión lectora a responsabilidad exclusiva de un área ni sustituir el procedimiento participativo por una decisión unilateral.', TRUE, 2),
    ('Mantener los planes vigentes hasta que el Consejo Directivo diseñe directamente la estrategia transversal y determine las actividades mínimas obligatorias de cada asignatura, puesto que este órgano es la máxima instancia institucional.', FALSE, 3),
    ('Permitir que cada área determine autónomamente si incorpora la estrategia, exigiendo únicamente a Lengua Castellana un plan específico de mejoramiento; una vez se evidencien resultados positivos, el rector podrá extender la experiencia sin necesidad de modificar el PEI.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'PEI, currículo y autonomía institucional'
AND q.pregunta LIKE 'Una institución educativa oficial inicia la revisión de su Proyecto Educativo Institucional%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Ejecutar integralmente la decisión del Consejo Directivo mientras permanezca vigente, dado que sus decisiones obligan a la comunidad educativa; las posibles dudas sobre competencia pueden revisarse posteriormente.', FALSE, 1),
    ('Trasladar el seguimiento completo al Consejo Académico, porque las actuaciones de los docentes inciden directamente en el proceso educativo y este órgano posee competencia pedagógica.', FALSE, 2),
    ('Diferenciar la naturaleza de cada asunto y tramitarlo ante la instancia competente: conservar en el Consejo Académico aquello que corresponda a orientación y organización pedagógica, ejercer desde la rectoría las funciones de dirección, coordinación y seguimiento que normativamente le correspondan, y reservar a los demás órganos las atribuciones que efectivamente tengan asignadas.', TRUE, 3),
    ('Solicitar al Consejo Directivo que delegue formalmente en el rector todas las actuaciones relacionadas con seguimiento docente, conservando aquel únicamente la revisión de los resultados.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Gobierno escolar y distribución de competencias'
AND q.pregunta LIKE 'En una institución oficial se presentan dificultades reiteradas con el cumplimiento de horarios%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Aplicar inicialmente la planeación institucional sin modificaciones para obtener resultados comparables entre los estudiantes y, después de la primera evaluación formal, introducir actividades diferenciadas únicamente para quienes obtengan desempeño bajo.', FALSE, 1),
    ('Reemplazar la planeación recibida por una propuesta propia construida a partir del diagnóstico del grupo, pues la responsabilidad directa sobre el aprendizaje otorga a la docente autonomía para seleccionar contenidos, secuencias e instrumentos.', FALSE, 2),
    ('Analizar la planeación a la luz del currículo, el PEI, los referentes aplicables y las características identificadas en los estudiantes; conservar los propósitos y referentes institucionales que correspondan, pero ajustar estrategias, secuencias, recursos y procesos de seguimiento cuando resulte pedagógicamente necesario, documentando su desarrollo y articulándolo con los mecanismos institucionales de planeación y mejoramiento.', TRUE, 3),
    ('Mantener contenidos y actividades institucionales, incorporando únicamente los nuevos recursos tecnológicos como apoyo, dado que las diferencias en conocimientos previos deben atenderse mediante estrategias de recuperación posteriores.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Función docente, planeación y contexto'
AND q.pregunta LIKE 'Una docente de Ciencias Naturales de grado sexto recibe al inicio del año%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Mantener al estudiante en el proyecto sin introducir modificaciones, informando a la madre que las decisiones metodológicas pertenecen exclusivamente a la institución y que la participación familiar no comprende controvertir estrategias pedagógicas.', FALSE, 1),
    ('Aceptar temporalmente el trabajo individual mientras se determina si los desacuerdos pueden evolucionar hacia una situación de convivencia, porque la prevención justifica privilegiar la solicitud familiar mientras exista incertidumbre.', FALSE, 2),
    ('Analizar con el estudiante y los integrantes del grupo las dificultades observadas, implementar estrategias pedagógicas para mejorar la distribución de responsabilidades y efectuar seguimiento; escuchar e informar a la familia e involucrarla en el acompañamiento, sin atribuirle la facultad unilateral de sustituir una decisión pedagógica ni desconocer la participación del estudiante y las competencias institucionales.', TRUE, 3),
    ('Remitir la solicitud al Consejo Directivo para que determine si prevalece la decisión familiar o la metodología docente, pues corresponde a la máxima instancia resolver cuál interés debe prevalecer.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Familia, autonomía escolar y responsabilidad docente'
AND q.pregunta LIKE 'Durante el segundo período, la madre de un estudiante de quinto grado%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);


INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Adoptar provisionalmente la consecuencia establecida para la conducta, debido a la evidencia material encontrada, y permitir posteriormente que el estudiante solicite su revisión aportando pruebas.', FALSE, 1),
    ('Separar al estudiante de las actividades presenciales mientras se revisan las cámaras y se escucha a los involucrados, manteniendo sus actividades académicas en casa sin aplicar las garantías disciplinarias.', FALSE, 2),
    ('Documentar los hechos y preservar las evidencias disponibles, escuchar al estudiante y a quienes puedan aportar información, permitir la contradicción de los elementos considerados y adoptar la decisión por la autoridad competente conforme al procedimiento establecido, diferenciando las medidas inmediatas de protección de una sanción que presuponga responsabilidad.', TRUE, 3),
    ('Remitir inicialmente el hecho a la autoridad externa competente y suspender la actuación institucional hasta conocer su determinación.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Convivencia escolar y protección frente al acoso'
AND q.pregunta LIKE 'Durante una actividad de laboratorio en grado décimo desaparece un teléfono celular%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Implementar la reorganización aprobada por el Consejo Académico y someter posteriormente sus resultados al Consejo Directivo, pues la competencia académica permite introducir modificaciones cuya formalización puede producirse después.', FALSE, 1),
    ('Reconocer al Consejo Académico su función de estudiar, organizar y orientar los asuntos curriculares y académicos, pero tramitar las modificaciones que incidan en los componentes institucionales mediante los procedimientos y órganos correspondientes para su incorporación, evitando que la aprobación académica sustituya las competencias de adopción o que otro órgano asuma la elaboración técnica.', TRUE, 2),
    ('Trasladar la propuesta al Consejo Directivo para que determine directamente las secuencias, criterios y mecanismos definitivos, porque su posición le permite modificar las propuestas de los demás órganos.', FALSE, 3),
    ('Mantener sin modificaciones el currículo vigente hasta el siguiente año escolar y utilizar la propuesta únicamente como plan de mejoramiento.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Gobierno escolar y distribución de competencias'
AND q.pregunta LIKE 'Después de analizar los resultados institucionales de dos años consecutivos%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Mantener íntegramente la propuesta del docente siempre que existan evidencias de aprendizaje, porque la libertad de cátedra protege la selección profesional y los planes institucionales pueden sustituirse cuando el contexto justifique una alternativa.', FALSE, 1),
    ('Exigir el retorno completo a la planeación original y permitir innovaciones exclusivamente como actividades complementarias, porque la aprobación institucional convierte contenidos, secuencias y metodologías en elementos inmodificables.', FALSE, 2),
    ('Analizar la propuesta respecto de los referentes curriculares, propósitos del área, aprendizajes previstos y articulación institucional; conservar las innovaciones pertinentes, realizar los ajustes necesarios y articular las modificaciones mediante los espacios institucionales correspondientes.', TRUE, 3),
    ('Permitir que el docente termine el período con su propuesta y aplicar posteriormente una evaluación común sobre los contenidos omitidos; si los resultados son satisfactorios, formalizar retrospectivamente la modificación.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Función docente, planeación y contexto'
AND q.pregunta LIKE 'Un docente de Ciencias Sociales de grado noveno decide reemplazar durante un período%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);

INSERT INTO quiz_options
(quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
CROSS JOIN (VALUES
    ('Mantener inicialmente la confidencialidad solicitada, documentar reservadamente la conversación y realizar seguimiento cercano; informar solo si aparecen nuevas evidencias de una afectación concreta.', FALSE, 1),
    ('Comunicar oportunamente la información por los conductos institucionales correspondientes para activar las actuaciones de protección, preservar la intimidad de la estudiante frente a quienes no necesiten conocer el caso y evitar interrogatorios o investigaciones dirigidas a demostrar por cuenta propia los hechos.', TRUE, 2),
    ('Informar inmediatamente a la familia para que determine si autoriza otras actuaciones, pues los padres son los primeros responsables mientras no exista evidencia de una agresión consumada.', FALSE, 3),
    ('Solicitar inicialmente capturas completas y verificar personalmente identidad, frecuencia e intención del adulto antes de informar el caso, porque se requieren elementos de corroboración.', FALSE, 4)
) AS v(opcion, es_correcta, orden)
WHERE l.titulo = 'Protección de derechos, confidencialidad y actuación institucional'
AND q.pregunta LIKE 'Una estudiante de grado octavo solicita hablar en privado%'
AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.opcion = v.opcion);


INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden FROM quizzes q JOIN lessons l ON l.id=q.leccion_id
CROSS JOIN (VALUES
('Determinar por separado, aunque de manera articulada, las consecuencias que correspondan al hecho de convivencia y la valoración de los aprendizajes demostrados; reconstruir las evidencias académicas disponibles y aplicar el procedimiento institucional respecto de la eliminación, sin utilizar la calificación como sanción.', TRUE, 1),
('Conservar los aportes individuales acreditados, pero asignar desempeño bajo al componente colectivo porque la eliminación demuestra incumplimiento, y tramitar adicionalmente el comportamiento.', FALSE, 2),
('Valorar exclusivamente las evidencias producidas antes del incidente y excluir del cálculo cualquier componente afectado, dejando al procedimiento de convivencia las demás consecuencias.', FALSE, 3),
('Suspender el cierre académico hasta concluir el procedimiento de convivencia y después establecer si la eliminación incide sobre los componentes de valoración.', FALSE, 4)
) v(opcion,es_correcta,orden) WHERE l.titulo='Evaluación integral y autonomía del SIEE' AND q.pregunta LIKE 'En grado octavo, cuatro estudiantes desarrollan durante seis semanas%' AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id=q.id AND qo.opcion=v.opcion);

INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden FROM quizzes q JOIN lessons l ON l.id=q.leccion_id
CROSS JOIN (VALUES
('Mantener el piloto autorizado por el rector, documentar resultados y solicitar posteriormente al Consejo Directivo la incorporación de modificaciones.', FALSE, 1),
('Reconocer la función del Consejo Académico en asuntos pedagógicos y curriculares, determinar qué puede desarrollarse dentro de la planeación vigente y qué exige modificaciones institucionales, y articular rectoría y órganos de gobierno según sus competencias.', TRUE, 2),
('Someter integralmente la propuesta al Consejo Directivo antes de cualquier implementación y facultarlo para introducir las modificaciones pedagógicas necesarias.', FALSE, 3),
('Autorizar al Consejo Académico para aprobar el piloto y sus ajustes durante el año, reservando al Consejo Directivo únicamente la incorporación definitiva al PEI.', FALSE, 4)
) v(opcion,es_correcta,orden) WHERE l.titulo='PEI, currículo y autonomía institucional' AND q.pregunta LIKE 'Una institución oficial identifica un aumento sostenido de reprobación%' AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id=q.id AND qo.opcion=v.opcion);

INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden FROM quizzes q JOIN lessons l ON l.id=q.leccion_id
CROSS JOIN (VALUES
('Determinar la promoción comparando prioritariamente el progreso de la estudiante consigo misma, utilizando los aprendizajes del grado únicamente como referentes secundarios.', FALSE, 1),
('Aplicar los criterios generales de promoción mediante los mismos instrumentos utilizados con el grupo, incorporando posteriormente un informe cualitativo.', FALSE, 2),
('Examinar los aprendizajes alcanzados a la luz de criterios, propósitos y ajustes; valorar si los apoyos fueron implementados y, ante omisiones relevantes, adoptar medidas antes de hacer recaer sus efectos sobre la estudiante.', TRUE, 3),
('Aplicar exclusivamente las metas individualizadas, pues su formalización sustituye los criterios generales del grado.', FALSE, 4)
) v(opcion,es_correcta,orden) WHERE l.titulo='Educación inclusiva y ajustes pedagógicos' AND q.pregunta LIKE 'Una estudiante de séptimo grado ha trabajado durante el año%' AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id=q.id AND qo.opcion=v.opcion);

INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden FROM quizzes q JOIN lessons l ON l.id=q.leccion_id
CROSS JOIN (VALUES
('Clasificar provisionalmente la situación como conflicto escolar, puesto que existen actuaciones ofensivas atribuibles a ambos estudiantes, y aplicar mecanismos de mediación.', FALSE, 1),
('Reconocer inicialmente una posible situación de acoso debido a la reiteración, aplicar medidas de protección y exigir al otro suspender cualquier contacto mientras se decide.', FALSE, 2),
('Reconstruir características, reiteración, efectos y dinámica, incluyendo posibles relaciones de poder y actuaciones de ambos; adoptar medidas de protección y tramitar la situación conforme a los protocolos.', TRUE, 3),
('Abstenerse de clasificar mientras existan versiones contradictorias y remitir el caso a orientación para determinar quién es víctima.', FALSE, 4)
) v(opcion,es_correcta,orden) WHERE l.titulo='Convivencia escolar y protección frente al acoso' AND q.pregunta LIKE 'Dos estudiantes de grado noveno mantienen desde hace meses%' AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id=q.id AND qo.opcion=v.opcion);

INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden)
SELECT q.id, v.opcion, v.es_correcta, v.orden FROM quizzes q JOIN lessons l ON l.id=q.leccion_id
CROSS JOIN (VALUES
('Entregar al padre toda la información relacionada directa o indirectamente con el proceso, suprimiendo únicamente los nombres de compañeros, y solicitar autorización para cualquier estrategia individual.', FALSE, 1),
('Negar el acceso a registros pedagógicos internos y limitar la información familiar a los boletines institucionales.', FALSE, 2),
('Garantizar información pertinente sobre el proceso, avances, dificultades, criterios y acompañamiento, establecer diálogo y participación familiar, proteger información de terceros y diferenciar ese derecho del poder de autorizar cada decisión metodológica.', TRUE, 3),
('Remitir la solicitud al Consejo Directivo para que establezca qué documentos pueden ser conocidos y qué estrategias requieren autorización.', FALSE, 4)
) v(opcion,es_correcta,orden) WHERE l.titulo='Familia, información y participación educativa' AND q.pregunta LIKE 'Durante el primer período, un estudiante de cuarto grado%' AND NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id=q.id AND qo.opcion=v.opcion);


/* ============================================================
    11. BADGES
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
    12. INSCRIPCIONES
    Todos los usuarios demo quedan inscritos en los cursos base.
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