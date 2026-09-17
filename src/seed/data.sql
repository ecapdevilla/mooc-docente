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