#!/usr/bin/env node
/**
 * Genera los scripts SQL de carga controlada del catálogo de tres cursos.
 *
 * Fuente de contenido: `public/js/datos/modulos.js` (const MODULES), que es el
 * archivo de datos que carga `indexInicial.html` y la fuente principal de
 * contenido del producto. La estructura de módulos coincide con
 * `src/seed/data.sql`; el generador falla si una lección de la SPA no está
 * mapeada o si un título se repite (evita coincidencias ambiguas en
 * `loadCourseMap`).
 *
 * Salidas (database/loads/):
 *   - 20261101_carga_catalogo_tres_cursos.sql
 *   - 20261101_carga_catalogo_tres_cursos_verificacion.sql
 *   - 20261101_carga_catalogo_tres_cursos_respaldo.sql
 *   - 20261101_carga_catalogo_tres_cursos_reversion.sql
 *
 * Uso:
 *   node scripts/generar-carga-catalogo.js            # escribe los archivos
 *   node scripts/generar-carga-catalogo.js --resumen  # solo imprime el resumen
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
const RUTA_DATOS = path.join(RAIZ, 'public', 'js', 'datos', 'modulos.js');
const DIR_SALIDA = path.join(RAIZ, 'database', 'loads');
const PREFIJO = '20261101_carga_catalogo_tres_cursos';
const CODIGO_LOTE = '20261101-catalogo-tres-cursos';

/**
 * Catálogo verificable. Cada curso incluye únicamente módulos y lecciones
 * cuyo contenido existe en la SPA y en el seed.
 *
 * `Legislación Educativa Colombiana` declara un segundo módulo en el seed
 * ("Constitución y Legislación") con la lección "Constitución Política de
 * Colombia", pero esa lección NO tiene contenido desarrollado en la SPA:
 * se excluye de la carga para no inventar contenido académico.
 */
const CATALOGO = [
  {
    titulo: 'Fundamentos de Pedagogía y Didáctica',
    area: 'Pedagogía y Didáctica',
    nivel: 'Básico',
    icono: 'fas fa-chalkboard-teacher',
    descripcion:
      'Domina los conceptos esenciales de la pedagogía moderna y las estrategias didácticas para el aula. Repasa las principales corrientes pedagógicas y su aplicación práctica.',
    modulos: [
      {
        titulo: 'Fundamentos de Pedagogía',
        orden: 1,
        descripcion: 'Conceptos esenciales de pedagogía y didáctica',
        badge: { nombre: 'Pedagogo Inicial', icono: 'fas fa-chalkboard-teacher', color: 'gold' },
      },
      {
        titulo: 'Corrientes Pedagógicas',
        orden: 2,
        descripcion: 'Corrientes pedagógicas contemporáneas y sus autores',
        badge: { nombre: 'Pensador', icono: 'fas fa-brain', color: 'green' },
      },
    ],
    lecciones: [
      {
        titulo: '¿Qué es la Pedagogía?',
        modulo: 'Fundamentos de Pedagogía',
        orden: 1,
        descripcion: 'Conceptos básicos de pedagogía',
      },
      {
        titulo: 'Estrategias didácticas para el aula',
        modulo: 'Fundamentos de Pedagogía',
        orden: 2,
        descripcion:
          'Estrategias didácticas contextualizadas, como el aprendizaje basado en proyectos, el aula invertida, la gamificación y el debate dirigido.',
      },
      {
        titulo: 'Corrientes pedagógicas contemporáneas',
        modulo: 'Corrientes Pedagógicas',
        orden: 1,
        descripcion: 'Estudio de las principales corrientes pedagógicas',
      },
    ],
  },
  {
    titulo: 'Legislación Educativa Colombiana',
    area: 'Legislación Educativa',
    nivel: 'Básico',
    icono: 'fas fa-gavel',
    descripcion:
      'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios y las normas clave para el concurso docente.',
    modulos: [
      {
        titulo: 'Marco Normativo Colombiano',
        orden: 1,
        descripcion: 'Leyes y decretos que rigen la educación en Colombia',
        badge: { nombre: 'Conocedor Normativo', icono: 'fas fa-gavel', color: 'blue' },
      },
    ],
    lecciones: [
      {
        titulo: 'Ley General de Educación (Ley 115 de 1994)',
        modulo: 'Marco Normativo Colombiano',
        orden: 1,
        descripcion: 'Marco normativo principal del sistema educativo colombiano',
      },
      {
        titulo: 'Decreto 1278 de 2002: Estatuto Docente',
        modulo: 'Marco Normativo Colombiano',
        orden: 2,
        descripcion:
          'El Decreto 1278 de 2002 regula el Estatuto de Profesionalización Docente, el ingreso por concurso de méritos, la carrera docente y la evaluación de desempeño.',
      },
    ],
  },
  {
    titulo: 'Inteligencia Artificial para Docentes',
    area: 'Tecnología Educativa',
    nivel: 'Intermedio',
    icono: 'fas fa-robot',
    descripcion:
      'Domina el uso pedagógico de la IA en el aula: planificación, evaluación, personalización y ética. Herramientas prácticas para transformar tu práctica docente con tecnología responsable.',
    modulos: [
      {
        titulo: 'Fundamentos de IA en Educación',
        orden: 1,
        descripcion: 'Conceptos y fundamentos de IA aplicados a la educación.',
        badge: { nombre: 'Explorador IA', icono: 'fas fa-robot', color: 'blue' },
      },
      {
        titulo: 'Planificación con IA',
        orden: 2,
        descripcion: 'Diseño de experiencias de aprendizaje con IA generativa.',
        badge: { nombre: 'Planificador IA', icono: 'fas fa-calendar-alt', color: 'green' },
      },
      {
        titulo: 'Evaluación y Retroalimentación con IA',
        orden: 3,
        descripcion: 'Uso responsable de IA para evaluación formativa.',
        badge: { nombre: 'Evaluador IA', icono: 'fas fa-chart-line', color: 'orange' },
      },
      {
        titulo: 'Ética, Privacidad y Ciudadanía Digital con IA',
        orden: 4,
        descripcion: 'Privacidad, sesgos y ciudadanía digital.',
        badge: { nombre: 'Guardián Ético', icono: 'fas fa-shield-alt', color: 'red' },
      },
      {
        titulo: 'Liderazgo Pedagógico y Escalabilidad con IA',
        orden: 5,
        descripcion: 'Liderazgo docente e integración institucional.',
        badge: { nombre: 'Líder IA', icono: 'fas fa-users-cog', color: 'purple' },
      },
      {
        titulo: 'Proyecto Integrador: IA Ética en Mi Práctica Docente',
        orden: 6,
        descripcion: 'Diseño de una intervención docente ética con IA.',
        badge: { nombre: 'Practicante IA', icono: 'fas fa-project-diagram', color: 'teal' },
      },
    ],
    lecciones: [
      {
        titulo: '1.1 Historia y fundamentos de la IA',
        modulo: 'Fundamentos de IA en Educación',
        orden: 1,
        descripcion: 'Historia y conceptos esenciales de inteligencia artificial.',
      },
      {
        titulo: '2.1 Prompts efectivos para planificar clases',
        modulo: 'Planificación con IA',
        orden: 1,
        descripcion: 'Estructura de instrucciones efectivas para planificar.',
      },
      {
        titulo: '3.1 Evaluación y retroalimentación con IA',
        modulo: 'Evaluación y Retroalimentación con IA',
        orden: 1,
        descripcion: 'Apoyo de IA para evaluación formativa y retroalimentación.',
      },
      {
        titulo: '4.1 Ética, privacidad y uso responsable de la IA',
        modulo: 'Ética, Privacidad y Ciudadanía Digital con IA',
        orden: 1,
        descripcion: 'Protección de datos, equidad y transparencia.',
      },
      {
        titulo: '5.1 Liderazgo pedagógico con IA',
        modulo: 'Liderazgo Pedagógico y Escalabilidad con IA',
        orden: 1,
        descripcion: 'Liderazgo docente e integración institucional responsable.',
      },
      {
        titulo: '6.1 Proyecto integrador: IA ética en mi práctica',
        modulo: 'Proyecto Integrador: IA Ética en Mi Práctica Docente',
        orden: 1,
        descripcion: 'Diseño y evaluación de una intervención docente con IA.',
      },
    ],
  },
];

