-- =====================================================================
-- REVERSIÓN SEGURA DEL LOTE (DESACTIVA SIN BORRAR DATOS DE USUARIOS)
-- =====================================================================
-- Generado por scripts/generar-carga-catalogo.js (lote 20261101-catalogo-tres-cursos).
-- Fuente de contenido: public/js/datos/modulos.js (const MODULES).
-- Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>
--
-- Este archivo NO elimina filas del catálogo ni de los usuarios: deja los
-- cursos, módulos y lecciones del lote con activo = FALSE, archiva sus
-- cuestionarios y marca el lote como revertido.
--
-- Por qué no se borra: las claves foráneas de la plataforma usan
-- ON DELETE CASCADE, así que borrar un curso eliminaría en cascada
-- matrículas (enrollments), progreso (user_progress), badges obtenidos
-- (user_badges), respuestas de intentos (quiz_attempt_answers), proyectos
-- de usuarios (projects), reglas de finalización y respuestas de lección
-- (lesson_quiz_responses). La reversión segura conserva todo el historial.
--
-- Efecto posterior: la API deja de listar el lote porque filtra
-- activo = TRUE, y los datos históricos quedan disponibles para auditoría.
-- Para republicarlo, ejecutar de nuevo la carga: es idempotente y reactiva
-- las filas del lote (paso 1.b).
--
-- Al final se comparan los conteos de datos de usuarios antes y después;
-- si alguna métrica cambia, la transacción aborta con excepción.


BEGIN;

-- 0. Guardia: el manifiesto del lote debe existir en este entorno.
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

ALTER TABLE catalog_load_batches ADD COLUMN IF NOT EXISTS revertido_en TIMESTAMP;

-- 1. Foto de los datos de usuarios vinculados al lote (antes).
CREATE TEMP TABLE reversion_antes ON COMMIT DROP AS
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
    INSERT INTO reversion_antes (metrica, valor)
    SELECT 'lesson_quiz_responses', COUNT(*)::bigint
    FROM lesson_quiz_responses r
    JOIN catalog_load_items i ON i.entidad = 'lesson' AND i.entidad_id = r.leccion_id
    JOIN catalog_load_batches b ON b.id = i.batch_id
    WHERE b.codigo = '20261101-catalogo-tres-cursos';
  END IF;
END;
$respuestas$;

-- 2. Desactivación del catálogo del lote (sin DELETE).
UPDATE courses c
SET activo = FALSE
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'course'
  AND i.entidad_id = c.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

UPDATE modules m
SET activo = FALSE
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'module'
  AND i.entidad_id = m.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

UPDATE lessons l
SET activo = FALSE
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'lesson'
  AND i.entidad_id = l.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

-- 2.b Los cuestionarios del lote quedan archivados: la API no los sirve
--     como actividad publicada mientras el lote esté revertido.
UPDATE quizzes q
SET estado_revision = 'archivado'
FROM catalog_load_items i
JOIN catalog_load_batches b ON b.id = i.batch_id
WHERE i.entidad = 'quiz'
  AND i.entidad_id = q.id
  AND b.codigo = '20261101-catalogo-tres-cursos';

-- 2.c Los badges ya obtenidos por usuarios se conservan (la tabla badges
--     no tiene columna activo). Quedan asociados a módulos inactivos.

-- 3. Marca del lote (auditoría de la reversión).
UPDATE catalog_load_batches
SET revertido_en = CURRENT_TIMESTAMP
WHERE codigo = '20261101-catalogo-tres-cursos'
  AND revertido_en IS NULL;

-- 4. Foto posterior y comparación estricta de datos de usuarios.
CREATE TEMP TABLE reversion_despues ON COMMIT DROP AS
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
    INSERT INTO reversion_despues (metrica, valor)
    SELECT 'lesson_quiz_responses', COUNT(*)::bigint
    FROM lesson_quiz_responses r
    JOIN catalog_load_items i ON i.entidad = 'lesson' AND i.entidad_id = r.leccion_id
    JOIN catalog_load_batches b ON b.id = i.batch_id
    WHERE b.codigo = '20261101-catalogo-tres-cursos';
  END IF;
END;
$respuestas$;

DO $integridad$
DECLARE
  diferencias TEXT;
BEGIN
  SELECT string_agg(format('%s (antes %s, despues %s)', d.metrica, d.antes, d.despues), '; ')
    INTO diferencias
  FROM (
    SELECT a.metrica, a.valor AS antes, COALESCE(dp.valor, -1) AS despues
    FROM reversion_antes a
    LEFT JOIN reversion_despues dp ON dp.metrica = a.metrica
    WHERE a.valor <> COALESCE(dp.valor, -1)
  ) d;

  IF diferencias IS NOT NULL THEN
    RAISE EXCEPTION 'La operación alteró datos de usuarios: %', diferencias;
  END IF;
END;
$integridad$;

COMMIT;

-- Comprobación posterior: el catálogo del lote queda inactivo.
SELECT c.id, c.titulo, c.activo
FROM courses c
WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')
ORDER BY c.id;
