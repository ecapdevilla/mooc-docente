-- =====================================================================
-- REVERSIÓN FÍSICA DEL LOTE (BORRA FILAS; SOLO ENTORNOS SIN ACTIVIDAD)
-- =====================================================================
-- Generado por scripts/generar-carga-catalogo.js (lote 20261101-catalogo-tres-cursos).
-- Fuente de contenido: indexInicial.html (const MODULES).
-- Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>
--
-- Borra exclusivamente las filas creadas por el lote y registradas en
-- catalog_load_items. No debe usarse en un entorno con usuarios reales:
-- las claves foráneas ON DELETE CASCADE eliminarían matrículas, progreso,
-- badges obtenidos, respuestas de intentos, proyectos y respuestas de
-- lección.
--
-- Guardias (la transacción aborta sin borrar nada si fallan):
--   1. el lote no existe;
--   2. la reversión segura no se ejecutó antes (quedan cursos activos);
--   3. existe cualquier dato de usuario vinculado al lote.
--
-- En producción use únicamente la reversión segura.


BEGIN;

DO $guardia$
BEGIN
  IF to_regclass('public.catalog_load_batches') IS NULL THEN
    RAISE EXCEPTION 'Este entorno no tiene el manifiesto de carga; no hay lote que revertir.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM catalog_load_batches
    WHERE codigo = '20261101-catalogo-tres-cursos'
  ) THEN
    RAISE EXCEPTION 'No existe el lote %; no hay nada que revertir.', '20261101-catalogo-tres-cursos';
  END IF;
END;
$guardia$;

-- Guardia 2: la reversión segura debe haberse ejecutado antes.
DO $segura$
DECLARE
  activos INTEGER;
BEGIN
  SELECT COUNT(*) INTO activos
  FROM courses c
  JOIN catalog_load_items i ON i.entidad = 'course' AND i.entidad_id = c.id
  JOIN catalog_load_batches b ON b.id = i.batch_id
  WHERE b.codigo = '20261101-catalogo-tres-cursos'
    AND c.activo = TRUE;

  IF activos > 0 THEN
    RAISE EXCEPTION 'Ejecuta primero la reversión segura: quedan % curso(s) del lote activos.', activos;
  END IF;
END;
$segura$;

-- Guardia 3: sin datos de usuarios vinculados al lote.
CREATE TEMP TABLE reversion_dependencias ON COMMIT DROP AS
SELECT 'enrollments' AS metrica, COUNT(*)::bigint AS valor
FROM enrollments e
JOIN catalog_load_items i ON i.entidad = 'course' AND i.entidad_id = e.curso_id
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
UNION ALL
SELECT 'user_progress' AS metrica, COUNT(*)::bigint AS valor
FROM user_progress p
JOIN catalog_load_items i ON i.entidad = 'lesson' AND i.entidad_id = p.leccion_id
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
UNION ALL
SELECT 'quiz_attempt_answers' AS metrica, COUNT(*)::bigint AS valor
FROM quiz_attempt_answers a
JOIN catalog_load_items i ON i.entidad = 'quiz' AND i.entidad_id = a.quiz_id
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
UNION ALL
SELECT 'user_badges' AS metrica, COUNT(*)::bigint AS valor
FROM user_badges ub
JOIN catalog_load_items i ON i.entidad = 'badge' AND i.entidad_id = ub.badge_id
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
UNION ALL
SELECT 'projects' AS metrica, COUNT(*)::bigint AS valor
FROM projects pr
JOIN catalog_load_items i ON i.entidad = 'course' AND i.entidad_id = pr.course_id
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
UNION ALL
SELECT 'course_completion_rules' AS metrica, COUNT(*)::bigint AS valor
FROM course_completion_rules ccr
JOIN catalog_load_items i ON i.entidad = 'course' AND i.entidad_id = ccr.course_id
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE b.codigo = '20261101-catalogo-tres-cursos'
;

DO $respuestas$
BEGIN
  IF to_regclass('public.lesson_quiz_responses') IS NOT NULL THEN
    INSERT INTO reversion_dependencias (metrica, valor)
    SELECT 'lesson_quiz_responses', COUNT(*)::bigint
    FROM lesson_quiz_responses r
    JOIN catalog_load_items i ON i.entidad = 'lesson' AND i.entidad_id = r.leccion_id
    JOIN catalog_load_batches b ON b.id = i.batch_id
    WHERE b.codigo = '20261101-catalogo-tres-cursos';
  END IF;
END;
$respuestas$;

DO $dependencias$
DECLARE
  detalle TEXT;
BEGIN
  SELECT string_agg(format('%s=%s', metrica, valor), ', ')
    INTO detalle
  FROM reversion_dependencias
  WHERE valor > 0;

  IF detalle IS NOT NULL THEN
    RAISE EXCEPTION 'Reversión física bloqueada: el lote tiene datos de usuarios (%). Usa la reversión segura y conserva el historial.', detalle;
  END IF;
END;
$dependencias$;

-- 1. Opciones (dependen de quizzes).
DELETE FROM quiz_options qo
USING catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'quiz_option'
  AND i.entidad_id = qo.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

-- 2. Cuestionarios y badges del lote.
DELETE FROM quizzes q
USING catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'quiz'
  AND i.entidad_id = q.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

DELETE FROM badges bg
USING catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'badge'
  AND i.entidad_id = bg.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

-- 3. Lecciones, módulos y cursos.
DELETE FROM lessons l
USING catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'lesson'
  AND i.entidad_id = l.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

DELETE FROM modules m
USING catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'module'
  AND i.entidad_id = m.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

DELETE FROM courses c
USING catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'course'
  AND i.entidad_id = c.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

-- 4. Cierre del manifiesto (los ítems se borran en cascada).
DELETE FROM catalog_load_batches
WHERE codigo = '20261101-catalogo-tres-cursos';

COMMIT;

-- Comprobación posterior: 0 filas en los cursos del lote.
SELECT c.id, c.titulo
FROM courses c
WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes');
