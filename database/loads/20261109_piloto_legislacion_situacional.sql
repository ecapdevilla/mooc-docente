-- =====================================================================
-- PILOTO SITUACIONAL: Legislación Educativa Colombiana (3 lecciones nuevas)
-- =====================================================================
-- Fuente: public/js/datos/modulos.js (curso mod2, lecciones L1/L2/L3)
-- Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>
-- Características: idempotente (WHERE NOT EXISTS), transaccional, no toca
-- datos previos ni usuarios.
-- =====================================================================

BEGIN;

-- 1. Resolver course_id del curso Legislación por título (idempotente, no asume ID fijo)
DO $$
DECLARE
  v_curso_id integer;
BEGIN
  SELECT id INTO v_curso_id
  FROM courses
  WHERE titulo = 'Legislación Educativa Colombiana'
  LIMIT 1;

  IF v_curso_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el curso "Legislación Educativa Colombiana". Ejecutar primero la carga del catálogo.';
  END IF;

  -- 2. Insertar módulo piloto si no existe (título dentro del curso)
  INSERT INTO modules (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT v_curso_id,
         'Piloto Situacional: Convivencia, Evaluación e Inclusión',
         'Módulo de fortalecimiento con casos situacionales tipo concurso, basados en Ley 1620/2013, Decreto 1290/2009 y Decreto 1421/2017.',
         99,
         'Piloto Situacional',
         'fas fa-gavel',
         'green',
         TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM modules m
    WHERE m.curso_id = v_curso_id
      AND m.titulo = 'Piloto Situacional: Convivencia, Evaluación e Inclusión'
  );

  -- 3. Insertar las 3 lecciones del piloto si no existen (título dentro del módulo)
  -- Obtener module_id del módulo recién creado/ existente
  DECLARE
    v_modulo_id integer;
  BEGIN
    SELECT id INTO v_modulo_id
    FROM modules
    WHERE curso_id = v_curso_id
      AND titulo = 'Piloto Situacional: Convivencia, Evaluación e Inclusión'
    LIMIT 1;

    -- Lección L1: Ruta de atención y convivencia (Ley 1620)
    INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
    SELECT v_modulo_id,
           'L1. Ruta de atención y convivencia escolar (Ley 1620 de 2013)',
           'Caso, aplicación y pregunta situacional sobre la Ruta de Atención Integral.',
           '<p><strong>Caso:</strong> estudiantes reportan que, desde hace semanas, un compañero recibe mensajes ofensivos en el grupo de WhatsApp del curso y hoy fue ridiculizado frente a otros. El estudiante afectado pide que “no se arme un problema grande”.</p><h4>Qué hacer</h4><ul><li><strong>Proteger</strong> al estudiante afectado sin exponerlo ni revictimizarlo.</li><li><strong>Registrar</strong> los hechos, versiones y evidencias con trazabilidad.</li><li><strong>Activar</strong> la Ruta de Atención Integral y el protocolo del manual de convivencia.</li><li>Informar a las familias dentro del debido proceso y hacer <strong>seguimiento</strong>.</li></ul><div class="info-box"><strong>Norma clave:</strong> Ley 1620 de 2013 crea la Ruta de Atención Integral (promoción, prevención, atención y seguimiento). El Comité Escolar de Convivencia interviene en el marco del manual de convivencia. [VERIFICAR arts. 13, 29–31]</div>',
           1,
           TRUE,
           TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = v_modulo_id
        AND l.titulo = 'L1. Ruta de atención y convivencia escolar (Ley 1620 de 2013)'
    );

    -- Lección L2: Evaluación formativa, SIEE y promoción (Decreto 1290)
    INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
    SELECT v_modulo_id,
           'L2. Evaluación formativa, SIEE y promoción (Decreto 1290 de 2009)',
           'Caso, aplicación y pregunta situacional sobre evaluación institucional.',
           '<p><strong>Caso:</strong> al cierre de periodo, un estudiante obtiene bajo desempeño en ciencias y ha tenido inasistencias por situación familiar conocida. La familia pregunta si “ya perdió la materia”.</p><h4>Qué hacer</h4><ul><li>Sustentar la valoración con <strong>evidencias y criterios del SIEE</strong>, no con una nota aislada.</li><li><strong>Retroalimentar</strong> oportunamente y definir apoyos y seguimiento.</li><li>Comunicar con claridad a la familia y al estudiante.</li><li>Usar las instancias de reclamación si persiste el desacuerdo; decidir promoción según el SIEE.</li></ul><div class="info-box"><strong>Norma clave:</strong> Decreto 1290 de 2009 reglamenta la evaluación del aprendizaje y promoción. La evaluación institucional es permanente, objetiva y formativa; el SIEE define criterios de evaluación, promoción, apoyos e instancias de reclamación. [VERIFICAR arts. 3, 4, 6]</div>',
           2,
           TRUE,
           TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = v_modulo_id
        AND l.titulo = 'L2. Evaluación formativa, SIEE y promoción (Decreto 1290 de 2009)'
    );

    -- Lección L3: Educación inclusiva, ajustes razonables y PIAR (Decreto 1421)
    INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
    SELECT v_modulo_id,
           'L3. Educación inclusiva, ajustes razonables y PIAR (Decreto 1421 de 2017)',
           'Caso, aplicación y pregunta situacional sobre educación inclusiva.',
           '<p><strong>Caso:</strong> ingresa a 5° un estudiante con discapacidad auditiva que usa apoyos comunicativos. La próxima unidad incluye videos, debate y evaluación escrita. ¿Bajar el nivel, exonerarlo o atenderlo aparte?</p><h4>Qué hacer</h4><ul><li>Identificar <strong>barreras del entorno</strong>, no “deficit” del estudiante como excusa de exclusión.</li><li>Planear con <strong>DUA</strong>: múltiples formas de presentar información, participar y evidenciar aprendizaje.</li><li>Concertar y documentar <strong>ajustes razonables</strong> en el PIAR, sin reducir expectativas de aprendizaje.</li><li>Articular con familia, apoyos y equipo institucional; mantener seguimiento.</li></ul><div class="info-box"><strong>Norma clave:</strong> Decreto 1421 de 2017 reglamenta la atención educativa en educación inclusiva. Define Ajustes Razonables, DUA y PIAR como herramienta para garantizar aprendizaje, participación, permanencia y promoción. [VERIFICAR definiciones en extracto]</div>',
           3,
           TRUE,
           TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.modulo_id = v_modulo_id
        AND l.titulo = 'L3. Educación inclusiva, ajustes razonables y PIAR (Decreto 1421 de 2017)'
    );

  END;