/**
 * Extrae el arreglo `MODULES` del archivo de datos del SPA delimitando el
 * literal con un escáner de corchetes que respeta cadenas. Se evalúa en un
 * contexto vacío (sin acceso a `window`), así que la SPA no se ejecuta.
 */
function extraerModulosSpa() {
  const html = fs.readFileSync(RUTA_DATOS, 'utf8');
  const marca = 'const MODULES =';
  const posicion = html.indexOf(marca);

  if (posicion < 0) {
    throw new Error('No se encontró `const MODULES` en public/js/datos/modulos.js');
  }

  const desde = html.indexOf('[', posicion);
  let nivel = 0;
  let fin = -1;
  let comilla = null;
  let escape = false;

  for (let i = desde; i < html.length; i += 1) {
    const caracter = html[i];

    if (comilla) {
      if (escape) escape = false;
      else if (caracter === '\\') escape = true;
      else if (caracter === comilla) comilla = null;
      continue;
    }

    if (caracter === "'" || caracter === '"' || caracter === '`') {
      comilla = caracter;
      continue;
    }

    if (caracter === '[') nivel += 1;
    else if (caracter === ']') {
      nivel -= 1;
      if (nivel === 0) {
        fin = i + 1;
        break;
      }
    }
  }

  if (fin < 0) throw new Error('No se pudo delimitar el arreglo MODULES');

  const literal = html.slice(desde, fin);
  const modulos = vm.runInNewContext(`(${literal})`, {}, { timeout: 5000 });

  if (!Array.isArray(modulos) || modulos.length === 0) {
    throw new Error('MODULES está vacío o no es un arreglo');
  }

  return modulos;
}

/**
 * Comprueba que el catálogo descriptivo coincida exactamente con la SPA:
 * mismo conjunto de cursos, todas las lecciones mapeadas una sola vez, quiz
 * con al menos dos opciones y un índice correcto válido. Cualquier
 * desviación aborta la generación.
 */
function validarCatalogo(modulosSpa, catalogo) {
  const errores = [];
  const titulosCursos = new Set();
  const titulosLecciones = [];

  for (const curso of catalogo) {
    if (titulosCursos.has(curso.titulo)) {
      errores.push(`Curso duplicado en el catálogo: ${curso.titulo}`);
    }
    titulosCursos.add(curso.titulo);

    const enSpa = modulosSpa.find(modulo => modulo.title === curso.titulo);

    if (!enSpa) {
      errores.push(`El curso "${curso.titulo}" no existe en public/js/datos/modulos.js`);
      continue;
    }

    const titulosModulos = curso.modulos.map(modulo => modulo.titulo);
    const mapaModulos = new Set(titulosModulos);

    if (mapaModulos.size !== titulosModulos.length) {
      errores.push(`Módulos repetidos dentro del curso "${curso.titulo}"`);
    }

    for (const modulo of curso.modulos) {
      if (!Number.isInteger(modulo.orden) || modulo.orden <= 0) {
        errores.push(`Orden inválido en el módulo "${modulo.titulo}"`);
      }
    }

    const leccionesSpa = Array.isArray(enSpa.lessons) ? enSpa.lessons : [];

    if (leccionesSpa.length === 0) {
      errores.push(`El curso "${curso.titulo}" no tiene lecciones en la SPA`);
    }

    const mapeadas = new Set();

    for (const leccion of curso.lecciones) {
      titulosLecciones.push(leccion.titulo);

      if (!mapaModulos.has(leccion.modulo)) {
        errores.push(
          `La lección "${leccion.titulo}" apunta al módulo inexistente "${leccion.modulo}"`
        );
      }

      if (!Number.isInteger(leccion.orden) || leccion.orden <= 0) {
        errores.push(`Orden inválido en la lección "${leccion.titulo}"`);
      }

      const coincidencias = leccionesSpa.filter(item => item.title === leccion.titulo);

      if (coincidencias.length === 0) {
        errores.push(`La lección "${leccion.titulo}" no existe en la SPA (${curso.titulo})`);
        continue;
      }

      if (coincidencias.length > 1) {
        errores.push(`La lección "${leccion.titulo}" está repetida en la SPA (${curso.titulo})`);
      }

      mapeadas.add(leccion.titulo);

      const quiz = coincidencias[0].quiz;

      if (!quiz) {
        errores.push(`La lección "${leccion.titulo}" no tiene quiz en la SPA`);
        continue;
      }

      if (!Array.isArray(quiz.options) || quiz.options.length < 2) {
        errores.push(`El quiz de "${leccion.titulo}" necesita al menos dos opciones`);
        continue;
      }

      if (new Set(quiz.options).size !== quiz.options.length) {
        errores.push(`El quiz de "${leccion.titulo}" tiene opciones repetidas`);
      }

      if (
        !Number.isInteger(quiz.correct) ||
        quiz.correct < 0 ||
        quiz.correct >= quiz.options.length
      ) {
        errores.push(`El quiz de "${leccion.titulo}" tiene un índice correcto inválido`);
      }

      if (!quiz.question || !String(quiz.question).trim()) {
        errores.push(`El quiz de "${leccion.titulo}" no tiene enunciado`);
      }
    }

    for (const leccionSpa of leccionesSpa) {
      if (!mapeadas.has(leccionSpa.title)) {
        errores.push(
          `La lección de la SPA "${leccionSpa.title}" no está mapeada en el catálogo (${curso.titulo})`
        );
      }
    }
  }

  const repetidas = titulosLecciones.filter(
    (titulo, indice) => titulosLecciones.indexOf(titulo) !== indice
  );

  if (repetidas.length > 0) {
    errores.push(`Lecciones repetidas en el catálogo: ${[...new Set(repetidas)].join(', ')}`);
  }

  if (errores.length > 0) {
    throw new Error(
      `Catálogo inconsistente con public/js/datos/modulos.js:\n - ${errores.join('\n - ')}`
    );
  }
}

