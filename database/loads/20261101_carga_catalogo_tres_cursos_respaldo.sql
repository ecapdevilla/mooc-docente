-- =====================================================================
-- RESPALDO PREVIO DEL CATÁLOGO (SOLO LECTURA)
-- =====================================================================
-- Generado por scripts/generar-carga-catalogo.js (lote 20261101-catalogo-tres-cursos).
-- Fuente de contenido: public/js/datos/modulos.js (const MODULES).
-- Ejecutar con: psql "$DATABASE_URL" -f <este archivo> > respaldo.json
--
-- Exporta en JSON el estado actual de los cursos del lote y de todas sus
-- dependencias. Sirve como evidencia antes/después y como insumo para una
-- restauración manual si algo saliera mal.


SELECT jsonb_pretty(jsonb_build_object(
  'generado_en', now(),
  'cursos', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) FROM courses c WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')),
  'modulos', (SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.id), '[]'::jsonb) FROM modules m JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')),
  'lecciones', (SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.id), '[]'::jsonb) FROM lessons l JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')),
  'cuestionarios', (SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.id), '[]'::jsonb) FROM quizzes q JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')),
  'opciones', (SELECT COALESCE(jsonb_agg(to_jsonb(qo) ORDER BY qo.id), '[]'::jsonb) FROM quiz_options qo JOIN quizzes q ON q.id = qo.quiz_id JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes')),
  'badges', (SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.id), '[]'::jsonb) FROM badges b JOIN modules m ON m.id = b.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN ('Fundamentos de Pedagogía y Didáctica', 'Legislación Educativa Colombiana', 'Inteligencia Artificial para Docentes'))
));