END $$;

-- 4. Insertar quizzes y opciones para cada lección del piloto (idempotente)
-- L1
DO $$
DECLARE
  v_leccion_id integer;
  v_quiz_id integer;
BEGIN
  SELECT l.id INTO v_leccion_id
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo = 'L1. Ruta de atención y convivencia escolar (Ley 1620 de 2013)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id,
         (SELECT id FROM modules m WHERE m.id = (SELECT modulo_id FROM lessons WHERE id = v_leccion_id)),
         'Docente de 8°. Reportan mensajes ofensivos reiterados en WhatsApp del curso y ridiculización de un compañero. El afectado pide discreción. ¿Cuál actuación es más pertinente para iniciar el abordaje?',
         'Correcto. La ruta se activa con reserva, protección del afectado y registro institucional; no se cierra con disculpas informales ni se deja solo al afectado.',
         'Opciones A, B y D fallan: expón al grupo (A), informalidad que ignora la ruta (B) o trasladas la carga al exterior sin activar el protocolo interno (D).',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Docente de 8°. Reportan mensajes ofensivos reiterados%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q
  WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Docente de 8°. Reportan mensajes ofensivos reiterados%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Acoger el reporte con reserva, documentar lo conocido, orientar medidas inmediatas de protección y activar el protocolo/ruta según el manual institucional.', TRUE, 1,
         'La ruta se activa con reserva, protección del afectado y registro institucional.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Acoger el reporte con reserva%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Citar a los involucrados con coordinación para escuchar versiones y compromisos, informando al grupo que el tema se maneja para evitar rumores.', FALSE, 2,
         'Informar al grupo expone el caso y puede revictimizar.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Citar a los involucrados%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Acordar con el afectado una disculpa mediada y, si la acepta, dejar constancia informal para no activar un trámite mayor.', FALSE, 3,
         'Cerrar con disculpa informal ante hechos reiterados desconoce la ruta.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Acordar con el afectado una disculpa%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Orientar al estudiante y su familia para recopilar capturas y denunciar ante autoridad externa, mientras el colegio observa si hay nuevos hechos.', FALSE, 4,
         'Traslada la carga al exterior sin activar el protocolo interno.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Orientar al estudiante y su familia%');
END $$;

-- L2
DO $$
DECLARE
  v_leccion_id integer;
  v_quiz_id integer;
