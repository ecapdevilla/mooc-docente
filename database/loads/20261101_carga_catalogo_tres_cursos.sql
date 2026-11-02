-- =====================================================================
-- CARGA CONTROLADA DEL CATÁLOGO DE TRES CURSOS
-- =====================================================================
-- Generado por scripts/generar-carga-catalogo.js (lote 20261101-catalogo-tres-cursos).
-- Fuente de contenido: public/js/datos/modulos.js (const MODULES).
-- Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>
--
-- Características:
--   - Idempotente: cada INSERT usa WHERE NOT EXISTS, así que reejecutarlo
--     no duplica filas ni sobreescribe contenido existente.
--   - Atómico: todo ocurre dentro de una única transacción; ante cualquier
--     error, ON_ERROR_STOP aborta y no queda nada escrito.
--   - Auditable: registra en catalog_load_items solo las filas creadas por
--     este lote, de modo que la reversión no toca datos previos.
--   - Republicable: si el lote se revirtió con la reversión segura, volver a
--     ejecutar esta carga lo reactiva sin recrear filas ni tocar usuarios.
--   - Autoverificable: el paso final comprueba conteos, contenido, opciones
--     y exactamente una respuesta correcta por cuestionario.
--
-- Antes de ejecutar en producción: correr el respaldo y revisar el
-- preflight (paso 0). Si el preflight falla, el script no escribe nada.


BEGIN;

-- 0. Preflight (solo lectura): aborta si hay títulos ambiguos.
DO $preflight$
DECLARE
  v_conflicto text;
