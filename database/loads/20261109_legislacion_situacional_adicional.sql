-- =====================================================================
-- PILOTO SITUACIONAL: Legislación Educativa Colombiana (lecciones adicionales L4-L6)
-- =====================================================================
-- Complementa a 20261109_piloto_legislacion_situacional.sql (L1-L3).
-- Fuente: public/js/datos/modulos.js (curso mod2, lecciones L4/L5/L6 adicionales)
-- Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>
-- Idempotente, transaccional, no toca datos previos ni usuarios.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_curso_id integer;
  v_modulo_id integer;
  v_leccion_id integer;
  v_quiz_id integer;
BEGIN
  SELECT id INTO v_curso_id
  FROM courses
  WHERE titulo = 'Legislación Educativa Colombiana'
  LIMIT 1;

  IF v_curso_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el curso "Legislación Educativa Colombiana".';
  END IF;

  SELECT id INTO v_modulo_id
  FROM modules
  WHERE curso_id = v_curso_id
    AND titulo = 'Piloto Situacional: Convivencia, Evaluación e Inclusión'
  LIMIT 1;

  IF v_modulo_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el módulo piloto de Legislación. Ejecutar primero 20261109_piloto_legislacion_situacional.sql.';
  END IF;

  -- ---------- L4: Protocolo de acoso ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L4. Protocolo de acoso escolar: pasos de actuación (Ley 1620)',
         'Caso, mapa conceptual y pregunta situacional sobre protocolo de acoso.',
         '<p><strong>Caso:</strong> Un docente recibe un reporte de que un estudiante de séptimo es excluido y señalado en grupos de WhatsApp del curso. La familia pide "que se castigue ya".</p><h4>🗺️ Mapa conceptual: actuación ante acoso escolar</h4><div class="info-box"><strong>Acoger el reporte con reserva</strong> → <strong>Registrar hechos y evidencias</strong> → <strong>Activar ruta/comité de convivencia</strong> → <strong>Protección y seguimiento</strong></div><h4>Lo que NO se debe hacer</h4><ul><li>Sancionar sin investigación ni debido proceso.</li><li>Exponer públicamente al estudiante agresor o a la víctima.</li><li>Cerrar el caso con una disculpa informal sin seguimiento institucional.</li></ul><div class="info-box"><strong>Norma clave:</strong> Ley 1620 de 2013, Ruta de Atención Integral y protocolos del Comité Escolar de Convivencia. [VERIFICAR arts. 29–31]</div>',
         4, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L4. Protocolo de acoso escolar: pasos de actuación (Ley 1620)'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L4. Protocolo de acoso escolar: pasos de actuación (Ley 1620)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Ante un reporte de acoso escolar en grupos de WhatsApp del curso, ¿cuál es el primer paso más pertinente del docente?',
         'Correcto. El primer paso es acoger, documentar y activar la ruta institucional con reserva.',
         'A, C y D omiten el debido proceso, la protección inmediata o la activación oportuna de la ruta.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Ante un reporte de acoso escolar en grupos de WhatsApp%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Ante un reporte de acoso escolar en grupos de WhatsApp%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Acoger el reporte con reserva, documentar lo conocido y activar la ruta de atención/comité según el manual de convivencia.', TRUE, 1,
         'Primera actuación: acoger, documentar y activar ruta con reserva.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Acoger el reporte con reserva, documentar%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Sancionar inmediatamente a los presuntos agresores para enviar mensaje contundente.', FALSE, 2,
         'Castigo sin investigación ni debido proceso.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Sancionar inmediatamente%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Pedir a los estudiantes que resuelvan el conflicto solos entre ellos.', FALSE, 3,
         'Omite el deber de cuidado y acompañamiento institucional.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Pedir a los estudiantes que resuelvan%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Esperar a que la familia interponga una denuncia formal antes de actuar.', FALSE, 4,
         'Retrasa la activación oportuna de la ruta institucional.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Esperar a que la familia interponga%');

  -- ---------- L5: Reclamaciones de evaluación ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L5. Reclamaciones de evaluación y derechos de la familia (Decreto 1290)',
         'Caso, mapa conceptual y pregunta situacional sobre reclamaciones de evaluación.',
         '<p><strong>Caso:</strong> Una familia no está de acuerdo con la valoración final de su hijo y solicita "cambiar la nota" directamente al docente.</p><h4>🗺️ Mapa conceptual: reclamo de evaluación</h4><div class="info-box"><strong>Revisar evidencias y criterios del SIEE</strong> → <strong>Informar de forma clara y oportuna</strong> → <strong>Orientar sobre instancias de reclamación formal</strong></div><h4>Qué hacer ante el reclamo</h4><ul><li>Mostrar los criterios y evidencias que fundamentan la valoración.</li><li>Explicar la escala de valoración institucional.</li><li>Orientar sobre el procedimiento y tiempos de reclamación previstos en el SIEE.</li><li>Dejar registro de la atención a la familia.</li></ul><div class="info-box"><strong>Norma clave:</strong> Decreto 1290 de 2009, art. 4 (instancias, procedimientos y mecanismos de atención y resolución de reclamaciones sobre evaluación y promoción). [VERIFICAR literal]</div>',
         5, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L5. Reclamaciones de evaluación y derechos de la familia (Decreto 1290)'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L5. Reclamaciones de evaluación y derechos de la familia (Decreto 1290)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Una familia solicita cambiar la valoración final de su hijo. ¿Cuál es la actuación más pertinente del docente?',
         'Correcto. Combina transparencia pedagógica con respeto por la vía institucional de reclamación.',
         'A, C y D vulneran criterios de equidad, desconocen instancias de reclamación o reducen la evaluación a trámites informales.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Una familia solicita cambiar la valoración final de su hijo%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Una familia solicita cambiar la valoración final de su hijo%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Revisar evidencias y criterios del SIEE, informar claramente y orientar sobre el procedimiento formal de reclamación si persiste el desacuerdo.', TRUE, 1,
         'Transparencia pedagógica + vía institucional de reclamación.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Revisar evidencias y criterios del SIEE%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Cambiar la nota de inmediato para evitar conflicto con la familia.', FALSE, 2,
         'Cambio no sustentado afecta equidad y trazabilidad.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Cambiar la nota de inmediato%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Negar toda explicación porque la decisión del docente es final e inapelable.', FALSE, 3,
         'Desconoce el derecho a información y a reclamar.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Negar toda explicación%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Someter la nota a votación de los demás estudiantes para decidir.', FALSE, 4,
         'La evaluación no se decide por votación; carece de fundamento técnico.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Someter la nota a votación%');

  -- ---------- L6: Ajustes razonables ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L6. Ajustes razonables y PIAR en la práctica docente (Decreto 1421)',
         'Caso, mapa conceptual y pregunta situacional sobre ajustes razonables.',
         '<p><strong>Caso:</strong> Un estudiante con discapacidad motriz necesita usar computadora para escribir en clases y exámenes. El docente duda si "bajar el nivel" o cómo ajustar.</p><h4>🗺️ Mapa conceptual: ajustes razonables</h4><div class="info-box"><strong>Identificar barrera</strong> → <strong>Valorar pedagógica y socialmente</strong> → <strong>Acordar ajustes en el PIAR</strong> → <strong>Implementar con seguimiento</strong></div><h4>Ajustes razonables NO son</h4><ul><li>Bajar automáticamente el objetivo de aprendizaje.</li><li>Exonerar al estudiante de toda evaluación sin criterio.</li><li>Hacer un plan diferente y aislado sin articulación con el grupo.</li></ul><div class="info-box"><strong>Norma clave:</strong> Decreto 1421 de 2017, PIAR y ajustes razonables para garantizar acceso, participación, permanencia y promoción. [VERIFICAR definiciones de PIAR y DUA]</div>',
         6, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L6. Ajustes razonables y PIAR en la práctica docente (Decreto 1421)'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L6. Ajustes razonables y PIAR en la práctica docente (Decreto 1421)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Un estudiante con discapacidad motriz requiere computadora para escribir en clases y exámenes. ¿Cuál es la actuación más pertinente?',
         'Correcto. El ajuste razonable elimina barreras de acceso/expresión sin bajar el propósito de aprendizaje.',
         'A, B y D reducen expectativas, eliminan evidencias o carecen de trazabilidad institucional.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Un estudiante con discapacidad motriz requiere computadora%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Un estudiante con discapacidad motriz requiere computadora%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Acordar en el PIAR el uso de computadora como ajuste razonable, manteniendo el propósito de aprendizaje con criterios claros.', TRUE, 1,
         'Ajuste razonable que elimina barrera sin bajar el propósito de aprendizaje.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Acordar en el PIAR el uso de computadora%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Bajar el objetivo de aprendizaje para que apruebe sin esfuerzo.', FALSE, 2,
         'Reduce expectativas sin sustento individual.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Bajar el objetivo de aprendizaje%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Exonerarlo de toda evaluación escrita durante el periodo.', FALSE, 3,
         'Elimina oportunidades de aprendizaje y evidencia.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Exonerarlo de toda evaluación%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Dejar que el estudiante decida si escribe o no, sin registro institucional.', FALSE, 4,
         'Sin criterios ni trazabilidad, debilita validez y seguimiento.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Dejar que el estudiante decida%');

  -- Verificación final
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
      AND l.titulo LIKE 'L%. %'
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

    RAISE NOTICE 'PILOTO LEGISLACIÓN ADICIONAL: lecciones=% quizzes_publicados=% opciones=% quizzes_sin_una_correcta=%',
      v_total_lecciones, v_total_quizzes, v_total_opciones, v_quizzes_sin_una_correcta;

    IF v_quizzes_sin_una_correcta > 0 THEN
      RAISE EXCEPTION 'Hay quizzes sin exactamente una respuesta correcta.';
    END IF;
  END;
END $$;

COMMIT;
