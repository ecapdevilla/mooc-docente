-- =====================================================================
-- PILOTO SITUACIONAL: Fundamentos de Pedagogía y Didáctica (3 lecciones nuevas)
-- =====================================================================
-- Fuente: public/js/datos/modulos.js (curso mod1, lecciones L4/L5/L6)
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
  WHERE titulo = 'Fundamentos de Pedagogía y Didáctica'
  LIMIT 1;

  IF v_curso_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el curso "Fundamentos de Pedagogía y Didáctica".';
  END IF;

  -- Crear módulo piloto si no existe
  INSERT INTO modules (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)
  SELECT v_curso_id,
         'Piloto Situacional: Didáctica, Evaluación y Convivencia',
         'Módulo de fortalecimiento con casos situacionales tipo concurso para el curso de Pedagogía.',
         99,
         'Piloto Pedagógico',
         'fas fa-chalkboard-teacher',
         'gold',
         TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM modules m
    WHERE m.curso_id = v_curso_id
      AND m.titulo = 'Piloto Situacional: Didáctica, Evaluación y Convivencia'
  );

  SELECT id INTO v_modulo_id
  FROM modules
  WHERE curso_id = v_curso_id
    AND titulo = 'Piloto Situacional: Didáctica, Evaluación y Convivencia'
  LIMIT 1;

  -- ---------- L4: Didáctica activa ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L4. Didáctica activa y aprendizaje significativo',
         'Caso, mapa conceptual y pregunta situacional sobre didáctica activa.',
         '<p><strong>Caso:</strong> Laura enseña sexto grado. Nota que sus estudiantes memorizan definiciones para la prueba, pero no saben aplicar los conceptos en situaciones reales de su comunidad.</p><h4>🗺️ Mapa conceptual: de la teoría a la práctica</h4><div class="info-box"><strong>Objetivo de aprendizaje</strong> → <strong>Estrategia didáctica</strong> → <strong>Actitud de aula</strong> → <strong>Evidencia de aprendizaje</strong></div><h4>Clase tradicional vs. Clase activa</h4><table style="width:100%; border-collapse: collapse; margin: 12px 0;"><tr style="background:#f4f6f8;"><th style="text-align:left; border:1px solid #ccc; padding:8px;">Elemento</th><th style="text-align:left; border:1px solid #ccc; padding:8px;">Tradicional</th><th style="text-align:left; border:1px solid #ccc; padding:8px;">Activa (significativa)</th></tr><tr><td style="border:1px solid #ccc; padding:8px;"><strong>Rol del docente</strong></td><td style="border:1px solid #ccc; padding:8px;">Explica y transmite conocimiento.</td><td style="border:1px solid #ccc; padding:8px;">Diseña situaciones y guía la construcción del estudiante.</td></tr><tr><td style="border:1px solid #ccc; padding:8px;"><strong>Rol del estudiante</strong></td><td style="border:1px solid #ccc; padding:8px;">Escucha y repite.</td><td style="border:1px solid #ccc; padding:8px;">Investiga, resuelve problemas y crea.</td></tr><tr><td style="border:1px solid #ccc; padding:8px;"><strong>Evaluación</strong></td><td style="border:1px solid #ccc; padding:8px;">Prueba escrita al final.</td><td style="border:1px solid #ccc; padding:8px;">Rúbricas, portafolios y desempeño en tareas reales.</td></tr></table><div class="info-box"><strong>Dato clave del concurso:</strong> el aprendizaje significativo (Ausubel) ocurre cuando lo nuevo se conecta con los saberes previos del estudiante. No es "entretenimiento", es intención pedagógica.</div>',
         1, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L4. Didáctica activa y aprendizaje significativo'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L4. Didáctica activa y aprendizaje significativo'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Laura diseña una clase de ciencias sobre el ciclo del agua. En lugar de solo explicar, lleva a los estudiantes a observar charcos, medir temperatura y dibujar el proceso en su entorno. ¿Qué principio didáctico aplica principalmente?',
         'Correcto. Es aprendizaje significativo: ancla lo nuevo en lo que el estudiante ya sabe y vive.',
         'A, C y D son enfoques tradicionales que no garantizan comprensión ni transferencia a la vida real.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Laura diseña una clase de ciencias sobre el ciclo del agua%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Laura diseña una clase de ciencias sobre el ciclo del agua%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Conexión del nuevo conocimiento con los saberes previos y el contexto real de los estudiantes.', TRUE, 1,
         'Aprendizaje significativo: ancla lo nuevo en lo ya conocido.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Conexión del nuevo conocimiento%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Memorización repetitiva para asegurar la respuesta correcta en la prueba.', FALSE, 2,
         'No garantiza comprensión ni transferencia.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Memorización repetitiva%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Evaluación únicamente con pruebas escritas al final de la unidad.', FALSE, 3,
         'Solo califica, no apoya el proceso de aprendizaje.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Evaluación únicamente%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'El docente explica todo el contenido y los estudiantes toman notas.', FALSE, 4,
         'Enfoque transmisivo sin participación del estudiante.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'El docente explica todo el contenido%');

  -- ---------- L5: Evaluación formativa ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L5. Evaluación formativa y retroalimentación',
         'Caso, mapa conceptual y pregunta situacional sobre evaluación formativa.',
         '<p><strong>Caso:</strong> Carlos aplica una evaluación y el 60 % del grupo no alcanza el desempeño esperado. La familia pregunta por la nota final y Carlos no sabe si avanzar o reforzar.</p><h4>🗺️ Mapa conceptual: tipos de evaluación</h4><div class="info-box"><strong>Diagnóstico</strong> (inicio) → <strong>Formativo</strong> (durante) → <strong>Sumativo</strong> (cierre)</div><h4>3 preguntas para retroalimentar bien</h4><ul><li>¿Qué logró el estudiante?</li><li>¿Qué le falta por mejorar y por qué?</li><li>¿Qué hará la próxima vez para avanzar?</li></ul><div class="info-box"><strong>Norma clave:</strong> Decreto 1290 de 2009 señala que la evaluación institucional es permanente y formativa; debe reorientar procesos, no solo calificar. [VERIFICAR arts. 3 y 4]</div>',
         2, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L5. Evaluación formativa y retroalimentación'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L5. Evaluación formativa y retroalimentación'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Carlos quiere usar la evaluación formativa para mejorar los aprendizajes, no solo para calificar. ¿Qué acción es más coherente con este enfoque?',
         'Correcto. La retroalimentación debe ser formativa: identificar fortalezas, dificultades y pasos concretos de mejora.',
         'A, C y D convierten la evaluación en castigo o trámite administrativo, sin función pedagógica de apoyo.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Carlos quiere usar la evaluación formativa%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Carlos quiere usar la evaluación formativa%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Entregar una rúbrica con fortalezas, dificultades específicas y una actividad de mejora concreta antes de la próxima valoración.', TRUE, 1,
         'Retroalimentación formativa con pasos concretos de mejora.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Entregar una rúbrica con fortalezas%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Anunciar la nota final sin explicar los errores, para que el estudiante asuma responsabilidad.', FALSE, 2,
         'No brinda información útil para mejorar.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Anunciar la nota final%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Suspender la materia al grupo entero hasta que todos aprueben una prueba de recuperación.', FALSE, 3,
         'Castigo colectivo sin función pedagógica de apoyo.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Suspender la materia al grupo entero%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Ignorar los resultados bajos y continuar con el siguiente tema según el cronograma.', FALSE, 4,
         'Omite el carácter formativo y de seguimiento de la evaluación.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Ignorar los resultados bajos%');

  -- ---------- L6: Gestión del aula y convivencia ----------
  INSERT INTO lessons (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)
  SELECT v_modulo_id,
         'L6. Gestión del aula y convivencia desde la didáctica',
         'Caso, mapa conceptual y pregunta situacional sobre convivencia escolar.',
         '<p><strong>Caso:</strong> En el recreo, dos estudiantes de quinto tienen un conflicto físico. La docente debe decidir si aplica solo la sanción del manual o diseña una estrategia pedagógica de reparación.</p><h4>🗺️ Mapa conceptual: convivencia en el aula</h4><div class="info-box"><strong>Reglas claras</strong> → <strong>Rutinas positivas</strong> → <strong>Relaciones de confianza</strong> → <strong>Reparación del daño</strong></div><h4>Lo que NO es una estrategia didáctica de convivencia</h4><ul><li>Castigar públicamente para dar ejemplo.</li><li>Ignorar el conflicto para que "se les pase".</li><li>Sancionar sin escuchar las versiones de los involucrados.</li></ul><div class="info-box"><strong>Norma clave:</strong> Ley 1620 de 2013 establece la Ruta de Atención Integral con componentes de promoción, prevención, atención y seguimiento. [VERIFICAR arts. 29 y 30]</div>',
         3, TRUE, TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons l WHERE l.modulo_id = v_modulo_id
      AND l.titulo = 'L6. Gestión del aula y convivencia desde la didáctica'
  );

  SELECT l.id INTO v_leccion_id
  FROM lessons l WHERE l.modulo_id = v_modulo_id
    AND l.titulo = 'L6. Gestión del aula y convivencia desde la didáctica'
  LIMIT 1;

  INSERT INTO quizzes (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)
  SELECT v_leccion_id, v_modulo_id,
         'Ante un conflicto físico entre estudiantes en el recreo, ¿cuál actuación es más pertinente desde una gestión didáctica del aula?',
         'Correcto. Escuchar, activar ruta institucional, reparar y hacer seguimiento protege derechos y cumple con debido proceso.',
         'A es castigo sin proceso, C omite el deber de cuidado, y D vulnera la confidencialidad y el debido proceso.',
         'publicado'
  WHERE NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.leccion_id = v_leccion_id
      AND q.pregunta LIKE 'Ante un conflicto físico entre estudiantes en el recreo%'
  );

  SELECT id INTO v_quiz_id
  FROM quizzes q WHERE q.leccion_id = v_leccion_id
    AND q.pregunta LIKE 'Ante un conflicto físico entre estudiantes en el recreo%'
  LIMIT 1;

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Escuchar las versiones, activar la ruta de convivencia del manual, definir medidas de reparación y hacer seguimiento con las familias.', TRUE, 1,
         'Actuación con debido proceso, protección y seguimiento.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Escuchar las versiones%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Aplicar la sanción máxima del manual inmediatamente para cerrar el caso rápido.', FALSE, 2,
         'Castigo sin proceso ni escucha de las partes.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Aplicar la sanción máxima%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Ignorar el hecho porque ocurrió en el recreo y no es competencia del docente de aula.', FALSE, 3,
         'Omite el deber de cuidado y atención institucional.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Ignorar el hecho porque ocurrió%');

  INSERT INTO quiz_options (quiz_id, opcion, es_correcta, orden, explicacion_distractor)
  SELECT v_quiz_id, 'Publicar los nombres de los involucrados en el grupo de padres para transparencia.', FALSE, 4,
         'Vulnera confidencialidad y debido proceso.'
  WHERE NOT EXISTS (SELECT 1 FROM quiz_options qo WHERE qo.quiz_id = v_quiz_id AND qo.opcion LIKE 'Publicar los nombres%');

  -- Verificación
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
    WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
      AND l.titulo LIKE 'L%. %';

    SELECT COUNT(*) INTO v_total_quizzes
    FROM quizzes q
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
      AND l.titulo LIKE 'L%. %'
      AND q.estado_revision = 'publicado';

    SELECT COUNT(*) INTO v_total_opciones
    FROM quiz_options qo
    JOIN quizzes q ON q.id = qo.quiz_id
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
      AND l.titulo LIKE 'L%. %';

    SELECT COUNT(*) INTO v_quizzes_sin_una_correcta
    FROM quizzes q
    JOIN lessons l ON l.id = q.leccion_id
    JOIN modules m ON m.id = l.modulo_id
    JOIN courses c ON c.id = m.curso_id
    WHERE c.titulo = 'Fundamentos de Pedagogía y Didáctica'
      AND l.titulo LIKE 'L%. %'
      AND (SELECT COUNT(*) FROM quiz_options qo WHERE qo.quiz_id = q.id AND qo.es_correcta) <> 1;

    RAISE NOTICE 'PILOTO PEDAGOGÍA: lecciones=% quizzes_publicados=% opciones=% quizzes_sin_una_correcta=%',
      v_total_lecciones, v_total_quizzes, v_total_opciones, v_quizzes_sin_una_correcta;

    IF v_quizzes_sin_una_correcta > 0 THEN
      RAISE EXCEPTION 'Hay quizzes sin exactamente una respuesta correcta.';
    END IF;
  END;
END $$;

COMMIT;