BEGIN
  SELECT string_agg(clave, ' | ') INTO v_conflicto FROM (
    SELECT titulo AS clave
    FROM courses
    WHERE titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
    GROUP BY titulo
    HAVING COUNT(*) > 1
  ) duplicados;

  IF v_conflicto IS NOT NULL THEN
    RAISE EXCEPTION 'Carga abortada: cursos duplicados por título: %', v_conflicto;
  END IF;

  SELECT string_agg(clave, ' | ') INTO v_conflicto FROM (
    SELECT c.titulo || ' / ' || m.titulo AS clave
    FROM modules m
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
    GROUP BY c.titulo, m.titulo
    HAVING COUNT(*) > 1
  ) duplicados;

  IF v_conflicto IS NOT NULL THEN
    RAISE EXCEPTION 'Carga abortada: módulos duplicados (curso / módulo): %', v_conflicto;
  END IF;

  SELECT string_agg(clave, ' | ') INTO v_conflicto FROM (
    SELECT c.titulo || ' / ' || l.titulo AS clave
    FROM lessons l
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
      AND l.titulo IN ('¿Qué es la Pedagogía?', 'Estrategias didácticas para el aula', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Decreto 1278 de 2002: Estatuto Docente', '1.1 Historia y fundamentos de la IA', '2.1 Prompts efectivos para planificar clases', '3.1 Evaluación y retroalimentación con IA', '4.1 Ética, privacidad y uso responsable de la IA', '5.1 Liderazgo pedagógico con IA', '6.1 Proyecto integrador: IA ética en mi práctica')
    GROUP BY c.titulo, l.titulo
    HAVING COUNT(*) > 1
  ) duplicados;

  IF v_conflicto IS NOT NULL THEN
    RAISE EXCEPTION 'Carga abortada: lecciones duplicadas (curso / lección): %', v_conflicto;
  END IF;

  SELECT string_agg(clave, ' | ') INTO v_conflicto FROM (
    SELECT c.titulo || ' / ' || l.titulo AS clave
    FROM quizzes q
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
      AND l.titulo IN ('¿Qué es la Pedagogía?', 'Estrategias didácticas para el aula', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Decreto 1278 de 2002: Estatuto Docente', '1.1 Historia y fundamentos de la IA', '2.1 Prompts efectivos para planificar clases', '3.1 Evaluación y retroalimentación con IA', '4.1 Ética, privacidad y uso responsable de la IA', '5.1 Liderazgo pedagógico con IA', '6.1 Proyecto integrador: IA ética en mi práctica')
    GROUP BY c.titulo, l.titulo
    HAVING COUNT(*) > 1
  ) duplicados;

  IF v_conflicto IS NOT NULL THEN
    RAISE EXCEPTION 'Carga abortada: más de un cuestionario en una lección: %', v_conflicto;
  END IF;

  RAISE NOTICE 'Preflight OK: el catálogo actual no tiene títulos ambiguos.';
END; $preflight$;

-- 1. Manifiesto de la carga: permite revertir con precisión y auditar
--    qué filas creó este script (no las filas preexistentes).
CREATE TABLE IF NOT EXISTS catalog_load_batches (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(80) UNIQUE NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalog_load_items (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES catalog_load_batches(id) ON DELETE CASCADE,
  entidad VARCHAR(20) NOT NULL CHECK (entidad IN ('course','module','lesson','quiz','quiz_option','badge')),
  entidad_id INTEGER NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (batch_id, entidad, entidad_id)
);

-- Columna de auditoría de la reversión (idempotente para manifiestos previos).
ALTER TABLE catalog_load_batches ADD COLUMN IF NOT EXISTS revertido_en TIMESTAMP;

INSERT INTO catalog_load_batches (codigo, descripcion)
VALUES (
  '20261101-catalogo-tres-cursos',
  'Carga controlada de 3 cursos, 9 módulos, 11 lecciones, 11 cuestionarios y 44 opciones desde database/loads/20261101_carga_catalogo_tres_cursos.sql'
)
ON CONFLICT (codigo) DO NOTHING;

-- Alcance de la carga (referencia para auditoría):
--   Cursos: Fundamentos de Pedagogía y Didáctica, Legislación Educativa Colombiana, Inteligencia Artificial para Docentes
--   Módulos: Fundamentos de Pedagogía y Didáctica › Fundamentos de Pedagogía, Fundamentos de Pedagogía y Didáctica › Corrientes Pedagógicas, Legislación Educativa Colombiana › Marco Normativo Colombiano, Inteligencia Artificial para Docentes › Fundamentos de IA en Educación, Inteligencia Artificial para Docentes › Planificación con IA, Inteligencia Artificial para Docentes › Evaluación y Retroalimentación con IA, Inteligencia Artificial para Docentes › Ética, Privacidad y Ciudadanía Digital con IA, Inteligencia Artificial para Docentes › Liderazgo Pedagógico y Escalabilidad con IA, Inteligencia Artificial para Docentes › Proyecto Integrador: IA Ética en Mi Práctica Docente
--   Lecciones: Fundamentos de Pedagogía y Didáctica › ¿Qué es la Pedagogía?, Fundamentos de Pedagogía y Didáctica › Estrategias didácticas para el aula, Fundamentos de Pedagogía y Didáctica › Corrientes pedagógicas contemporáneas, Legislación Educativa Colombiana › Ley General de Educación (Ley 115 de 1994), Legislación Educativa Colombiana › Decreto 1278 de 2002: Estatuto Docente, Inteligencia Artificial para Docentes › 1.1 Historia y fundamentos de la IA, Inteligencia Artificial para Docentes › 2.1 Prompts efectivos para planificar clases, Inteligencia Artificial para Docentes › 3.1 Evaluación y retroalimentación con IA, Inteligencia Artificial para Docentes › 4.1 Ética, privacidad y uso responsable de la IA, Inteligencia Artificial para Docentes › 5.1 Liderazgo pedagógico con IA, Inteligencia Artificial para Docentes › 6.1 Proyecto integrador: IA ética en mi práctica

-- 1.b Reactivación idempotente del lote.
--     Si el lote se revirtió con la reversión segura (activo = FALSE),
--     volver a ejecutar esta carga lo republica sin recrear filas y sin
--     tocar matrículas, progreso, intentos ni respuestas de usuarios.
UPDATE courses c
SET activo = TRUE
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'course'
  AND i.entidad_id = c.id
  AND b.codigo = '20261101-catalogo-tres-cursos'
  AND c.activo = FALSE;

UPDATE modules m
SET activo = TRUE
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'module'
  AND i.entidad_id = m.id
  AND b.codigo = '20261101-catalogo-tres-cursos'
  AND m.activo = FALSE;

UPDATE lessons l
SET activo = TRUE
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'lesson'
  AND i.entidad_id = l.id
  AND b.codigo = '20261101-catalogo-tres-cursos'
  AND l.activo = FALSE;

UPDATE quizzes q
SET estado_revision = 'publicado'
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'quiz'
  AND i.entidad_id = q.id
  AND b.codigo = '20261101-catalogo-tres-cursos'
  AND q.estado_revision <> 'publicado';

UPDATE catalog_load_batches
SET revertido_en = NULL
WHERE codigo = '20261101-catalogo-tres-cursos'
  AND revertido_en IS NOT NULL;

-- =====================================================================
-- Curso: Fundamentos de Pedagogía y Didáctica
-- =====================================================================
WITH nueva AS (
  INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo)
  SELECT
    'Fundamentos de Pedagogía y Didáctica',
    'Pedagogía y Didáctica',
    'Básico',
    'Domina los conceptos esenciales de la pedagogía moderna y las estrategias didácticas para el aula. Repasa las principales corrientes pedagógicas y su aplicación práctica.',
    'fas fa-chalkboard-teacher',
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM courses WHERE titulo = 'Fundamentos de Pedagogía y Didáctica'
  )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'course', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 1: Fundamentos de Pedagogía
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
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
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Fundamentos de Pedagogía'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Pedagogo Inicial
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Pedagogo Inicial',
    'Badge obtenido al completar Fundamentos de Pedagogía',
    'fas fa-chalkboard-teacher',
    'gold'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND m.titulo = 'Fundamentos de Pedagogía'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Pedagogo Inicial'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 2: Corrientes Pedagógicas
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
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
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Corrientes Pedagógicas'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Pensador
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Pensador',
    'Badge obtenido al completar Corrientes Pedagógicas',
    'fas fa-brain',
    'green'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND m.titulo = 'Corrientes Pedagógicas'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Pensador'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Lección 1 de Fundamentos de Pedagogía: ¿Qué es la Pedagogía?
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '¿Qué es la Pedagogía?',
    'Conceptos básicos de pedagogía',
    '<p>La <strong>pedagogía</strong> es la ciencia que estudia la educación como fenómeno social y humano. No se limita a la escuela: abarca todos los procesos formativos que ocurren a lo largo de la vida.</p> <h4>Conceptos clave</h4> <ul> <li><strong>Educación:</strong> proceso permanente de formación integral del ser humano.</li> <li><strong>Pedagogía:</strong> reflexión teórica sobre la educación y sus métodos.</li> <li><strong>Didáctica:</strong> el arte y la ciencia de enseñar, centrada en el cómo.</li> </ul> <div class="info-box"><strong>Dato clave:</strong> en el concurso docente se evalúa la capacidad de fundamentar tu práctica en teorías pedagógicas sólidas.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND m.titulo = 'Fundamentos de Pedagogía'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '¿Qué es la Pedagogía?'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Cuál es la diferencia central entre pedagogía y didáctica?',
    '¡Excelente! La pedagogía es la reflexión sobre la educación, mientras la didáctica se centra en las estrategias de enseñanza.',
    'Casi. Recuerda: la pedagogía reflexiona sobre la educación en general; la didáctica se enfoca en el cómo enseñar.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND l.titulo = '¿Qué es la Pedagogía?'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'La pedagogía solo se aplica en primaria y la didáctica en secundaria.',
  FALSE,
  1,
  'Casi. Recuerda: la pedagogía reflexiona sobre la educación en general; la didáctica se enfoca en el cómo enseñar.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = '¿Qué es la Pedagogía?'
  AND q.pregunta = '¿Cuál es la diferencia central entre pedagogía y didáctica?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = '¿Qué es la Pedagogía?'
  AND q.pregunta = '¿Cuál es la diferencia central entre pedagogía y didáctica?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Son sinónimos exactos y se usan indistintamente.',
  FALSE,
  3,
  'Casi. Recuerda: la pedagogía reflexiona sobre la educación en general; la didáctica se enfoca en el cómo enseñar.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = '¿Qué es la Pedagogía?'
  AND q.pregunta = '¿Cuál es la diferencia central entre pedagogía y didáctica?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'La didáctica es teórica y la pedagogía es práctica.',
  FALSE,
  4,
  'Casi. Recuerda: la pedagogía reflexiona sobre la educación en general; la didáctica se enfoca en el cómo enseñar.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = '¿Qué es la Pedagogía?'
  AND q.pregunta = '¿Cuál es la diferencia central entre pedagogía y didáctica?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 2 de Fundamentos de Pedagogía: Estrategias didácticas para el aula
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    'Estrategias didácticas para el aula',
    'Estrategias didácticas contextualizadas, como el aprendizaje basado en proyectos, el aula invertida, la gamificación y el debate dirigido.',
    '<p>Las estrategias didácticas son el conjunto de decisiones que toma el docente para favorecer el aprendizaje. Deben ser variadas, intencionadas y contextualizadas.</p> <h4>Ejemplos prácticos</h4> <ul> <li><strong>Aprendizaje basado en proyectos:</strong> los estudiantes resuelven problemas reales.</li> <li><strong>Aula invertida:</strong> el contenido se estudia en casa y se practica en clase.</li> <li><strong>Gamificación:</strong> uso de elementos de juego para motivar.</li> <li><strong>Debate dirigido:</strong> desarrolla pensamiento crítico y argumentación.</li> </ul> <div class="info-box"><strong>Recuerda:</strong> no hay una estrategia mejor que otra; la clave está en la intencionalidad pedagógica y el contexto.</div>',
    2, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND m.titulo = 'Fundamentos de Pedagogía'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = 'Estrategias didácticas para el aula'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Qué caracteriza al aprendizaje basado en proyectos?',
    '¡Muy bien! El ABP parte de problemas reales y desarrolla competencias en los estudiantes.',
    'El ABP se centra en resolver problemas reales, no en memorizar.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND l.titulo = 'Estrategias didácticas para el aula'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Los estudiantes memorizan contenidos para el examen.',
  FALSE,
  1,
  'El ABP se centra en resolver problemas reales, no en memorizar.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Estrategias didácticas para el aula'
  AND q.pregunta = '¿Qué caracteriza al aprendizaje basado en proyectos?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Los estudiantes resuelven problemas reales y desarrollan competencias.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Estrategias didácticas para el aula'
  AND q.pregunta = '¿Qué caracteriza al aprendizaje basado en proyectos?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El docente dicta la clase sin participación.',
  FALSE,
  3,
  'El ABP se centra en resolver problemas reales, no en memorizar.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Estrategias didácticas para el aula'
  AND q.pregunta = '¿Qué caracteriza al aprendizaje basado en proyectos?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Se evalúa solo con pruebas escritas.',
  FALSE,
  4,
  'El ABP se centra en resolver problemas reales, no en memorizar.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Estrategias didácticas para el aula'
  AND q.pregunta = '¿Qué caracteriza al aprendizaje basado en proyectos?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 1 de Corrientes Pedagógicas: Corrientes pedagógicas contemporáneas
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    'Corrientes pedagógicas contemporáneas',
    'Estudio de las principales corrientes pedagógicas',
    '<p>Conocer las principales corrientes pedagógicas te permite fundamentar tus decisiones en el aula y responder preguntas del concurso con argumentos sólidos.</p> <h4>Corrientes principales</h4> <ul> <li><strong>Constructivismo (Piaget, Vygotsky):</strong> el estudiante construye su conocimiento a partir de la interacción con el entorno.</li> <li><strong>Escuela Nueva:</strong> el niño es el centro del proceso, con aprendizaje activo y participativo.</li> <li><strong>Pedagogía crítica (Freire):</strong> la educación como práctica de libertad y transformación social.</li> <li><strong>Aprendizaje significativo (Ausubel):</strong> se aprende cuando el nuevo contenido se conecta con saberes previos.</li> </ul> <div class="info-box"><strong>Tip de examen:</strong> identifica el autor y el principio central de cada corriente. Son preguntas frecuentes.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND m.titulo = 'Corrientes Pedagógicas'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = 'Corrientes pedagógicas contemporáneas'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    'Según Ausubel, el aprendizaje significativo ocurre cuando:',
    '¡Correcto! El aprendizaje significativo conecta lo nuevo con lo que el estudiante ya sabe.',
    'Revisa: Ausubel plantea que el aprendizaje es significativo cuando se ancla en conocimientos previos.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
    AND l.titulo = 'Corrientes pedagógicas contemporáneas'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El estudiante memoriza sin comprender.',
  FALSE,
  1,
  'Revisa: Ausubel plantea que el aprendizaje es significativo cuando se ancla en conocimientos previos.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Corrientes pedagógicas contemporáneas'
  AND q.pregunta = 'Según Ausubel, el aprendizaje significativo ocurre cuando:'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El nuevo contenido se relaciona con los saberes previos del estudiante.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Corrientes pedagógicas contemporáneas'
  AND q.pregunta = 'Según Ausubel, el aprendizaje significativo ocurre cuando:'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El docente expone sin participación del estudiante.',
  FALSE,
  3,
  'Revisa: Ausubel plantea que el aprendizaje es significativo cuando se ancla en conocimientos previos.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Corrientes pedagógicas contemporáneas'
  AND q.pregunta = 'Según Ausubel, el aprendizaje significativo ocurre cuando:'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Se evalúa únicamente con pruebas estandarizadas.',
  FALSE,
  4,
  'Revisa: Ausubel plantea que el aprendizaje es significativo cuando se ancla en conocimientos previos.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
  AND l.titulo = 'Corrientes pedagógicas contemporáneas'
  AND q.pregunta = 'Según Ausubel, el aprendizaje significativo ocurre cuando:'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- =====================================================================
-- Curso: Legislación Educativa Colombiana
-- =====================================================================
WITH nueva AS (
  INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo)
  SELECT
    'Legislación Educativa Colombiana',
    'Legislación Educativa',
    'Básico',
    'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios y las normas clave para el concurso docente.',
    'fas fa-gavel',
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM courses WHERE titulo = 'Legislación Educativa Colombiana'
  )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'course', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 1: Marco Normativo Colombiano
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
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
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Marco Normativo Colombiano'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Conocedor Normativo
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Conocedor Normativo',
    'Badge obtenido al completar Marco Normativo Colombiano',
    'fas fa-gavel',
    'blue'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND m.titulo = 'Marco Normativo Colombiano'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Conocedor Normativo'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Lección 1 de Marco Normativo Colombiano: Ley General de Educación (Ley 115 de 1994)
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    'Ley General de Educación (Ley 115 de 1994)',
    'Marco normativo principal del sistema educativo colombiano',
    '<p>La <strong>Ley 115 de 1994</strong> es el marco normativo principal del sistema educativo colombiano. Define los fines de la educación, los niveles, los actores y las responsabilidades.</p> <h4>Puntos clave</h4> <ul> <li>Define la educación como un proceso de formación permanente.</li> <li>Establece los niveles: preescolar, básica (primaria y secundaria) y media.</li> <li>Crea el gobierno escolar y el proyecto educativo institucional (PEI).</li> <li>Regula la educación formal, no formal e informal.</li> </ul> <div class="info-box"><strong>Dato clave:</strong> la Ley 115 es la norma más preguntada en el componente normativo del concurso.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND m.titulo = 'Marco Normativo Colombiano'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?',
    '¡Correcto! La Ley 115 define los fines, niveles y estructura del sistema educativo.',
    'La Ley 115 es el marco general: fines, niveles y actores del sistema educativo.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Solo el calendario escolar.',
  FALSE,
  1,
  'La Ley 115 es el marco general: fines, niveles y actores del sistema educativo.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
  AND q.pregunta = '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Los fines de la educación, niveles y actores del sistema educativo colombiano.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
  AND q.pregunta = '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Únicamente el salario de los docentes.',
  FALSE,
  3,
  'La Ley 115 es el marco general: fines, niveles y actores del sistema educativo.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
  AND q.pregunta = '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El régimen disciplinario de los estudiantes.',
  FALSE,
  4,
  'La Ley 115 es el marco general: fines, niveles y actores del sistema educativo.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Ley General de Educación (Ley 115 de 1994)'
  AND q.pregunta = '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 2 de Marco Normativo Colombiano: Decreto 1278 de 2002: Estatuto Docente
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    'Decreto 1278 de 2002: Estatuto Docente',
    'El Decreto 1278 de 2002 regula el Estatuto de Profesionalización Docente, el ingreso por concurso de méritos, la carrera docente y la evaluación de desempeño.',
    '<p>El <strong>Decreto 1278 de 2002</strong> regula el Estatuto de Profesionalización Docente. Es fundamental para entender el concurso de méritos y la carrera docente.</p> <h4>Puntos clave</h4> <ul> <li>Establece el concurso de méritos como mecanismo de ingreso.</li> <li>Define los niveles: Escalafón docente con grados y niveles.</li> <li>Regula la evaluación de desempeño y las competencias docentes.</li> <li>Determina los derechos y deberes de los docentes oficiales.</li> </ul> <div class="info-box"><strong>Importante:</strong> este decreto es la base normativa del concurso al que te estás preparando.</div>',
    2, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND m.titulo = 'Marco Normativo Colombiano'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = 'Decreto 1278 de 2002: Estatuto Docente'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Qué regula principalmente el Decreto 1278 de 2002?',
    '¡Excelente! El Decreto 1278 regula la carrera docente y el concurso de méritos.',
    'El Decreto 1278 es el Estatuto Docente: regula la carrera y el concurso de méritos.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo = 'Decreto 1278 de 2002: Estatuto Docente'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El calendario académico.',
  FALSE,
  1,
  'El Decreto 1278 es el Estatuto Docente: regula la carrera y el concurso de méritos.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Decreto 1278 de 2002: Estatuto Docente'
  AND q.pregunta = '¿Qué regula principalmente el Decreto 1278 de 2002?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El Estatuto de Profesionalización Docente y el concurso de méritos.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Decreto 1278 de 2002: Estatuto Docente'
  AND q.pregunta = '¿Qué regula principalmente el Decreto 1278 de 2002?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Los impuestos de las instituciones educativas.',
  FALSE,
  3,
  'El Decreto 1278 es el Estatuto Docente: regula la carrera y el concurso de méritos.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Decreto 1278 de 2002: Estatuto Docente'
  AND q.pregunta = '¿Qué regula principalmente el Decreto 1278 de 2002?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El transporte escolar.',
  FALSE,
  4,
  'El Decreto 1278 es el Estatuto Docente: regula la carrera y el concurso de méritos.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Legislación Educativa Colombiana'
  AND l.titulo = 'Decreto 1278 de 2002: Estatuto Docente'
  AND q.pregunta = '¿Qué regula principalmente el Decreto 1278 de 2002?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- =====================================================================
-- Curso: Inteligencia Artificial para Docentes
-- =====================================================================
WITH nueva AS (
  INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo)
  SELECT
    'Inteligencia Artificial para Docentes',
    'Tecnología Educativa',
    'Intermedio',
    'Domina el uso pedagógico de la IA en el aula: planificación, evaluación, personalización y ética. Herramientas prácticas para transformar tu práctica docente con tecnología responsable.',
    'fas fa-robot',
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM courses WHERE titulo = 'Inteligencia Artificial para Docentes'
  )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'course', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 1: Fundamentos de IA en Educación
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT
    c.id,
    'Fundamentos de IA en Educación',
    'Conceptos y fundamentos de IA aplicados a la educación.',
    1,
    'Explorador IA',
    'fas fa-robot',
    'blue',
    TRUE
  FROM courses c
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Fundamentos de IA en Educación'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Explorador IA
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Explorador IA',
    'Badge obtenido al completar Fundamentos de IA en Educación',
    'fas fa-robot',
    'blue'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Fundamentos de IA en Educación'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Explorador IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 2: Planificación con IA
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT
    c.id,
    'Planificación con IA',
    'Diseño de experiencias de aprendizaje con IA generativa.',
    2,
    'Planificador IA',
    'fas fa-calendar-alt',
    'green',
    TRUE
  FROM courses c
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Planificación con IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Planificador IA
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Planificador IA',
    'Badge obtenido al completar Planificación con IA',
    'fas fa-calendar-alt',
    'green'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Planificación con IA'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Planificador IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 3: Evaluación y Retroalimentación con IA
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT
    c.id,
    'Evaluación y Retroalimentación con IA',
    'Uso responsable de IA para evaluación formativa.',
    3,
    'Evaluador IA',
    'fas fa-chart-line',
    'orange',
    TRUE
  FROM courses c
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Evaluación y Retroalimentación con IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Evaluador IA
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Evaluador IA',
    'Badge obtenido al completar Evaluación y Retroalimentación con IA',
    'fas fa-chart-line',
    'orange'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Evaluación y Retroalimentación con IA'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Evaluador IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 4: Ética, Privacidad y Ciudadanía Digital con IA
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT
    c.id,
    'Ética, Privacidad y Ciudadanía Digital con IA',
    'Privacidad, sesgos y ciudadanía digital.',
    4,
    'Guardián Ético',
    'fas fa-shield-alt',
    'red',
    TRUE
  FROM courses c
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Guardián Ético
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Guardián Ético',
    'Badge obtenido al completar Ética, Privacidad y Ciudadanía Digital con IA',
    'fas fa-shield-alt',
    'red'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Guardián Ético'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 5: Liderazgo Pedagógico y Escalabilidad con IA
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT
    c.id,
    'Liderazgo Pedagógico y Escalabilidad con IA',
    'Liderazgo docente e integración institucional.',
    5,
    'Líder IA',
    'fas fa-users-cog',
    'purple',
    TRUE
  FROM courses c
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Líder IA
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Líder IA',
    'Badge obtenido al completar Liderazgo Pedagógico y Escalabilidad con IA',
    'fas fa-users-cog',
    'purple'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Líder IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Módulo 6: Proyecto Integrador: IA Ética en Mi Práctica Docente
