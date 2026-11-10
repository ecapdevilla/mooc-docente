-- =====================================================================
-- PILOTO SITUACIONAL: Inteligencia Artificial para Docentes (3 lecciones nuevas)
-- =====================================================================
-- Fuente: public/js/datos/modulos.js (curso mod3, lecciones L7/L8/L9)
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
  -- Resolver curso por título
  SELECT id INTO v_curso_id
  FROM courses
  WHERE titulo = 'Inteligencia Artificial para Docentes'
  LIMIT 1;

  IF v_curso_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el curso "Inteligencia Artificial para Docentes".';
  END IF;

  -- Crear módulo piloto si no existe
  INSERT INTO modules (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT v_curso_id,
         'Piloto Situacional: IA Pedagógica y Ética en el Aula',
         'Módulo de fortalecimiento con casos situacionales tipo concurso sobre IA generativa, verificación y protección de datos.',
         99,
         'Piloto IA',
         'fas fa-robot',
         'blue',
         TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM modules m
    WHERE m.curso_id = v_curso_id
      AND m.titulo = 'Piloto Situacional: IA Pedagógica y Ética en el Aula'
  );

  SELECT id INTO v_modulo_id
  FROM modules
  WHERE curso_id = v_curso_id
    AND titulo = 'Piloto Situacional: IA Pedagógica y Ética en el Aula'
  LIMIT 1;

  -- ---------- L7: Planificación didáctica con IA ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L7. IA en la planificación didáctica: de la idea a la secuencia de clase',
         'Caso, mapa conceptual y pregunta situacional sobre planificación con IA responsable.',
         '<p><strong>Caso:</strong> María debe planear una semana de ciencias para quinto grado y no sabe por dónde empezar. Usa una IA para generar la planeación completa sin revisar los estándares curriculares ni el contexto de sus estudiantes.</p><h4>🗺️ Mapa conceptual: planificación con IA responsable</h4><div class="info-box"><strong>Reto del aula</strong> → <strong>Estándar curricular</strong> → <strong>Prompt con rol, tarea, contexto y formato</strong> → <strong>Revisión y ajuste docente</strong> → <strong>Secuencia de clase</strong></div><h4>Lo que hace el docente vs. lo que hace la IA</h4><table style="width:100%; border-collapse: collapse; margin: 12px 0;"><tr style="background:#f4f6f8;"><th style="text-align:left; border:1px solid #ccc; padding:8px;">Momento</th><th style="text-align:left; border:1px solid #ccc; padding:8px;">Solo IA (riesgo)</th><th style="text-align:left; border:1px solid #ccc; padding:8px;">Docente con IA (acertado)</th></tr><tr><td style="border:1px solid #ccc; padding:8px;"><strong>Definir objetivo</strong></td><td style="border:1px solid #ccc; padding:8px;">Acepta cualquier objetivo que sugiera la IA.</td><td style="border:1px solid #ccc; padding:8px;">Valida que esté alineado a los estándares curriculares y al nivel.</td></tr><tr><td style="border:1px solid #ccc; padding:8px;"><strong>Diseñar actividades</strong></td><td style="border:1px solid #ccc; padding:8px;">Copia y pega lo que genere la IA sin adaptar.</td><td style="border:1px solid #ccc; padding:8px;">Adapta al contexto, recursos y tiempos reales de su aula.</td></tr><tr><td style="border:1px solid #ccc; padding:8px;"><strong>Evaluar</strong></td><td style="border:1px solid #ccc; padding:8px;">Usa la rúbrica de la IA sin revisar criterios.</td><td style="border:1px solid #ccc; padding:8px;">Valida y ajusta la rúbrica con su juicio pedagógico.</td></tr></table><div class="info-box"><strong>Principio clave:</strong> la IA genera propuestas; el docente decide, valida y es responsable pedagógicamente del resultado final.</div>',
         1, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L7. IA en la planificación didáctica: de la idea a la secuencia de clase'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L7. IA en la planificación didáctica: de la idea a la secuencia de clase'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'María usa una IA para generar su planeación semanal sin revisar estándares curriculares ni adaptar al contexto de sus estudiantes. ¿Cuál es el principal riesgo pedagógico?',
         'Correcto. Sin revisión del docente, la IA puede producir contenidos genéricos, desalineados con el currículo o inadecuados para el contexto.',
         'A, C y D son problemas técnicos o secundarios; el riesgo central es la falta de validación pedagógica y curricular.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'María usa una IA para generar su planeación semanal%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'María usa una IA para generar su planeación semanal%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'La secuencia puede no alinearse con los estándares ni con las necesidades reales del grupo.', TRUE, 1,
         'Falta de validación pedagógica y curricular del docente.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'La secuencia puede no alinearse%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'La IA no permite exportar la planeación a Word o PDF.', FALSE, 2,
         'Problema técnico secundario, no pedagógico central.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'La IA no permite exportar%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'La IA tarda demasiado en generar los contenidos.', FALSE, 3,
         'Tiempo de generación no afecta la calidad pedagógica.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'La IA tarda demasiado%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'La planeación queda almacenada en la nube de la plataforma de IA.', FALSE, 4,
         'Almacenamiento en nube es un tema de privacidad, no el riesgo pedagógico principal aquí.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'La planeación queda almacenada%');

  -- ---------- L8: Sesgos y alucinaciones ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L8. Sesgos, alucinaciones y verificación de IA generativa',
         'Caso, mapa conceptual y pregunta situacional sobre verificación crítica de IA.',
         '<p><strong>Caso:</strong> Un docente le pide a una IA que redacte una carta a padres sobre un proyecto de lectura. La IA inventa un decreto inexistente y cita un artículo del Código de la Infancia que no dice lo que afirma.</p><h4>🗺️ Mapa conceptual: verificación crítica</h4><div class="info-box"><strong>Resultado de IA</strong> → <strong>Identificar posible alucinación</strong> → <strong>Contrastar con fuente primaria</strong> → <strong>Corregir o descartar</strong></div><h4>Señales de alerta en contenido generado por IA</h4><ul><li>Citas de normas, leyes o autores sin número de artículo ni fuente verificable.</li><li>Datos estadísticos o estudios que no se pueden rastrear.</li><li>Respuestas muy seguras sobre temas específicos pero con imprecisiones técnicas.</li><li>Referencias a páginas web que no existen o no abren.</li></ul><div class="info-box"><strong>Dato clave del concurso:</strong> la IA puede "alucinar" (inventar información presentándola como real). El docente debe contrastar con fuentes primarias antes de usar cualquier contenido con estudiantes o familias.</div>',
         2, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L8. Sesgos, alucinaciones y verificación de IA generativa'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L8. Sesgos, alucinaciones y verificación de IA generativa'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Una IA generativa redacta un documento para familias y cita un artículo de una ley que parece plausible pero el docente no lo encuentra en el texto legal. ¿Qué debe hacer el docente?',
         'Correcto. Nunca usar contenido generado por IA con citas legales sin contrastar con la fuente primaria oficial.',
         'A asume que la IA es infalible; C solo traslada el problema a otra IA posible; D transfiere la responsabilidad a las familias.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Una IA generativa redacta un documento para familias%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Una IA generativa redacta un documento para familias%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Descartar la cita y contrastar la información con la fuente primaria (texto oficial de la ley) antes de incluirla.', TRUE, 1,
         'Contrastar con fuente primaria antes de usar citas legales.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Descartar la cita y contrastar%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Usar el texto igual porque la IA suena convincente y segura.', FALSE, 2,
         'Asume que la IA es infalible; riesgo de difundir información falsa.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Usar el texto igual%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Preguntar a otro sistema de IA para confirmar si el artículo existe.', FALSE, 3,
         'Otra IA también puede alucinar; no sustituye a la fuente primaria.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Preguntar a otro sistema de IA%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Enviar el documento tal cual y pedir a las familias que verifiquen.', FALSE, 4,
         'Transfiere la responsabilidad al destinatario en lugar de verificar previamente.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Enviar el documento tal cual%');

  -- ---------- L9: Protección de datos de menores ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L9. Protección de datos de menores y consentimiento con IA (Ley 1581 y 1098)',
         'Caso, mapa conceptual y pregunta situacional sobre privacidad y consentimiento.',
         '<p><strong>Caso:</strong> Un docente quiere subir fotos y nombres de sus estudiantes de primaria a una plataforma de IA para generar avatares personalizados y materiales didácticos, sin consultar a las familias ni revisar la política de privacidad de la plataforma.</p><h4>🗺️ Mapa conceptual: uso ético de datos con IA</h4><div class="info-box"><strong>Identificar datos personales</strong> → <strong>Solicitar consentimiento informado a acudientes</strong> → <strong>Revisar política de privacidad de la plataforma</strong> → <strong>Minimizar datos compartidos</strong></div><h4>Qué NO hacer con datos de menores en plataformas de IA</h4><ul><li>Subir nombres completos, fotos o datos de salud sin consentimiento informado.</li><li>Usar plataformas gratuitas sin revisar si almacenan o entrenan con esos datos.</li><li>Suponer que "porque es educativo" ya está permitido.</li></ul><div class="info-box"><strong>Norma clave:</strong> Ley 1581 de 2012 (Protección de Datos Personales) y Ley 1098 de 2006 (Código de Infancia y Adolescencia). [VERIFICAR alcance para menores en contextos educativos]</div>',
         3, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L9. Protección de datos de menores y consentimiento con IA (Ley 1581 y 1098)'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L9. Protección de datos de menores y consentimiento con IA (Ley 1581 y 1098)'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Un docente quiere subir fotos y nombres de estudiantes de primaria a una IA para generar avatares, sin consultar a las familias ni revisar la política de privacidad. ¿Cuál es la actuación más pertinente?',
         'Correcto. Se requiere consentimiento informado, revisión de la política de privacidad y minimización de datos personales compartidos.',
         'A, C y D vulneran la protección de datos personales de menores: no basta con fines educativos, omitir apellidos no elimina el dato personal, y pedir perdón después no sustituye al consentimiento previo.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Un docente quiere subir fotos y nombres de estudiantes de primaria%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Un docente quiere subir fotos y nombres de estudiantes de primaria%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Solicitar consentimiento informado a los acudientes, revisar la política de privacidad de la plataforma y minimizar los datos personales compartidos.', TRUE, 1,
         'Consentimiento informado + revisión de privacidad + minimización de datos.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Solicitar consentimiento informado a los acudientes%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Proceder porque es material educativo y no se vende nada.', FALSE, 2,
         'Fines educativos no eximen del consentimiento para datos de menores.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Proceder porque es material educativo%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Usar solo nombres de pila sin apellidos para "proteger la identidad" sin consentimiento.', FALSE, 3,
         'Omitir apellidos no elimina el dato personal; sigue requiriendo consentimiento.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Usar solo nombres de pila%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Pedir permiso después de subir las imágenes, si alguna familia se queja.', FALSE, 4,
         'El consentimiento debe ser previo, no posterior a una queja.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Pedir permiso después de subir%');

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
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
      AND l.titulo LIKE 'L%. %';

    SELECT COUNT(*) INTO v_total_quizzes
    FROM quizzes q
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
      AND l.titulo LIKE 'L%. %'
      AND q.estado_revision = 'publicado';

    SELECT COUNT(*) INTO v_total_opciones
    FROM quiz_options qo
    JOIN quizzes q ON q.id = qo.quiz_id
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
      AND l.titulo LIKE 'L%. %';

    SELECT COUNT(*) INTO v_quizzes_sin_una_correcta
    FROM quizzes q
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo = 'Inteligencia Artificial para Docentes'
      AND l.titulo LIKE 'L%. %'
      AND (SELECT COUNT(*) FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.es_correcta) <> 1;

    RAISE NOTICE 'PILOTO IA: lecciones=% quizzes_publicados=% opciones=% quizzes_sin_una_correcta=%',
      v_total_lecciones, v_total_quizzes, v_total_opciones, v_quizzes_sin_una_correcta;

    IF v_quizzes_sin_una_correcta > 0 THEN
      RAISE EXCEPTION 'Hay quizzes sin exactamente una respuesta correcta.';
    END IF;
  END;
END $$;

COMMIT;