/** Misma normalización que `normalizeLessonTitle` de la SPA. */
function normalizarTitulo(titulo) {
  return String(titulo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valida que ningún título colisione después de normalizar (emparejamiento único). */
function validarTitulosNormalizados(catalogo) {
  const errores = [];

  const cursos = catalogo.map(curso => normalizarTitulo(curso.titulo));

  for (const curso of catalogo) {
    const normalizados = curso.lecciones.map(leccion => normalizarTitulo(leccion.titulo));
    const vistos = new Map();

    for (let i = 0; i < normalizados.length; i += 1) {
      const clave = normalizados[i];

      if (vistos.has(clave)) {
        errores.push(
          `Títulos que colisionan al normalizar en "${curso.titulo}": ` +
            `"${curso.lecciones[vistos.get(clave)].titulo}" y "${curso.lecciones[i].titulo}"`
        );
      } else {
        vistos.set(clave, i);
      }
    }
  }

  const repetidos = cursos.filter((clave, indice) => cursos.indexOf(clave) !== indice);

  if (repetidos.length > 0) {
    errores.push(`Cursos que colisionan al normalizar: ${[...new Set(repetidos)].join(', ')}`);
  }

  if (errores.length > 0) {
    throw new Error(`El emparejamiento por título no sería único:\n - ${errores.join('\n - ')}`);
  }
}

function sqlTexto(valor) {
  return `'${String(valor).replace(/'/g, "''")}'`;
}

function sqlTextoNulo(valor) {
  if (valor === null || valor === undefined) return 'NULL';

  const texto = String(valor).trim();

  return texto === '' ? 'NULL' : sqlTexto(texto);
}

function listaSql(valores) {
  return valores.map(sqlTexto).join(', ');
}

/** Contenido HTML de la lección en la SPA (columna `lessons.contenido`). */
function contenidoSpa(leccionSpa) {
  const candidato = leccionSpa && leccionSpa.content;

  if (typeof candidato === 'string' && candidato.trim() !== '') {
    return candidato.trim();
  }

  return null;
}

function buscarLeccionSpa(modulosSpa, cursoTitulo, leccionTitulo) {
  const curso = modulosSpa.find(modulo => modulo.title === cursoTitulo);

  if (!curso) return null;

  return (curso.lessons || []).find(leccion => leccion.title === leccionTitulo) || null;
}

function titulosCursos(catalogo) {
  return catalogo.map(curso => curso.titulo);
}

function titulosModulos(catalogo) {
  return catalogo.flatMap(curso => curso.modulos.map(modulo => modulo.titulo));
}

function titulosLecciones(catalogo) {
  return catalogo.flatMap(curso => curso.lecciones.map(leccion => leccion.titulo));
}

/**
 * Bloque 0: comprobaciones de solo lectura. Si el catálogo actual ya tiene
 * títulos ambiguos, la carga aborta antes de escribir nada (el SPA exige
 * correspondencia única por título normalizado).
 */
function bloquePreflight(catalogo) {
  const cursos = listaSql(titulosCursos(catalogo));
  const lecciones = listaSql(titulosLecciones(catalogo));

  return [
    '-- 0. Preflight (solo lectura): aborta si hay títulos ambiguos.',
    'DO $preflight$',
    'DECLARE',
    '  v_conflicto text;',
    'BEGIN',
    '  SELECT string_agg(clave, \' | \') INTO v_conflicto FROM (',
    '    SELECT titulo AS clave',
    '    FROM courses',
    `    WHERE titulo IN (${cursos})`,
    '    GROUP BY titulo',
    '    HAVING COUNT(*) > 1',
    '  ) duplicados;',
    '',
    '  IF v_conflicto IS NOT NULL THEN',
    "    RAISE EXCEPTION 'Carga abortada: cursos duplicados por título: %', v_conflicto;",
    '  END IF;',
    '',
    '  SELECT string_agg(clave, \' | \') INTO v_conflicto FROM (',
    "    SELECT c.titulo || ' / ' || m.titulo AS clave",
    '    FROM modules m',
    '    JOIN courses c ON c.id = m.curso_id',
    `    WHERE c.titulo IN (${cursos})`,
    '    GROUP BY c.titulo, m.titulo',
    '    HAVING COUNT(*) > 1',
    '  ) duplicados;',
    '',
    '  IF v_conflicto IS NOT NULL THEN',
    "    RAISE EXCEPTION 'Carga abortada: módulos duplicados (curso / módulo): %', v_conflicto;",
    '  END IF;',
    '',
    '  SELECT string_agg(clave, \' | \') INTO v_conflicto FROM (',
    "    SELECT c.titulo || ' / ' || l.titulo AS clave",
    '    FROM lessons l',
    '    JOIN modules m ON m.id = l.modulo_id',
    '    JOIN courses c ON c.id = m.curso_id',
    `    WHERE c.titulo IN (${cursos})`,
    `      AND l.titulo IN (${lecciones})`,
    '    GROUP BY c.titulo, l.titulo',
    '    HAVING COUNT(*) > 1',
    '  ) duplicados;',
    '',
    '  IF v_conflicto IS NOT NULL THEN',
    "    RAISE EXCEPTION 'Carga abortada: lecciones duplicadas (curso / lección): %', v_conflicto;",
    '  END IF;',
    '',
    '  SELECT string_agg(clave, \' | \') INTO v_conflicto FROM (',
    "    SELECT c.titulo || ' / ' || l.titulo AS clave",
    '    FROM quizzes q',
    '    JOIN lessons l ON l.id = q.leccion_id',
    '    JOIN modules m ON m.id = l.modulo_id',
    '    JOIN courses c ON c.id = m.curso_id',
    `    WHERE c.titulo IN (${cursos})`,
    `      AND l.titulo IN (${lecciones})`,
    '    GROUP BY c.titulo, l.titulo',
    '    HAVING COUNT(*) > 1',
    '  ) duplicados;',
    '',
    '  IF v_conflicto IS NOT NULL THEN',
    "    RAISE EXCEPTION 'Carga abortada: más de un cuestionario en una lección: %', v_conflicto;",
    '  END IF;',
    '',
    "  RAISE NOTICE 'Preflight OK: el catálogo actual no tiene títulos ambiguos.';",
    'END; $preflight$;',
    '',
  ];
}

function bloqueManifiesto(catalogo) {
  const cursos = catalogo.map(curso => curso.titulo).join(', ');
  const modulos = catalogo
    .flatMap(curso => curso.modulos.map(modulo => `${curso.titulo} › ${modulo.titulo}`))
    .join(', ');
  const lecciones = catalogo
    .flatMap(curso => curso.lecciones.map(leccion => `${curso.titulo} › ${leccion.titulo}`))
    .join(', ');
  const totales = {
    modules: titulosModulos(catalogo).length,
    lessons: titulosLecciones(catalogo).length,
    quizOptions: titulosLecciones(catalogo).length * 4,
  };

  return [
    '-- 1. Manifiesto de la carga: permite revertir con precisión y auditar',
    '--    qué filas creó este script (no las filas preexistentes).',
    'CREATE TABLE IF NOT EXISTS catalog_load_batches (',
    '  id SERIAL PRIMARY KEY,',
    '  codigo VARCHAR(80) UNIQUE NOT NULL,',
    '  descripcion TEXT,',
    '  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS catalog_load_items (',
    '  id SERIAL PRIMARY KEY,',
    '  batch_id INTEGER NOT NULL REFERENCES catalog_load_batches(id) ON DELETE CASCADE,',
    "  entidad VARCHAR(20) NOT NULL CHECK (entidad IN ('course','module','lesson','quiz','quiz_option','badge')),",
    '  entidad_id INTEGER NOT NULL,',
    '  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,',
    '  UNIQUE (batch_id, entidad, entidad_id)',
    ');',
    '',
    '-- Columna de auditoría de la reversión (idempotente para manifiestos previos).',
    'ALTER TABLE catalog_load_batches ADD COLUMN IF NOT EXISTS revertido_en TIMESTAMP;',
    '',
    'INSERT INTO catalog_load_batches (codigo, descripcion)',
    'VALUES (',
    `  ${sqlTexto(CODIGO_LOTE)},`,
    `  ${sqlTexto(
      `Carga controlada de ${catalogo.length} cursos, ${totales.modules} módulos, ` +
        `${totales.lessons} lecciones, ${totales.lessons} cuestionarios y ` +
        `${totales.quizOptions} opciones desde database/loads/${PREFIJO}.sql`
    )}`,
    ')',
    'ON CONFLICT (codigo) DO NOTHING;',
    '',
    '-- Alcance de la carga (referencia para auditoría):',
    `--   Cursos: ${cursos}`,
    `--   Módulos: ${modulos}`,
    `--   Lecciones: ${lecciones}`,
    '',
  ];
}

/**
 * Envuelve un `INSERT ... SELECT ... WHERE NOT EXISTS (...)` en una CTE y
 * registra en el manifiesto únicamente las filas creadas por esta ejecución.
 * Así la reversión nunca toca filas que ya existían antes del lote.
 */
function registrarCreadas(entidad, sentencia) {
  const lineas = [...sentencia];
  const ultima = lineas.reduce(
    (indice, linea, actual) => (linea.trim() === '' ? indice : actual),
    -1
  );

  if (ultima >= 0) {
    // El `;` que cierra la sentencia original rompería la CTE.
    lineas[ultima] = lineas[ultima].replace(/;\s*$/, '');
  }

  return [
    'WITH nueva AS (',
    ...lineas.map(linea => (linea === '' ? '' : `  ${linea}`)),
    '  RETURNING id',
    ')',
    'INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)',
    `SELECT b.id, ${sqlTexto(entidad)}, nueva.id`,
    'FROM nueva',
    'CROSS JOIN catalog_load_batches b',
    `WHERE b.codigo = ${sqlTexto(CODIGO_LOTE)}`,
    'ON CONFLICT DO NOTHING;',
    '',
  ];
}

/** Curso completo: curso, módulos, lecciones, cuestionarios, opciones y badges. */
function bloqueCurso(curso, modulosSpa) {
  const lineas = [
    '-- =====================================================================',
    `-- Curso: ${curso.titulo}`,
    '-- =====================================================================',
    ...registrarCreadas('course', [
      'INSERT INTO courses (titulo, area, nivel, descripcion, icono, activo)',
      'SELECT',
      `  ${sqlTexto(curso.titulo)},`,
      `  ${sqlTexto(curso.area)},`,
      `  ${sqlTexto(curso.nivel)},`,
      `  ${sqlTexto(curso.descripcion)},`,
      `  ${sqlTexto(curso.icono)},`,
      '  TRUE',
      'WHERE NOT EXISTS (',
      `  SELECT 1 FROM courses WHERE titulo = ${sqlTexto(curso.titulo)}`,
      ');',
    ]),
  ];

  for (const modulo of curso.modulos) {
    lineas.push(
      `-- Módulo ${modulo.orden}: ${modulo.titulo}`,
      ...registrarCreadas('module', [
        'INSERT INTO modules',
        '  (curso_id, titulo, descripcion, orden, badge_nombre, badge_icono, badge_color, activo)',
        'SELECT',
        '  c.id,',
        `  ${sqlTexto(modulo.titulo)},`,
        `  ${sqlTexto(modulo.descripcion)},`,
        `  ${modulo.orden},`,
        `  ${sqlTextoNulo(modulo.badge && modulo.badge.nombre)},`,
        `  ${sqlTextoNulo(modulo.badge && modulo.badge.icono)},`,
        `  ${sqlTextoNulo(modulo.badge && modulo.badge.color)},`,
        '  TRUE',
        'FROM courses c',
        `WHERE c.titulo = ${sqlTexto(curso.titulo)}`,
        '  AND NOT EXISTS (',
        '    SELECT 1 FROM modules m',
        `    WHERE m.curso_id = c.id AND m.titulo = ${sqlTexto(modulo.titulo)}`,
        '  );',
      ])
    );

    if (modulo.badge && modulo.badge.nombre) {
      lineas.push(
        `-- Badge del módulo: ${modulo.badge.nombre}`,
        ...registrarCreadas('badge', [
          'INSERT INTO badges (modulo_id, nombre, descripcion, icono, color)',
          'SELECT',
          '  m.id,',
          `  ${sqlTexto(modulo.badge.nombre)},`,
          `  ${sqlTexto(`Badge obtenido al completar ${modulo.titulo}`)},`,
          `  ${sqlTextoNulo(modulo.badge.icono)},`,
          `  ${sqlTextoNulo(modulo.badge.color)}`,
          'FROM modules m',
          'JOIN courses c ON c.id = m.curso_id',
          `WHERE c.titulo = ${sqlTexto(curso.titulo)}`,
          `  AND m.titulo = ${sqlTexto(modulo.titulo)}`,
          '  AND NOT EXISTS (',
          '    SELECT 1 FROM badges b',
          `    WHERE b.modulo_id = m.id AND b.nombre = ${sqlTexto(modulo.badge.nombre)}`,
          '  );',
        ])
      );
    }
  }

  for (const leccion of curso.lecciones) {
    const leccionSpa = buscarLeccionSpa(modulosSpa, curso.titulo, leccion.titulo);
    const contenido = contenidoSpa(leccionSpa);
    const quiz = leccionSpa && leccionSpa.quiz;

    if (!contenido) {
      throw new Error(`La lección "${leccion.titulo}" no tiene contenido en la SPA`);
    }

    if (!quiz) {
      throw new Error(`La lección "${leccion.titulo}" no tiene cuestionario en la SPA`);
    }

    const contenidoSql = sqlTexto(contenido.replace(/\s+/g, ' '));
    const correcta = quiz.correct;
    const feedbackKo = quiz.feedbackKo || quiz.feedbackIncorrecto || null;

    lineas.push(
      `-- Lección ${leccion.orden} de ${leccion.modulo}: ${leccion.titulo}`,
      ...registrarCreadas('lesson', [
        'INSERT INTO lessons',
        '  (modulo_id, titulo, descripcion, contenido, orden, tiene_quiz, activo)',
        'SELECT',
        '  m.id,',
        `  ${sqlTexto(leccion.titulo)},`,
        `  ${sqlTexto(leccion.descripcion)},`,
        `  ${contenidoSql},`,
        `  ${leccion.orden}, TRUE, TRUE`,
        'FROM modules m',
        'JOIN courses c ON c.id = m.curso_id',
        `WHERE c.titulo = ${sqlTexto(curso.titulo)}`,
        `  AND m.titulo = ${sqlTexto(leccion.modulo)}`,
        '  AND NOT EXISTS (',
        '    SELECT 1 FROM lessons l',
        `    WHERE l.modulo_id = m.id AND l.titulo = ${sqlTexto(leccion.titulo)}`,
        '  );',
      ]),
      '-- Cuestionario de la lección (una sola respuesta correcta; se valida al final)',
      ...registrarCreadas('quiz', [
        'INSERT INTO quizzes',
        '  (leccion_id, modulo_id, pregunta, explicacion_correcta, explicacion_incorrecta, estado_revision)',
        'SELECT',
        '  l.id, l.modulo_id,',
        `  ${sqlTexto(quiz.question)},`,
        `  ${sqlTextoNulo(quiz.feedbackOk)},`,
        `  ${sqlTextoNulo(feedbackKo)},`,
        "  'publicado'",
        'FROM lessons l',
        'JOIN modules m ON m.id = l.modulo_id',
        'JOIN courses c ON c.id = m.curso_id',
        `WHERE c.titulo = ${sqlTexto(curso.titulo)}`,
        `  AND l.titulo = ${sqlTexto(leccion.titulo)}`,
        '  AND NOT EXISTS (',
        '    SELECT 1 FROM quizzes q WHERE q.leccion_id = l.id',
        '  );',
      ])
    );

    quiz.options.forEach((opcion, indice) => {
      lineas.push(
        'INSERT INTO quiz_options',
        '  (quiz_id, opcion, es_correcta, orden, explicacion_distractor)',
        'SELECT',
        '  q.id,',
        `  ${sqlTexto(opcion)},`,
        `  ${indice === correcta ? 'TRUE' : 'FALSE'},`,
        `  ${indice + 1},`,
        `  ${indice === correcta ? 'NULL' : sqlTextoNulo(feedbackKo)}`,
        'FROM quizzes q',
        'JOIN lessons l ON l.id = q.leccion_id',
        'JOIN modules m ON m.id = l.modulo_id',
        'JOIN courses c ON c.id = m.curso_id',
        `WHERE c.titulo = ${sqlTexto(curso.titulo)}`,
        `  AND l.titulo = ${sqlTexto(leccion.titulo)}`,
        `  AND q.pregunta = ${sqlTexto(quiz.question)}`,
        '  AND NOT EXISTS (',
        '    SELECT 1 FROM quiz_options qo',
        `    WHERE qo.quiz_id = q.id AND qo.orden = ${indice + 1}`,
        '  );',
        ''
      );
    });
  }

  return lineas;
}

/**
 * Registra en el manifiesto las opciones de los cuestionarios creados por el
 * lote. Las opciones no se registran una por una para no duplicar sentencias:
 * si el cuestionario es del lote, sus opciones también lo son.
 */
function bloqueRegistroOpciones() {
  return [
    '-- 8. Manifiesto: opciones de los cuestionarios creados por este lote.',
    'INSERT INTO catalog_load_items (batch_id, entidad, entidad_id)',
    "SELECT b.id, 'quiz_option', qo.id",
    'FROM catalog_load_batches b',
    "JOIN catalog_load_items i ON i.batch_id = b.id AND i.entidad = 'quiz'",
    'JOIN quiz_options qo ON qo.quiz_id = i.entidad_id',
    `WHERE b.codigo = ${sqlTexto(CODIGO_LOTE)}`,
    'ON CONFLICT DO NOTHING;',
    '',
  ];
}

/**
 * Verificación de integridad del catálogo. Es de solo lectura y tiene dos usos:
 * cierre del script principal (dentro de la misma transacción) y archivo
 * independiente para auditar producción sin escribir nada.
 */
function bloqueVerificacion(catalogo) {
  const cursos = listaSql(titulosCursos(catalogo));
  const lecciones = listaSql(titulosLecciones(catalogo));
  const esperado = {
    cursos: catalogo.length,
    modulos: titulosModulos(catalogo).length,
    lecciones: titulosLecciones(catalogo).length,
    cuestionarios: titulosLecciones(catalogo).length,
    opciones: titulosLecciones(catalogo).length * 4,
  };

  return [
    'DO $verifica$',
    'DECLARE',
    `  v_esperado_cursos int := ${esperado.cursos};`,
    `  v_esperado_modulos int := ${esperado.modulos};`,
    `  v_esperado_lecciones int := ${esperado.lecciones};`,
    `  v_esperado_cuestionarios int := ${esperado.cuestionarios};`,
    `  v_esperado_opciones int := ${esperado.opciones};`,
    '  v_cursos int;',
    '  v_modulos int;',
    '  v_lecciones int;',
    '  v_cuestionarios int;',
    '  v_opciones int;',
    '  v_invalidas int;',
    'BEGIN',
    `  SELECT COUNT(*) INTO v_cursos FROM courses WHERE titulo IN (${cursos});`,
    `  SELECT COUNT(*) INTO v_modulos FROM modules m JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos});`,
    `  SELECT COUNT(*) INTO v_lecciones FROM lessons l JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos}) AND l.titulo IN (${lecciones});`,
    `  SELECT COUNT(*) INTO v_cuestionarios FROM quizzes q JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos}) AND l.titulo IN (${lecciones});`,
    `  SELECT COUNT(*) INTO v_opciones FROM quiz_options qo JOIN quizzes q ON q.id = qo.quiz_id JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos}) AND l.titulo IN (${lecciones});`,
    '',
    '  IF v_cursos <> v_esperado_cursos THEN',
    "    RAISE EXCEPTION 'Verificación fallida: se esperaban % cursos y hay %', v_esperado_cursos, v_cursos;",
    '  END IF;',
    '',
    '  IF v_modulos <> v_esperado_modulos THEN',
    "    RAISE EXCEPTION 'Verificación fallida: se esperaban % módulos y hay %', v_esperado_modulos, v_modulos;",
    '  END IF;',
    '',
    '  IF v_lecciones <> v_esperado_lecciones THEN',
    "    RAISE EXCEPTION 'Verificación fallida: se esperaban % lecciones y hay %', v_esperado_lecciones, v_lecciones;",
    '  END IF;',
    '',
    '  IF v_cuestionarios <> v_esperado_cuestionarios THEN',
    "    RAISE EXCEPTION 'Verificación fallida: se esperaban % cuestionarios y hay %', v_esperado_cuestionarios, v_cuestionarios;",
    '  END IF;',
    '',
    '  IF v_opciones <> v_esperado_opciones THEN',
    "    RAISE EXCEPTION 'Verificación fallida: se esperaban % opciones y hay %', v_esperado_opciones, v_opciones;",
    '  END IF;',
    '',
    '  SELECT COUNT(*) INTO v_invalidas FROM (',
    '    SELECT',
    '      l.id,',
    '      COUNT(DISTINCT q.id) AS cuestionarios,',
    '      COUNT(DISTINCT qo.id) AS opciones,',
    '      COUNT(DISTINCT qo.id) FILTER (WHERE qo.es_correcta) AS correctas,',
    "      COUNT(DISTINCT qo.id) FILTER (WHERE COALESCE(btrim(qo.opcion), '') = '') AS opciones_vacias,",
    "      (COALESCE(btrim(l.contenido), '') = '') AS sin_contenido",
    '    FROM lessons l',
    '    JOIN modules m ON m.id = l.modulo_id',
    '    JOIN courses c ON c.id = m.curso_id',
    '    LEFT JOIN quizzes q ON q.leccion_id = l.id',
    '    LEFT JOIN quiz_options qo ON qo.quiz_id = q.id',
    `    WHERE c.titulo IN (${cursos})`,
    `      AND l.titulo IN (${lecciones})`,
    '    GROUP BY l.id, l.contenido',
    '  ) revision',
    '  WHERE revision.cuestionarios <> 1',
    '     OR revision.opciones <> 4',
    '     OR revision.correctas <> 1',
    '     OR revision.opciones_vacias <> 0',
    '     OR revision.sin_contenido;',
    '',
    '  IF v_invalidas <> 0 THEN',
    "    RAISE EXCEPTION 'Verificación fallida: % lecciones sin 1 cuestionario, 4 opciones, 1 correcta y contenido', v_invalidas;",
    '  END IF;',
    '',
    "  RAISE NOTICE 'Verificación OK: % cursos, % módulos, % lecciones, % cuestionarios y % opciones consistentes.',",
    '    v_cursos, v_modulos, v_lecciones, v_cuestionarios, v_opciones;',
    'END; $verifica$;',
    '',
    '-- Detalle por lección (evidencia para la revisión manual).',
    'SELECT',
    '  c.titulo AS curso,',
    '  m.titulo AS modulo,',
    '  l.orden AS orden_leccion,',
    '  l.titulo AS leccion,',
    '  COUNT(DISTINCT q.id) AS cuestionarios,',
    '  COUNT(DISTINCT qo.id) AS opciones,',
    '  COUNT(DISTINCT qo.id) FILTER (WHERE qo.es_correcta) AS correctas,',
    '  length(l.contenido) AS largo_contenido',
    'FROM courses c',
    'JOIN modules m ON m.curso_id = c.id',
    'JOIN lessons l ON l.modulo_id = m.id',
    'LEFT JOIN quizzes q ON q.leccion_id = l.id',
    'LEFT JOIN quiz_options qo ON qo.quiz_id = q.id',
    `WHERE c.titulo IN (${cursos})`,
    'GROUP BY c.titulo, m.orden, m.titulo, l.orden, l.titulo, l.contenido',
    'ORDER BY c.titulo, m.orden, l.orden;',
    '',
  ];
}

function cabecera(titulo, descripcionLineas) {
  return [
    '-- =====================================================================',
    `-- ${titulo}`,
    '-- =====================================================================',
    `-- Generado por scripts/generar-carga-catalogo.js (lote ${CODIGO_LOTE}).`,
    '-- Fuente de contenido: public/js/datos/modulos.js (const MODULES).',
    ...descripcionLineas.map(linea => (linea === '' ? '--' : `-- ${linea}`)),
    '',
    '',
  ];
}

function generarCarga(catalogo, modulosSpa) {
  return [
    ...cabecera('CARGA CONTROLADA DEL CATÁLOGO DE TRES CURSOS', [
      'Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>',
      '',
      'Características:',
      '  - Idempotente: cada INSERT usa WHERE NOT EXISTS, así que reejecutarlo',
      '    no duplica filas ni sobreescribe contenido existente.',
      '  - Atómico: todo ocurre dentro de una única transacción; ante cualquier',
      '    error, ON_ERROR_STOP aborta y no queda nada escrito.',
      '  - Auditable: registra en catalog_load_items solo las filas creadas por',
      '    este lote, de modo que la reversión no toca datos previos.',
      '  - Republicable: si el lote se revirtió con la reversión segura, volver a',
      '    ejecutar esta carga lo reactiva sin recrear filas ni tocar usuarios.',
      '  - Autoverificable: el paso final comprueba conteos, contenido, opciones',
      '    y exactamente una respuesta correcta por cuestionario.',
      '',
      'Antes de ejecutar en producción: correr el respaldo y revisar el',
      'preflight (paso 0). Si el preflight falla, el script no escribe nada.',
    ]),
    'BEGIN;',
    '',
    ...bloquePreflight(catalogo),
    ...bloqueManifiesto(catalogo),
    ...bloqueReactivacion(),
    ...catalogo.flatMap(curso => bloqueCurso(curso, modulosSpa)),
    ...bloqueRegistroOpciones(),
    ...bloqueVerificacion(catalogo),
    'COMMIT;',
    '',
  ].join('\n');
}

function generarVerificacion(catalogo) {
  return [
    ...cabecera('VERIFICACIÓN DEL CATÁLOGO (SOLO LECTURA)', [
      'Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>',
      '',
      'No escribe datos. Falla con excepción si el catálogo no coincide con lo',
      `esperado para el lote ${CODIGO_LOTE}: 3 cursos, 9 módulos, 11 lecciones,`,
      '11 cuestionarios, 44 opciones, una sola respuesta correcta por',
      'cuestionario y contenido no vacío en todas las lecciones.',
    ]),
    ...bloqueVerificacion(catalogo),
  ].join('\n');
}

function generarRespaldo(catalogo) {
  const cursos = listaSql(titulosCursos(catalogo));

  return [
    ...cabecera('RESPALDO PREVIO DEL CATÁLOGO (SOLO LECTURA)', [
      'Ejecutar con: psql "$DATABASE_URL" -f <este archivo> > respaldo.json',
      '',
      'Exporta en JSON el estado actual de los cursos del lote y de todas sus',
      'dependencias. Sirve como evidencia antes/después y como insumo para una',
      'restauración manual si algo saliera mal.',
    ]),
    'SELECT jsonb_pretty(jsonb_build_object(',
    "  'generado_en', now(),",
    `  'cursos', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) FROM courses c WHERE c.titulo IN (${cursos})),`,
    `  'modulos', (SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.id), '[]'::jsonb) FROM modules m JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos})),`,
    `  'lecciones', (SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.id), '[]'::jsonb) FROM lessons l JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos})),`,
    `  'cuestionarios', (SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.id), '[]'::jsonb) FROM quizzes q JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos})),`,
    `  'opciones', (SELECT COALESCE(jsonb_agg(to_jsonb(qo) ORDER BY qo.id), '[]'::jsonb) FROM quiz_options qo JOIN quizzes q ON q.id = qo.quiz_id JOIN lessons l ON l.id = q.leccion_id JOIN modules m ON m.id = l.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos})),`,
    `  'badges', (SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.id), '[]'::jsonb) FROM badges b JOIN modules m ON m.id = b.modulo_id JOIN courses c ON c.id = m.curso_id WHERE c.titulo IN (${cursos}))`,
    '));',
    '',
  ].join('\n');
}

/**
 * Dependencias de datos de usuarios sobre las entidades del lote.
 *
 * Todas estas tablas llegan al catálogo mediante claves foráneas con
 * ON DELETE CASCADE, así que un borrado físico del lote las eliminaría en
 * silencio. Se cuentan antes y después de la reversión segura para demostrar
 * que no cambian, y bloquean la reversión física.
 */
const DEPENDENCIAS_USUARIO = [
  { metrica: 'enrollments', desde: 'enrollments e', entidad: 'course', columna: 'e.curso_id' },
  { metrica: 'user_progress', desde: 'user_progress p', entidad: 'lesson', columna: 'p.leccion_id' },
  {
    metrica: 'quiz_attempt_answers',
    desde: 'quiz_attempt_answers a',
    entidad: 'quiz',
    columna: 'a.quiz_id',
  },
  { metrica: 'user_badges', desde: 'user_badges ub', entidad: 'badge', columna: 'ub.badge_id' },
  { metrica: 'projects', desde: 'projects pr', entidad: 'course', columna: 'pr.course_id' },
  {
    metrica: 'course_completion_rules',
    desde: 'course_completion_rules ccr',
    entidad: 'course',
    columna: 'ccr.course_id',
  },
];

/**
 * Genera una tabla temporal con el conteo de cada dependencia de usuarios
 * vinculada al lote. Incluye `lesson_quiz_responses` solo si la migración está
 * aplicada, de modo que los scripts funcionen antes y después de ella.
 */
function bloqueConteosUsuarios(nombreTabla) {
  const selecciones = DEPENDENCIAS_USUARIO.map(({ metrica, desde, entidad, columna }) =>
    [
      `SELECT ${sqlTexto(metrica)} AS metrica, COUNT(*)::bigint AS valor`,
      `FROM ${desde}`,
      `JOIN catalog_load_items i ON i.entidad = ${sqlTexto(entidad)} AND i.entidad_id = ${columna}`,
      'JOIN catalog_load_batches b ON b.id = i.batch_id',
      `WHERE b.codigo = ${sqlTexto(CODIGO_LOTE)}`,
    ].join('\n')
  );

  return [
    `CREATE TEMP TABLE ${nombreTabla} ON COMMIT DROP AS`,
    selecciones.join('\nUNION ALL\n'),
    ';',
    '',
    'DO $respuestas$',
    'BEGIN',
    "  IF to_regclass('public.lesson_quiz_responses') IS NOT NULL THEN",
    `    INSERT INTO ${nombreTabla} (metrica, valor)`,
    "    SELECT 'lesson_quiz_responses', COUNT(*)::bigint",
    '    FROM lesson_quiz_responses r',
    "    JOIN catalog_load_items i ON i.entidad = 'lesson' AND i.entidad_id = r.leccion_id",
    '    JOIN catalog_load_batches b ON b.id = i.batch_id',
    `    WHERE b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '  END IF;',
    'END;',
    '$respuestas$;',
    '',
  ];
}

/**
 * Compara dos fotos de conteos y aborta si alguna métrica cambió.
 */
function bloqueVerificacionUsuarios(nombreAntes, nombreDespues) {
  return [
    'DO $integridad$',
    'DECLARE',
    '  diferencias TEXT;',
    'BEGIN',
    "  SELECT string_agg(format('%s (antes %s, despues %s)', d.metrica, d.antes, d.despues), '; ')",
    '    INTO diferencias',
    '  FROM (',
    '    SELECT a.metrica, a.valor AS antes, COALESCE(dp.valor, -1) AS despues',
    `    FROM ${nombreAntes} a`,
    `    LEFT JOIN ${nombreDespues} dp ON dp.metrica = a.metrica`,
    '    WHERE a.valor <> COALESCE(dp.valor, -1)',
    '  ) d;',
    '',
    '  IF diferencias IS NOT NULL THEN',
    "    RAISE EXCEPTION 'La operación alteró datos de usuarios: %', diferencias;",
    '  END IF;',
    'END;',
    '$integridad$;',
    '',
  ];
}

/**
 * Bloque de reactivación incluido en la carga: si el lote se revirtió con la
 * reversión segura, volver a ejecutar la carga lo republica sin recrear filas
 * ni tocar datos de usuarios.
 */
function bloqueReactivacion() {
  const porEntidad = (entidad, tabla, alias) => [
    `UPDATE ${tabla} ${alias}`,
    'SET activo = TRUE',
    'FROM catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    `WHERE i.entidad = ${sqlTexto(entidad)}`,
    `  AND i.entidad_id = ${alias}.id`,
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)}`,
    `  AND ${alias}.activo = FALSE;`,
    '',
  ];

  return [
    '-- 1.b Reactivación idempotente del lote.',
    '--     Si el lote se revirtió con la reversión segura (activo = FALSE),',
    '--     volver a ejecutar esta carga lo republica sin recrear filas y sin',
    '--     tocar matrículas, progreso, intentos ni respuestas de usuarios.',
    ...porEntidad('course', 'courses', 'c'),
    ...porEntidad('module', 'modules', 'm'),
    ...porEntidad('lesson', 'lessons', 'l'),
    'UPDATE quizzes q',
    "SET estado_revision = 'publicado'",
    'FROM catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'quiz'",
    '  AND i.entidad_id = q.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)}`,
    "  AND q.estado_revision <> 'publicado';",
    '',
    'UPDATE catalog_load_batches',
    'SET revertido_en = NULL',
    `WHERE codigo = ${sqlTexto(CODIGO_LOTE)}`,
    '  AND revertido_en IS NOT NULL;',
    '',
  ];
}

/**
 * Reversión segura (por defecto): desactiva el lote sin borrar nada.
 */
function generarReversion(catalogo) {
  return [
    ...cabecera('REVERSIÓN SEGURA DEL LOTE (DESACTIVA SIN BORRAR DATOS DE USUARIOS)', [
      'Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>',
      '',
      'Este archivo NO elimina filas del catálogo ni de los usuarios: deja los',
      'cursos, módulos y lecciones del lote con activo = FALSE, archiva sus',
      'cuestionarios y marca el lote como revertido.',
      '',
      'Por qué no se borra: las claves foráneas de la plataforma usan',
      'ON DELETE CASCADE, así que borrar un curso eliminaría en cascada',
      'matrículas (enrollments), progreso (user_progress), badges obtenidos',
      '(user_badges), respuestas de intentos (quiz_attempt_answers), proyectos',
      'de usuarios (projects), reglas de finalización y respuestas de lección',
      '(lesson_quiz_responses). La reversión segura conserva todo el historial.',
      '',
      'Efecto posterior: la API deja de listar el lote porque filtra',
      'activo = TRUE, y los datos históricos quedan disponibles para auditoría.',
      'Para republicarlo, ejecutar de nuevo la carga: es idempotente y reactiva',
      'las filas del lote (paso 1.b).',
      '',
      'Al final se comparan los conteos de datos de usuarios antes y después;',
      'si alguna métrica cambia, la transacción aborta con excepción.',
    ]),
    'BEGIN;',
    '',
    '-- 0. Guardia: el manifiesto del lote debe existir en este entorno.',
    'DO $guardia$',
    'BEGIN',
    "  IF to_regclass('public.catalog_load_batches') IS NULL THEN",
    "    RAISE EXCEPTION 'Este entorno no tiene el manifiesto de carga; no hay lote que revertir.';",
    '  END IF;',
    '',
    '  IF NOT EXISTS (',
    '    SELECT 1 FROM catalog_load_batches',
    `    WHERE codigo = ${sqlTexto(CODIGO_LOTE)}`,
    '  ) THEN',
    `    RAISE EXCEPTION 'No existe el lote %; no hay nada que revertir.', ${sqlTexto(CODIGO_LOTE)};`,
    '  END IF;',
    'END;',
    '$guardia$;',
    '',
    'ALTER TABLE catalog_load_batches ADD COLUMN IF NOT EXISTS revertido_en TIMESTAMP;',
    '',
    '-- 1. Foto de los datos de usuarios vinculados al lote (antes).',
    ...bloqueConteosUsuarios('reversion_antes'),
    '-- 2. Desactivación del catálogo del lote (sin DELETE).',
    'UPDATE courses c',
    'SET activo = FALSE',
    'FROM catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'course'",
    '  AND i.entidad_id = c.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    'UPDATE modules m',
    'SET activo = FALSE',
    'FROM catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'module'",
    '  AND i.entidad_id = m.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    'UPDATE lessons l',
    'SET activo = FALSE',
    'FROM catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'lesson'",
    '  AND i.entidad_id = l.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    '-- 2.b Los cuestionarios del lote quedan archivados: la API no los sirve',
    '--     como actividad publicada mientras el lote esté revertido.',
    'UPDATE quizzes q',
    "SET estado_revision = 'archivado'",
    'FROM catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'quiz'",
    '  AND i.entidad_id = q.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    '-- 2.c Los badges ya obtenidos por usuarios se conservan (la tabla badges',
    '--     no tiene columna activo). Quedan asociados a módulos inactivos.',
    '',
    '-- 3. Marca del lote (auditoría de la reversión).',
    'UPDATE catalog_load_batches',
    'SET revertido_en = CURRENT_TIMESTAMP',
    `WHERE codigo = ${sqlTexto(CODIGO_LOTE)}`,
    '  AND revertido_en IS NULL;',
    '',
    '-- 4. Foto posterior y comparación estricta de datos de usuarios.',
    ...bloqueConteosUsuarios('reversion_despues'),
    ...bloqueVerificacionUsuarios('reversion_antes', 'reversion_despues'),
    'COMMIT;',
    '',
    '-- Comprobación posterior: el catálogo del lote queda inactivo.',
    'SELECT c.id, c.titulo, c.activo',
    'FROM courses c',
    `WHERE c.titulo IN (${listaSql(titulosCursos(catalogo))})`,
    'ORDER BY c.id;',
    '',
  ].join('\n');
}


/**
 * Reversión física (borrado literal). Solo para entornos sin actividad real.
 */
function generarReversionFisica(catalogo) {
  return [
    ...cabecera('REVERSIÓN FÍSICA DEL LOTE (BORRA FILAS; SOLO ENTORNOS SIN ACTIVIDAD)', [
      'Ejecutar con: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este archivo>',
      '',
      'Borra exclusivamente las filas creadas por el lote y registradas en',
      'catalog_load_items. No debe usarse en un entorno con usuarios reales:',
      'las claves foráneas ON DELETE CASCADE eliminarían matrículas, progreso,',
      'badges obtenidos, respuestas de intentos, proyectos y respuestas de',
      'lección.',
      '',
      'Guardias (la transacción aborta sin borrar nada si fallan):',
      '  1. el lote no existe;',
      '  2. la reversión segura no se ejecutó antes (quedan cursos activos);',
      '  3. existe cualquier dato de usuario vinculado al lote.',
      '',
      'En producción use únicamente la reversión segura.',
    ]),
    'BEGIN;',
    '',
    'DO $guardia$',
    'BEGIN',
    "  IF to_regclass('public.catalog_load_batches') IS NULL THEN",
    "    RAISE EXCEPTION 'Este entorno no tiene el manifiesto de carga; no hay lote que revertir.';",
    '  END IF;',
    '',
    '  IF NOT EXISTS (',
    '    SELECT 1 FROM catalog_load_batches',
    `    WHERE codigo = ${sqlTexto(CODIGO_LOTE)}`,
    '  ) THEN',
    `    RAISE EXCEPTION 'No existe el lote %; no hay nada que revertir.', ${sqlTexto(CODIGO_LOTE)};`,
    '  END IF;',
    'END;',
    '$guardia$;',
    '',
    '-- Guardia 2: la reversión segura debe haberse ejecutado antes.',
    'DO $segura$',
    'DECLARE',
    '  activos INTEGER;',
    'BEGIN',
    '  SELECT COUNT(*) INTO activos',
    '  FROM courses c',
    "  JOIN catalog_load_items i ON i.entidad = 'course' AND i.entidad_id = c.id",
    '  JOIN catalog_load_batches b ON b.id = i.batch_id',
    `  WHERE b.codigo = ${sqlTexto(CODIGO_LOTE)}`,
    '    AND c.activo = TRUE;',
    '',
    '  IF activos > 0 THEN',
    "    RAISE EXCEPTION 'Ejecuta primero la reversión segura: quedan % curso(s) del lote activos.', activos;",
    '  END IF;',
    'END;',
    '$segura$;',
    '',
    '-- Guardia 3: sin datos de usuarios vinculados al lote.',
    ...bloqueConteosUsuarios('reversion_dependencias'),
    'DO $dependencias$',
    'DECLARE',
    '  detalle TEXT;',
    'BEGIN',
    "  SELECT string_agg(format('%s=%s', metrica, valor), ', ')",
    '    INTO detalle',
    '  FROM reversion_dependencias',
    '  WHERE valor > 0;',
    '',
    '  IF detalle IS NOT NULL THEN',
    "    RAISE EXCEPTION 'Reversión física bloqueada: el lote tiene datos de usuarios (%). Usa la reversión segura y conserva el historial.', detalle;",
    '  END IF;',
    'END;',
    '$dependencias$;',
    '',
    '-- 1. Opciones (dependen de quizzes).',
    'DELETE FROM quiz_options qo',
    'USING catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'quiz_option'",
    '  AND i.entidad_id = qo.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    '-- 2. Cuestionarios y badges del lote.',
    'DELETE FROM quizzes q',
    'USING catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'quiz'",
    '  AND i.entidad_id = q.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    'DELETE FROM badges bg',
    'USING catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'badge'",
    '  AND i.entidad_id = bg.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    '-- 3. Lecciones, módulos y cursos.',
    'DELETE FROM lessons l',
    'USING catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'lesson'",
    '  AND i.entidad_id = l.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    'DELETE FROM modules m',
    'USING catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'module'",
    '  AND i.entidad_id = m.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    'DELETE FROM courses c',
    'USING catalog_load_items i',
    'JOIN catalog_load_batches b ON b.id = i.batch_id',
    "WHERE i.entidad = 'course'",
    '  AND i.entidad_id = c.id',
    `  AND b.codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    '-- 4. Cierre del manifiesto (los ítems se borran en cascada).',
    'DELETE FROM catalog_load_batches',
    `WHERE codigo = ${sqlTexto(CODIGO_LOTE)};`,
    '',
    'COMMIT;',
    '',
    '-- Comprobación posterior: 0 filas en los cursos del lote.',
    'SELECT c.id, c.titulo',
    'FROM courses c',
    `WHERE c.titulo IN (${listaSql(titulosCursos(catalogo))});`,
    '',
  ].join('\n');
}
function escribir(nombreArchivo, contenido) {
  fs.mkdirSync(DIR_SALIDA, { recursive: true });

  const ruta = path.join(DIR_SALIDA, nombreArchivo);

  fs.writeFileSync(ruta, contenido, 'utf8');

  return ruta;
}

/** Resumen legible del catálogo, sin escribir archivos. */
function imprimirResumen(modulosSpa) {
  const totales = { modulos: 0, lecciones: 0, opciones: 0, caracteres: 0 };

  console.log('');
  console.log(`Lote ${CODIGO_LOTE} -> ${path.relative(RAIZ, DIR_SALIDA)}`);
  console.log('');

  for (const curso of CATALOGO) {
    console.log(`* Curso: ${curso.titulo} [${curso.nivel}] - ${curso.area}`);

    for (const modulo of curso.modulos) {
      totales.modulos += 1;
      console.log(`    Modulo ${modulo.orden}: ${modulo.titulo}`);
    }

    for (const leccion of curso.lecciones) {
      const leccionSpa = buscarLeccionSpa(modulosSpa, curso.titulo, leccion.titulo);
      const largo = (contenidoSpa(leccionSpa) || '').length;
      const quiz = (leccionSpa && leccionSpa.quiz) || {};
      const opciones = (quiz.options || []).length;
      const correcta = Number.isInteger(quiz.correct) ? String.fromCharCode(65 + quiz.correct) : '?';

      totales.lecciones += 1;
      totales.opciones += opciones;
      totales.caracteres += largo;

      console.log(`      ${leccion.orden}. ${leccion.titulo}`);
      console.log(
        `         modulo: ${leccion.modulo} | contenido: ${largo} car. | ` +
          `${opciones} opciones | correcta: ${correcta}`
      );
    }

    console.log('');
  }

  console.log(
    `Total: ${CATALOGO.length} cursos, ${totales.modulos} modulos, ${totales.lecciones} lecciones, ` +
      `${totales.lecciones} cuestionarios, ${totales.opciones} opciones, ` +
      `${totales.caracteres} caracteres de contenido.`
  );
}

function main() {
  const soloResumen = process.argv.includes('--resumen');
  const modulosSpa = extraerModulosSpa();

  validarCatalogo(modulosSpa, CATALOGO);
  validarTitulosNormalizados(CATALOGO);

  if (soloResumen) {
    imprimirResumen(modulosSpa);

    return;
  }

  const salidas = [
    [`${PREFIJO}.sql`, generarCarga(CATALOGO, modulosSpa)],
    [`${PREFIJO}_verificacion.sql`, generarVerificacion(CATALOGO)],
    [`${PREFIJO}_respaldo.sql`, generarRespaldo(CATALOGO)],
    [`${PREFIJO}_reversion.sql`, generarReversion(CATALOGO)],
    [`${PREFIJO}_reversion_fisica.sql`, generarReversionFisica(CATALOGO)],
  ];

  for (const [nombre, contenido] of salidas) {
    const ruta = escribir(nombre, contenido);

    console.log(
      `OK ${path.relative(RAIZ, ruta)} (${contenido.split('\n').length} lineas, ${contenido.length} caracteres)`
    );
  }

  imprimirResumen(modulosSpa);
}

module.exports = {
  CATALOGO,
  CODIGO_LOTE,
  extraerModulosSpa,
  validarCatalogo,
  validarTitulosNormalizados,
  normalizarTitulo,
  generarCarga,
  generarVerificacion,
  generarRespaldo,
  generarReversion,
  generarReversionFisica,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

