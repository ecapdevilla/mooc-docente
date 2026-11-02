-- =====================================================================
-- VERIFICACIÓN DEL CATÁLOGO (SOLO LECTURA)
-- =====================================================================
-- Generado por scripts/generar-carga-catalogo.js (lote 20261101-catalogo-tres-cursos).
-- Fuente de contenido: public/js/datos/modulos.js (const MODULES).
-- Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>
--
-- No escribe datos. Falla con excepción si el catálogo no coincide con lo
-- esperado para el lote 20261101-catalogo-tres-cursos: 3 cursos, 9 módulos, 11 lecciones,
-- 11 cuestionarios, 44 opciones, una sola respuesta correcta por
-- cuestionario y contenido no vacío en todas las lecciones.


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