BEGIN
  SELECT l.id INTO v_leccion_id
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo = 'L2. Evaluación formativa, SIEE y promoción (Decreto 1290 de 2009)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id,
         (SELECT id FROM modules m WHERE m.id = (SELECT modulo_id FROM lessons WHERE id = v_leccion_id)),
         '9°. Cierre de periodo: bajo desempeño en ciencias e inasistencias por situación familiar conocida. La familia pregunta si el estudiante “ya perdió”. ¿Cuál actuación es más pertinente?',
         'Correcto. Hace transparente la evaluación, la vincula al SIEE y activa apoyo/seguimiento sin adelantar conclusiones improcedentes.',
         'Opciones A, C y D fallan: cierre prematuro (A), sacrificio de criterios y evidencias (C), o suspensión sin registro ni plan que debilita objetividad (D).',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE '9°. Cierre de periodo: bajo desempeño en ciencias%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q
  WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE '9°. Cierre de periodo: bajo desempeño en ciencias%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Socializar evidencias y criterios del SIEE, explicar el estado del proceso, definir apoyos y seguimiento, y acordar compromisos, indicando cómo se valora según el sistema institucional.', TRUE, 1,
         'Vincula la valoración al SIEE y activa apoyo y seguimiento.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Socializar evidencias y criterios del SIEE%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Confirmar que el bajo desempeño del periodo define la pérdida, para que la familia tome medidas desde ya.', FALSE, 2,
         'Presenta un corte parcial como decisión cerrada.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Confirmar que el bajo desempeño%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Ajustar la valoración a desempeño básico para evitar desmotivación, dejando los apoyos como opcionales.', FALSE, 3,
         'Sacrifica criterios/evidencias y vuelve el apoyo discrecional.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Ajustar la valoración a desempeño básico%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Suspender la valoración del periodo hasta normalizar la situación familiar, sin registro de evidencias ni plan de apoyo.', FALSE, 4,
         'Sin registro ni plan debilita objetividad y trazabilidad.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Suspender la valoración del periodo%');
END $$;

-- L3
DO $$
DECLARE
  v_leccion_id integer;
  v_quiz_id integer;
BEGIN
  SELECT l.id INTO v_leccion_id
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo = 'L3. Educación inclusiva, ajustes razonables y PIAR (Decreto 1421 de 2017)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id,
         (SELECT id FROM modules m WHERE m.id = (SELECT modulo_id FROM lessons WHERE id = v_leccion_id)),
         '5°. Estudiante con discapacidad auditiva usa apoyos comunicativos. La unidad incluye videos, debate y evaluación escrita. ¿Cuál actuación es más pertinente?',
         'Correcto. Elimina barreras desde el diseño y documenta ajustes individualizados sin excluir al estudiante.',
         'Opciones A, C y D fallan: refuerzo sin eliminar barreras (A), riesgo de separación curricular (C), o flexibilidad sin criterios/registro que debilita validez (D).',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE '5°. Estudiante con discapacidad auditiva usa apoyos comunicativos%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q
  WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE '5°. Estudiante con discapacidad auditiva usa apoyos comunicativos%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Diseñar con DUA y acordar en el PIAR ajustes razonables para acceso, participación y formas de evidenciar el aprendizaje.', TRUE, 1,
         'Actúa sobre barreras desde el diseño y documenta ajustes sin excluir.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Diseñar con DUA y acordar en el PIAR%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Mantener las actividades previstas para todos y ofrecer explicación adicional al final de cada clase.', FALSE, 2,
         'El refuerzo ayuda, pero no elimina barreras de acceso/participación.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Mantener las actividades previstas%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Asignar actividades alternativas sobre contenidos previos mientras el grupo desarrolla la unidad.', FALSE, 3,
         'Riesgo de separación curricular y menores oportunidades.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Asignar actividades alternativas%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Sustituir toda evaluación por observación informal, sin criterios registrados.', FALSE, 4,
         'Flexibilidad sin criterios/registro debilita validez y seguimiento.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Sustituir toda evaluación%');
END $$;

-- 5. Verificación final (autoverificable: conteos y una sola correcta por quiz)
DO $$
DECLARE
  v_total_lecciones integer;
  v_total_quizzes integer;
  v_total_opciones integer;
  v_quizzes_sin_una_correcta integer;
BEGIN
  SELECT COUNT(*) INTO v_total_lecciones
  FROM lessons l
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo LIKE 'L%. %';

  SELECT COUNT(*) INTO v_total_quizzes
  FROM quizzes q
  JOIN lessons l ON l.id = q.leccion_id
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND q.estado_revision = 'publicado';

  SELECT COUNT(*) INTO v_total_opciones
  FROM quiz_options qo
  JOIN quizzes q ON q.id = qo.quiz_id
  JOIN lessons l ON l.id = q.leccion_id
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo LIKE 'L%. %';

  SELECT COUNT(*) INTO v_quizzes_sin_una_correcta
  FROM quizzes q
  JOIN lessons l ON l.id = q.leccion_id
  JOIN modules m ON m.id = l.modulo_id
  JOIN courses c ON c.id = m.curso_id
  WHERE c.titulo = 'Legislación Educativa Colombiana'
    AND l.titulo LIKE 'L%. %'
    AND (SELECT COUNT(*) FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.es_correcta) <> 1;

  RAISE NOTICE 'PILOTO LEGISLACIÓN: lecciones=% quizzes_publicados=% opciones=% quizzes_sin_una_correcta=%',
    v_total_lecciones, v_total_quizzes, v_total_opciones, v_quizzes_sin_una_correcta;

  IF v_quizzes_sin_una_correcta > 0 THEN
    RAISE EXCEPTION 'Hay quizzes sin exactamente una respuesta correcta.';
  END IF;
END $$;

COMMIT;