WITH nueva AS (
  INSERT INTO modules
    (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT
    c.id,
    'Proyecto Integrador: IA Ética en Mi Práctica Docente',
    'Diseño de una intervención docente ética con IA.',
    6,
    'Practicante IA',
    'fas fa-project-diagram',
    'teal',
    TRUE
  FROM courses c
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND NOT EXISTS (
      SELECT 1 FROM modules m
      WHERE m.curso_id = c.id AND m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'module', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Badge del módulo: Practicante IA
WITH nueva AS (
  INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)
  SELECT
    m.id,
    'Practicante IA',
    'Badge obtenido al completar Proyecto Integrador: IA Ética en Mi Práctica Docente',
    'fas fa-project-diagram',
    'teal'
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
    AND NOT EXISTS (
      SELECT 1 FROM badges b
      WHERE b.modulo_id = m.id AND b.nombre = 'Practicante IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'badge', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Lección 1 de Fundamentos de IA en Educación: 1.1 Historia y fundamentos de la IA
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '1.1 Historia y fundamentos de la IA',
    'Historia y conceptos esenciales de inteligencia artificial.',
    '<p>La <strong>Inteligencia Artificial (IA)</strong> no es nueva: lleva más de 70 años desarrollándose. Entender su evolución ayuda a los docentes a situarla críticamente y a aprovecharla con responsabilidad pedagógica.</p> <h4>Hitos clave</h4> <ul> <li><strong>1950 – Test de Turing:</strong> Alan Turing propone la pregunta «¿Puede una máquina pensar?»</li> <li><strong>1956 – Conferencia de Dartmouth:</strong> se acuña el término «Inteligencia Artificial».</li> <li><strong>2012 – Deep Learning:</strong> las redes neuronales profundas superan el rendimiento humano en reconocimiento de imágenes.</li> <li><strong>2022 – IA Generativa:</strong> ChatGPT y modelos similares democratizan el acceso a la IA para docentes.</li> </ul> <h4>Conceptos esenciales</h4> <ul> <li><strong>Machine Learning:</strong> la máquina aprende de datos sin ser programada explícitamente.</li> <li><strong>Red neuronal:</strong> modelo matemático inspirado en el cerebro humano.</li> <li><strong>IA Generativa:</strong> modelos que crean texto, imágenes y audio a partir de instrucciones.</li> </ul> <div class="info-box"><strong>Relevancia docente:</strong> la IA generativa ya está en manos de tus estudiantes. Comprenderla te permite orientar su uso ético y pedagógico.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Fundamentos de IA en Educación'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '1.1 Historia y fundamentos de la IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Qué caracteriza a la IA Generativa frente a otros tipos de IA?',
    '¡Correcto! La IA Generativa produce contenido nuevo a partir de instrucciones (prompts), lo que la hace útil para planear clases, generar recursos y dar retroalimentación.',
    'La IA Generativa se distingue por crear contenido nuevo (texto, imagen, audio) a partir de instrucciones del usuario, no por calcular o programar manualmente.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND l.titulo = '1.1 Historia y fundamentos de la IA'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Solo puede realizar cálculos matemáticos avanzados.',
  FALSE,
  1,
  'La IA Generativa se distingue por crear contenido nuevo (texto, imagen, audio) a partir de instrucciones del usuario, no por calcular o programar manualmente.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '1.1 Historia y fundamentos de la IA'
  AND q.pregunta = '¿Qué caracteriza a la IA Generativa frente a otros tipos de IA?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Crea contenido nuevo (texto, imágenes, audio) a partir de instrucciones del usuario.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '1.1 Historia y fundamentos de la IA'
  AND q.pregunta = '¿Qué caracteriza a la IA Generativa frente a otros tipos de IA?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Requiere programar cada respuesta manualmente.',
  FALSE,
  3,
  'La IA Generativa se distingue por crear contenido nuevo (texto, imagen, audio) a partir de instrucciones del usuario, no por calcular o programar manualmente.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '1.1 Historia y fundamentos de la IA'
  AND q.pregunta = '¿Qué caracteriza a la IA Generativa frente a otros tipos de IA?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Funciona únicamente con conexión física a servidores educativos.',
  FALSE,
  4,
  'La IA Generativa se distingue por crear contenido nuevo (texto, imagen, audio) a partir de instrucciones del usuario, no por calcular o programar manualmente.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '1.1 Historia y fundamentos de la IA'
  AND q.pregunta = '¿Qué caracteriza a la IA Generativa frente a otros tipos de IA?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 1 de Planificación con IA: 2.1 Prompts efectivos para planificar clases
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '2.1 Prompts efectivos para planificar clases',
    'Estructura de instrucciones efectivas para planificar.',
    '<p>Un <strong>prompt</strong> es la instrucción que le das a una IA. Su calidad determina directamente la calidad de la respuesta. Los docentes que dominan el arte del prompt pueden generar planeaciones, rúbricas y materiales en minutos.</p> <h4>Estructura de un prompt docente efectivo</h4> <ul> <li><strong>Rol:</strong> «Actúa como experto en diseño curricular para primaria colombiana…»</li> <li><strong>Tarea:</strong> «…crea una secuencia didáctica de 3 sesiones sobre…»</li> <li><strong>Contexto:</strong> «…para estudiantes de grado 5° con acceso limitado a tecnología…»</li> <li><strong>Formato:</strong> «…presenta el resultado en tabla con columnas: objetivo, actividad, tiempo, recursos.»</li> </ul> <h4>Errores comunes</h4> <ul> <li>Prompts vagos («dame ideas para una clase»).</li> <li>No especificar el nivel educativo ni el contexto.</li> <li>No revisar críticamente el resultado generado.</li> </ul> <div class="info-box"><strong>Tip práctico:</strong> siempre verifica la información generada con fuentes confiables. La IA puede «alucinar» datos incorrectos.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Planificación con IA'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '2.1 Prompts efectivos para planificar clases'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    'Al diseñar un prompt para planificar una clase, ¿qué elemento es más importante incluir?',
    '¡Excelente! Un prompt efectivo incluye rol, tarea, contexto y formato para obtener respuestas precisas y utilizables.',
    'La clave está en la especificidad: rol (quién habla), tarea (qué necesitas), contexto (para quién) y formato (cómo lo quieres).',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND l.titulo = '2.1 Prompts efectivos para planificar clases'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El nombre del docente y la institución educativa.',
  FALSE,
  1,
  'La clave está en la especificidad: rol (quién habla), tarea (qué necesitas), contexto (para quién) y formato (cómo lo quieres).'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '2.1 Prompts efectivos para planificar clases'
  AND q.pregunta = 'Al diseñar un prompt para planificar una clase, ¿qué elemento es más importante incluir?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El rol, la tarea, el contexto del grupo y el formato deseado.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '2.1 Prompts efectivos para planificar clases'
  AND q.pregunta = 'Al diseñar un prompt para planificar una clase, ¿qué elemento es más importante incluir?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'La fecha exacta y el número de estudiantes.',
  FALSE,
  3,
  'La clave está en la especificidad: rol (quién habla), tarea (qué necesitas), contexto (para quién) y formato (cómo lo quieres).'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '2.1 Prompts efectivos para planificar clases'
  AND q.pregunta = 'Al diseñar un prompt para planificar una clase, ¿qué elemento es más importante incluir?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El nombre de la herramienta de IA que se va a usar.',
  FALSE,
  4,
  'La clave está en la especificidad: rol (quién habla), tarea (qué necesitas), contexto (para quién) y formato (cómo lo quieres).'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '2.1 Prompts efectivos para planificar clases'
  AND q.pregunta = 'Al diseñar un prompt para planificar una clase, ¿qué elemento es más importante incluir?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 1 de Evaluación y Retroalimentación con IA: 3.1 Evaluación y retroalimentación con IA
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '3.1 Evaluación y retroalimentación con IA',
    'Apoyo de IA para evaluación formativa y retroalimentación.',
    '<p>La IA puede transformar la evaluación formativa al permitir retroalimentación inmediata, personalizada y escalable. Sin embargo, el juicio pedagógico del docente sigue siendo insustituible.</p> <h4>Usos prácticos de la IA en evaluación</h4> <ul> <li><strong>Diseño de rúbricas:</strong> genera matrices de valoración con criterios e indicadores diferenciados.</li> <li><strong>Retroalimentación textual:</strong> analiza respuestas abiertas y sugiere comentarios formativos.</li> <li><strong>Banco de ítems:</strong> crea preguntas de selección múltiple alineadas a los estándares.</li> <li><strong>Análisis de brechas:</strong> identifica patrones de error para orientar refuerzo.</li> </ul> <h4>Limitaciones a considerar</h4> <ul> <li>La IA no evalúa contexto emocional ni relacional del estudiante.</li> <li>Puede sesgar la evaluación si los datos de entrenamiento son parciales.</li> <li>El docente debe validar siempre los resultados antes de compartirlos.</li> </ul> <div class="info-box"><strong>Principio clave:</strong> la IA apoya la evaluación formativa, pero la decisión pedagógica final siempre debe ser del docente.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Evaluación y Retroalimentación con IA'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '3.1 Evaluación y retroalimentación con IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Cuál de los siguientes usos de la IA en evaluación es el más adecuado pedagógicamente?',
    '¡Muy bien! La IA es una herramienta de apoyo: genera propuestas que el docente revisa, ajusta y valida antes de usarlas.',
    'La IA apoya el proceso evaluativo, pero siempre requiere la revisión y el juicio pedagógico del docente para garantizar equidad y pertinencia.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND l.titulo = '3.1 Evaluación y retroalimentación con IA'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Delegar completamente la calificación de exámenes a la IA sin revisión docente.',
  FALSE,
  1,
  'La IA apoya el proceso evaluativo, pero siempre requiere la revisión y el juicio pedagógico del docente para garantizar equidad y pertinencia.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '3.1 Evaluación y retroalimentación con IA'
  AND q.pregunta = '¿Cuál de los siguientes usos de la IA en evaluación es el más adecuado pedagógicamente?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Usar la IA para generar rúbricas y sugerir retroalimentación, validando los resultados antes de compartirlos.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '3.1 Evaluación y retroalimentación con IA'
  AND q.pregunta = '¿Cuál de los siguientes usos de la IA en evaluación es el más adecuado pedagógicamente?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Reemplazar al docente por sistemas automatizados de evaluación.',
  FALSE,
  3,
  'La IA apoya el proceso evaluativo, pero siempre requiere la revisión y el juicio pedagógico del docente para garantizar equidad y pertinencia.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '3.1 Evaluación y retroalimentación con IA'
  AND q.pregunta = '¿Cuál de los siguientes usos de la IA en evaluación es el más adecuado pedagógicamente?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Usar la IA solo para diseñar el formato visual de los exámenes.',
  FALSE,
  4,
  'La IA apoya el proceso evaluativo, pero siempre requiere la revisión y el juicio pedagógico del docente para garantizar equidad y pertinencia.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '3.1 Evaluación y retroalimentación con IA'
  AND q.pregunta = '¿Cuál de los siguientes usos de la IA en evaluación es el más adecuado pedagógicamente?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 1 de Ética, Privacidad y Ciudadanía Digital con IA: 4.1 Ética, privacidad y uso responsable de la IA
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '4.1 Ética, privacidad y uso responsable de la IA',
    'Protección de datos, equidad y transparencia.',
    '<p>El uso de IA en el aula conlleva responsabilidades éticas fundamentales. Los docentes deben proteger la privacidad de sus estudiantes y fomentar un uso crítico y responsable de la tecnología.</p> <h4>Principios éticos del uso de IA en educación</h4> <ul> <li><strong>Privacidad:</strong> no compartir datos personales de menores con plataformas de IA sin consentimiento informado.</li> <li><strong>Equidad:</strong> los sistemas de IA pueden perpetuar sesgos raciales, de género o socioeconómicos.</li> <li><strong>Transparencia:</strong> informar a estudiantes y familias cuando se usa IA en el proceso educativo.</li> <li><strong>Propiedad intelectual:</strong> el contenido generado con IA tiene implicaciones de derechos de autor.</li> </ul> <h4>Marco normativo colombiano</h4> <ul> <li><strong>Ley 1581 de 2012:</strong> Ley de Protección de Datos Personales (Habeas Data).</li> <li><strong>Código de Infancia (Ley 1098):</strong> protección especial de datos de menores.</li> </ul> <div class="info-box"><strong>Reflexión docente:</strong> ¿Tus estudiantes saben que estás usando IA? La transparencia genera confianza y modela un uso ético de la tecnología.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Ética, Privacidad y Ciudadanía Digital con IA'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '4.1 Ética, privacidad y uso responsable de la IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    'Según la normatividad colombiana, ¿qué debe hacer un docente antes de usar una plataforma de IA con datos de sus estudiantes menores de edad?',
    '¡Correcto! La Ley 1581 de 2012 exige proteger los datos personales y requerir consentimiento, especialmente tratándose de menores.',
    'La Ley 1581 de 2012 (Habeas Data) obliga a verificar políticas de privacidad y obtener consentimiento informado antes de procesar datos de estudiantes menores.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND l.titulo = '4.1 Ética, privacidad y uso responsable de la IA'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Simplemente usar la plataforma si es gratuita y educativa.',
  FALSE,
  1,
  'La Ley 1581 de 2012 (Habeas Data) obliga a verificar políticas de privacidad y obtener consentimiento informado antes de procesar datos de estudiantes menores.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '4.1 Ética, privacidad y uso responsable de la IA'
  AND q.pregunta = 'Según la normatividad colombiana, ¿qué debe hacer un docente antes de usar una plataforma de IA con datos de sus estudiantes menores de edad?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Verificar las políticas de privacidad y obtener consentimiento informado, conforme a la Ley 1581 de 2012.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '4.1 Ética, privacidad y uso responsable de la IA'
  AND q.pregunta = 'Según la normatividad colombiana, ¿qué debe hacer un docente antes de usar una plataforma de IA con datos de sus estudiantes menores de edad?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Registrar a los estudiantes con nombres falsos para proteger su identidad.',
  FALSE,
  3,
  'La Ley 1581 de 2012 (Habeas Data) obliga a verificar políticas de privacidad y obtener consentimiento informado antes de procesar datos de estudiantes menores.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '4.1 Ética, privacidad y uso responsable de la IA'
  AND q.pregunta = 'Según la normatividad colombiana, ¿qué debe hacer un docente antes de usar una plataforma de IA con datos de sus estudiantes menores de edad?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'Esperar instrucciones del Ministerio de Educación para cada caso.',
  FALSE,
  4,
  'La Ley 1581 de 2012 (Habeas Data) obliga a verificar políticas de privacidad y obtener consentimiento informado antes de procesar datos de estudiantes menores.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '4.1 Ética, privacidad y uso responsable de la IA'
  AND q.pregunta = 'Según la normatividad colombiana, ¿qué debe hacer un docente antes de usar una plataforma de IA con datos de sus estudiantes menores de edad?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 1 de Liderazgo Pedagógico y Escalabilidad con IA: 5.1 Liderazgo pedagógico con IA
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '5.1 Liderazgo pedagógico con IA',
    'Liderazgo docente e integración institucional responsable.',
    '<p>El docente del siglo XXI no solo usa IA: lidera su integración en la institución educativa, acompaña a sus colegas y facilita el cambio cultural necesario para aprovecharla pedagógicamente.</p> <h4>Competencias del docente líder en IA</h4> <ul> <li><strong>Curación crítica:</strong> selecciona herramientas de IA relevantes y confiables para su contexto.</li> <li><strong>Formación entre pares:</strong> comparte sus aprendizajes y genera comunidades de práctica.</li> <li><strong>Gestión del cambio:</strong> identifica resistencias y acompaña la adopción gradual.</li> <li><strong>Investigación-acción:</strong> evalúa el impacto real de la IA en los aprendizajes de sus estudiantes.</li> </ul> <h4>Niveles de integración (Marco DigComp)</h4> <ul> <li><strong>Nivel 1 – Explorador:</strong> usa herramientas básicas de IA.</li> <li><strong>Nivel 2 – Adoptante:</strong> integra IA en su planeación regularmente.</li> <li><strong>Nivel 3 – Líder:</strong> diseña estrategias institucionales e investiga su impacto.</li> </ul> <div class="info-box"><strong>Meta del MOOC:</strong> avanzar de nivel explorador a adoptante, con bases para convertirte en líder pedagógico de la IA en tu institución.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Liderazgo Pedagógico y Escalabilidad con IA'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '5.1 Liderazgo pedagógico con IA'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Qué distingue a un docente "líder" en IA de uno "explorador" según el Marco DigComp?',
    '¡Excelente! El nivel líder implica diseño estratégico, formación de pares e investigación del impacto, más allá del uso individual de herramientas.',
    'El Marco DigComp distingue al líder por su capacidad de diseñar estrategias institucionales, formar a colegas e investigar el impacto real de la IA.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND l.titulo = '5.1 Liderazgo pedagógico con IA'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El líder usa más herramientas de IA que el explorador.',
  FALSE,
  1,
  'El Marco DigComp distingue al líder por su capacidad de diseñar estrategias institucionales, formar a colegas e investigar el impacto real de la IA.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '5.1 Liderazgo pedagógico con IA'
  AND q.pregunta = '¿Qué distingue a un docente "líder" en IA de uno "explorador" según el Marco DigComp?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El líder diseña estrategias institucionales e investiga el impacto de la IA; el explorador solo usa herramientas básicas.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '5.1 Liderazgo pedagógico con IA'
  AND q.pregunta = '¿Qué distingue a un docente "líder" en IA de uno "explorador" según el Marco DigComp?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El líder tiene más años de experiencia docente que el explorador.',
  FALSE,
  3,
  'El Marco DigComp distingue al líder por su capacidad de diseñar estrategias institucionales, formar a colegas e investigar el impacto real de la IA.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '5.1 Liderazgo pedagógico con IA'
  AND q.pregunta = '¿Qué distingue a un docente "líder" en IA de uno "explorador" según el Marco DigComp?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'No hay diferencia real: ambos niveles son equivalentes.',
  FALSE,
  4,
  'El Marco DigComp distingue al líder por su capacidad de diseñar estrategias institucionales, formar a colegas e investigar el impacto real de la IA.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '5.1 Liderazgo pedagógico con IA'
  AND q.pregunta = '¿Qué distingue a un docente "líder" en IA de uno "explorador" según el Marco DigComp?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- Lección 1 de Proyecto Integrador: IA Ética en Mi Práctica Docente: 6.1 Proyecto integrador: IA ética en mi práctica
WITH nueva AS (
  INSERT INTO lessons
    (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT
    m.id,
    '6.1 Proyecto integrador: IA ética en mi práctica',
    'Diseño y evaluación de una intervención docente con IA.',
    '<p>El proyecto integrador es la culminación del curso. Diseñarás una <strong>intervención pedagógica real</strong> que incorpore IA de forma ética, justificada y medible en tu contexto docente.</p> <h4>Fases del proyecto</h4> <ul> <li><strong>Fase 1 – Definición del reto:</strong> identifica un problema concreto en tu aula (ej.: bajo nivel lector, escasa retroalimentación formativa).</li> <li><strong>Fase 2 – Diseño de la intervención:</strong> planifica cómo usar la IA para abordar el reto, con criterios éticos explícitos.</li> <li><strong>Fase 3 – Implementación:</strong> ejecuta la intervención con al menos un grupo de estudiantes.</li> <li><strong>Fase 4 – Análisis de impacto:</strong> mide resultados con evidencias (registros, rúbricas, encuestas).</li> <li><strong>Fase 5 – Comunicación:</strong> presenta los hallazgos a tu comunidad educativa.</li> </ul> <div class="info-box"><strong>Criterio de evaluación:</strong> el proyecto se valora por la coherencia pedagógica, el manejo ético de datos y la calidad de la reflexión sobre el impacto, no por la sofisticación tecnológica.</div>',
    1, TRUE, TRUE
  FROM modules m
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND m.titulo = 'Proyecto Integrador: IA Ética en Mi Práctica Docente'
    AND NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = m.id AND l.titulo = '6.1 Proyecto integrador: IA ética en mi práctica'
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'lesson', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)
WITH nueva AS (
  INSERT INTO quizzes
    (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT
    l.id, l.modulo_id,
    '¿Cuál es el criterio principal para evaluar el proyecto integrador de este curso?',
    '¡Muy bien! Lo esencial es la reflexión pedagógica y ética, no la complejidad tecnológica. Un proyecto simple pero bien fundamentado es más valioso.',
    'El proyecto integrador se evalúa por coherencia pedagógica, manejo ético de datos y reflexión sobre el impacto real en los aprendizajes, no por la cantidad de herramientas.',
    'publicado'
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Inteligencia Artificial para Docentes'
    AND l.titulo = '6.1 Proyecto integrador: IA ética en mi práctica'
    AND NOT EXISTS (
      SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id
    )
  RETURNING id
)
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz', nueva.id
FROM nueva
CROSS JOIN catalog_load_batches b
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El número de herramientas de IA utilizadas en la intervención.',
  FALSE,
  1,
  'El proyecto integrador se evalúa por coherencia pedagógica, manejo ético de datos y reflexión sobre el impacto real en los aprendizajes, no por la cantidad de herramientas.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '6.1 Proyecto integrador: IA ética en mi práctica'
  AND q.pregunta = '¿Cuál es el criterio principal para evaluar el proyecto integrador de este curso?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 1
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'La coherencia pedagógica, el manejo ético de datos y la reflexión sobre el impacto.',
  TRUE,
  2,
  NULL
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '6.1 Proyecto integrador: IA ética en mi práctica'
  AND q.pregunta = '¿Cuál es el criterio principal para evaluar el proyecto integrador de este curso?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 2
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'El presupuesto invertido en tecnología para la intervención.',
  FALSE,
  3,
  'El proyecto integrador se evalúa por coherencia pedagógica, manejo ético de datos y reflexión sobre el impacto real en los aprendizajes, no por la cantidad de herramientas.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '6.1 Proyecto integrador: IA ética en mi práctica'
  AND q.pregunta = '¿Cuál es el criterio principal para evaluar el proyecto integrador de este curso?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 3
  );

INSERT INTO quiz_options
  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
SELECT
  q.id,
  'La cantidad de estudiantes que participaron en el proyecto.',
  FALSE,
  4,
  'El proyecto integrador se evalúa por coherencia pedagógica, manejo ético de datos y reflexión sobre el impacto real en los aprendizajes, no por la cantidad de herramientas.'
FROM quizzes q
JOIN lessons l ON l.id = q.leccion_id
JOIN modules m ON m.id = l.modulo_id
JOIN courses c ON c.id = m.curso_id
WHERE c.titulo = 'Inteligencia Artificial para Docentes'
  AND l.titulo = '6.1 Proyecto integrador: IA ética en mi práctica'
  AND q.pregunta = '¿Cuál es el criterio principal para evaluar el proyecto integrador de este curso?'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_options qo
    WHERE qo.quiz_id = q.id AND qo.orden = 4
  );

-- 8. Manifiesto: opciones de los cuestionarios creados por este lote.
INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)
SELECT b.id, 'quiz_option', qo.id
FROM catalog_load_batches b
JOIN catalog_load_items i ON i.batch_id = b.id AND i.entidad = 'quiz'
JOIN quiz_options qo ON qo.quiz_id = i.entidad_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
ON CONFLICT DO NOTHING;

DO $verifica$
DECLARE
  v_esperado_cursos int := 3;
  v_esperado_modulos int := 9;
  v_esperado_lecciones int := 11;
  v_esperado_cuestionarios int := 11;
  v_esperado_opciones int := 44;
  v_cursos int;
  v_modulos int;
  v_lecciones int;
  v_cuestionarios int;
  v_opciones int;
  v_invalidas int;
BEGIN
  SELECT COUNT(*) INTO v_cursos FROM courses WHERE titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes');
  SELECT COUNT(*) INTO v_modulos FROM modules m JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes');
  SELECT COUNT(*) INTO v_lecciones FROM lessons l JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes') AND l.titulo IN ('¿Qué es la Pedagogía?', 'Estrategias didácticas para el aula', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Decreto 1278 de 2002: Estatuto Docente', '1.1 Historia y fundamentos de la IA', '2.1 Prompts efectivos para planificar clases', '3.1 Evaluación y retroalimentación con IA', '4.1 Ética, privacidad y uso responsable de la IA', '5.1 Liderazgo pedagógico con IA', '6.1 Proyecto integrador: IA ética en mi práctica');
  SELECT COUNT(*) INTO v_cuestionarios FROM quizzes q JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes') AND l.titulo IN ('¿Qué es la Pedagogía?', 'Estrategias didácticas para el aula', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Decreto 1278 de 2002: Estatuto Docente', '1.1 Historia y fundamentos de la IA', '2.1 Prompts efectivos para planificar clases', '3.1 Evaluación y retroalimentación con IA', '4.1 Ética, privacidad y uso responsable de la IA', '5.1 Liderazgo pedagógico con IA', '6.1 Proyecto integrador: IA ética en mi práctica');
  SELECT COUNT(*) INTO v_opciones FROM quiz_options qo JOIN quizzes q ON q.id = qo.quiz_id JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes') AND l.titulo IN ('¿Qué es la Pedagogía?', 'Estrategias didácticas para el aula', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Decreto 1278 de 2002: Estatuto Docente', '1.1 Historia y fundamentos de la IA', '2.1 Prompts efectivos para planificar clases', '3.1 Evaluación y retroalimentación con IA', '4.1 Ética, privacidad y uso responsable de la IA', '5.1 Liderazgo pedagógico con IA', '6.1 Proyecto integrador: IA ética en mi práctica');

  IF v_cursos <> v_esperado_cursos THEN
    RAISE EXCEPTION 'Verificación fallida: se esperaban % cursos y hay %', v_esperado_cursos, v_cursos;
  END IF;

  IF v_modulos <> v_esperado_modulos THEN
    RAISE EXCEPTION 'Verificación fallida: se esperaban % módulos y hay %', v_esperado_modulos, v_modulos;
  END IF;

  IF v_lecciones <> v_esperado_lecciones THEN
    RAISE EXCEPTION 'Verificación fallida: se esperaban % lecciones y hay %', v_esperado_lecciones, v_lecciones;
  END IF;

  IF v_cuestionarios <> v_esperado_cuestionarios THEN
    RAISE EXCEPTION 'Verificación fallida: se esperaban % cuestionarios y hay %', v_esperado_cuestionarios, v_cuestionarios;
  END IF;

  IF v_opciones <> v_esperado_opciones THEN
    RAISE EXCEPTION 'Verificación fallida: se esperaban % opciones y hay %', v_esperado_opciones, v_opciones;
  END IF;

  SELECT COUNT(*) INTO v_invalidas FROM (
    SELECT
      l.id,
      COUNT(DISTINCT q.id) AS cuestionarios,
      COUNT(DISTINCT qo.id) AS opciones,
      COUNT(DISTINCT qo.id) FILTER (WHERE qo.es_correcta) AS correctas,
      COUNT(DISTINCT qo.id) FILTER (WHERE COALESCE(btrim(qo.opcion), '') = '') AS opciones_vacias,
      (COALESCE(btrim(l.contenido), '') = '') AS sin_contenido
    FROM lessons l
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    LEFT JOIN quizzes q ON q.leccion_id = l.id
    LEFT JOIN quiz_options qo ON qo.quiz_id = q.id
    WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
      AND l.titulo IN ('¿Qué es la Pedagogía?', 'Estrategias didácticas para el aula', 'Corrientes pedagógicas contemporáneas', 'Ley General de Educación (Ley 115 de 1994)', 'Decreto 1278 de 2002: Estatuto Docente', '1.1 Historia y fundamentos de la IA', '2.1 Prompts efectivos para planificar clases', '3.1 Evaluación y retroalimentación con IA', '4.1 Ética, privacidad y uso responsable de la IA', '5.1 Liderazgo pedagógico con IA', '6.1 Proyecto integrador: IA ética en mi práctica')
    GROUP BY l.id, l.contenido
  ) revision
  WHERE revision.cuestionarios <> 1
     OR revision.opciones <> 4
     OR revision.correctas <> 1
     OR revision.opciones_vacias <> 0
     OR revision.sin_contenido;

  IF v_invalidas <> 0 THEN
    RAISE EXCEPTION 'Verificación fallida: % lecciones sin 1 cuestionario, 4 opciones, 1 correcta y contenido', v_invalidas;
  END IF;

  RAISE NOTICE 'Verificación OK: % cursos, % módulos, % lecciones, % cuestionarios y % opciones consistentes.',
    v_cursos, v_modulos, v_lecciones, v_cuestionarios, v_opciones;
END; $verifica$;

-- Detalle por lección (evidencia para la revisión manual).
SELECT
  c.titulo AS curso,
  m.titulo AS modulo,
  l.orden AS orden_leccion,
  l.titulo AS leccion,
  COUNT(DISTINCT q.id) AS cuestionarios,
  COUNT(DISTINCT qo.id) AS opciones,
  COUNT(DISTINCT qo.id) FILTER (WHERE qo.es_correcta) AS correctas,
  length(l.contenido) AS largo_contenido
FROM courses c
JOIN modules m ON m.curso_id = c.id
JOIN lessons l ON l.modulo_id = m.id
LEFT JOIN quizzes q ON q.leccion_id = l.id
LEFT JOIN quiz_options qo ON qo.quiz_id = q.id
WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
GROUP BY c.titulo, m.orden, m.titulo, l.orden, l.titulo, l.contenido
ORDER BY c.titulo, m.orden, l.orden;

COMMIT;
