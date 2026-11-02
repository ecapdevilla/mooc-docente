# Catálogo vacío en Production: diagnóstico y carga segura

Estado: 2026-11-01. Documento de trabajo local; no se ejecutó ningún cambio en
Production.

## 1. Síntoma

`GET https://mooc-docente.vercel.app/api/v1/courses` responde `200` con
`{"courses":[]}`. El SPA no puede emparejar los cursos del prototipo y emite
advertencias `loadCourseMap` para:

- Fundamentos de Pedagogía y Didáctica.
- Legislación Educativa Colombiana.
- Inteligencia Artificial para Docentes.

`GET /api/v1/courses/1` responde `404`, coherente con un catálogo vacío.

## 2. Qué se descartó en el código

| Hipótesis | Resultado |
| --- | --- |
| Ruta no montada o respuesta antigua | Descartado: `/api/v1/ping/health` responde `db:connected` y la ruta devuelve el JSON esperado. |
| Error SQL (500) | Descartado: la consulta termina en `200`. Si faltara la tabla, `pg` devolvería 500. |
| Filtro `activo = TRUE` ocultando cursos | Posible, pero no es un defecto: el listado público solo publica cursos activos. Falta confirmar en la base si hay filas inactivas. |
| Orden o relación rota | Descartado para el listado: `GET /api/v1/courses` no usa `JOIN`; solo subconsultas de conteo. |
| Permisos de la API | Descartado para lectura: sin `SELECT` la consulta fallaría con error de privilegios. |
| Relaciones curso → módulo → lección | No evaluables con el catálogo vacío; el detalle devuelve `404` antes de consultar módulos. |

Conclusión provisional verificable: **la base conectada responde y la tabla
`courses` existe, pero no hay cursos activos**. Las dos causas posibles son
datos ausentes (tabla vacía) o datos inactivos (`activo = false`). Ambas se
distinguen con las consultas 3 y 4 del archivo de diagnóstico.

## 3. Comprobación en la base (solo lectura)

Archivo: `database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql`.

Tres formas de ejecutarlo:

1. Supabase → SQL Editor → pegar el archivo completo.
2. Con `DATABASE_URL` configurada: `npm run diagnostico:catalogo`.
3. Sin conexión: `npm run diagnostico:catalogo -- --sql` imprime las consultas.

Resultados clave y su lectura:

- Consulta 1: confirma `current_database()`, `current_user`, esquema y
  `search_path`. Si el esquema no es `public`, la API podría estar leyendo otra
  base o el catálogo estar en otro esquema.
- Consulta 3: `total` y `activos` por tabla.
  - `courses.total = 0` → catálogo nunca cargado en esta base.
  - `courses.total > 0` y `activos = 0` → cursos despublicados.
- Consulta 4: catálogo visible por la API, con módulos y lecciones activas.
- Consulta 6: relaciones huérfanas o inactivas que romperían la navegación.
- Consulta 7: cuestionarios que no tengan 4 opciones y exactamente 1 correcta.
- Consulta 8: presencia exacta de los tres cursos que el SPA empareja por
  título (incluye diferencias de mayúsculas y espacios).
- Consulta 9: títulos duplicados; el SPA exige correspondencia única.
- Consulta 10: privilegios `SELECT` del rol usado por la API.

Tras publicar el cambio de código de este bloque, `GET /api/v1/courses`
incluirá `meta: { totalCursos, cursosActivos }`, que permite repetir esta
distinción desde Production sin acceso SQL.

### 3.1 Hallazgo adicional (2026-11-01)

Mediciones contra Production con `curl`:

| Petición | Resultado |
| --- | --- |
| `GET /api/v1/courses` | `200 {"courses":[]}` |
| `GET /api/v1/courses/1` | `404 {"error":"Curso no encontrado"}` |
| `GET /api/v1/ping/health` | `200 {"status":"ok","db":"connected"}` |
| `GET /api/v1/diagnostico-piloto/info` | `200` (50 preguntas) |
| `GET /api/v1/quizzes/post-login` sin token | `401` |
| `POST /api/v1/auth/login` con JSON válido | `500 {"error":"Error interno del servidor"}` |
| `POST /api/v1/auth/login` con `{}` | `400` de validación |
| `POST /api/v1/quizzes/post-login/attempts` con token inválido | `500` |

El `500` aparece al ejecutar consultas sobre `users`, mientras las lecturas de
catálogo y del piloto funcionan. Apunta a una tabla o columnas de identidad
ausentes/incompletas en la base de Production, o a una versión de API distinta
de `463d6aa`. Las consultas 11 y 12 del diagnóstico lo confirman. No es
consecuencia de los cambios locales de este bloque y no se modificó nada en
Production.


## 4. Plan de carga segura (no ejecutado)

> Actualización 2026-11-01: este plan ya está implementado y validado en una base
> local aislada. Ver la sección 7 para los archivos SQL generados, los comandos
> exactos y la evidencia de las pruebas A–J. Nada se ha ejecutado en Production.

Requisitos previos:

- Ejecutar el diagnóstico y conservar la salida como evidencia.
- Tomar un respaldo lógico del catálogo (`pg_dump` de solo lectura o snapshot
  de Supabase) antes de escribir.
- Confirmar que `database/schema.sql` ya está aplicado (consulta 2).
- No ejecutar `npm run seed` directamente contra Production: primero staging.

Fuente de datos académicos existente:

- `src/seed/data.sql`: cursos, módulos, lecciones, cuestionarios y opciones
  idempotentes por título (`WHERE NOT EXISTS`).
- `public/js/datos/modulos.js` (cargado por `indexInicial.html`): títulos de módulos y lecciones que el SPA empareja por
  título normalizado.

Pasos en staging:

1. Crear una base de staging con el esquema (`schema.sql`) y las migraciones
   aditivas (`20261031_additive_integration.sql`,
   `20261101_lesson_quiz_responses.sql`).
2. Ejecutar `npm run seed` contra staging.
3. Ejecutar el diagnóstico y validar consultas 4, 6, 7, 8 y 9 sin hallazgos.
4. Probar `GET /api/v1/courses`, `GET /api/v1/courses/:id` y la navegación del
   SPA contra staging (`window.MERITO_API_BASE` apuntando a staging).
5. Revisar el diff de títulos contra `public/js/datos/modulos.js`: cada módulo del SPA
   debe tener un curso homónimo y cada lección un título único.

Pasos en Production (cuando se autorice):

1. Ejecutar el bloque `data.sql` dentro de una transacción explícita
   (`BEGIN; ... COMMIT;`) con `search_path` en `public`.
2. Registrar los `id` creados (`RETURNING id, titulo`) en el acta de carga.
3. Reejecutar las consultas 4, 6, 7, 8 y 9.
4. Verificar `GET /api/v1/courses` (cursos y `meta`), el detalle y el avance de
   un usuario de prueba.

Rollback: el seed solo inserta cursos/módulos/lecciones/cuestionarios que no
existen por título. Para revertir, borrar únicamente los `id` registrados en el
acta, en el orden `quiz_options → quizzes → lessons → modules → courses` y
dentro de una transacción. No borrar filas preexistentes.

## 5. Verificación funcional esperada

- `GET /api/v1/courses` devuelve los cursos con `modulo_count` y
  `lesson_count` mayores que 0.
- `GET /api/v1/courses/:id` devuelve `modulos[].lecciones[]` con `quizzes` y
  opciones, sin `es_correcta` ni explicaciones.
- El SPA muestra la ruta del curso, los módulos y las lecciones; el progreso se
  guarda en `user_progress` y `enrollments` con el usuario autenticado.
- Un curso sin módulos activos no debe publicarse: la consulta 5 los detecta.

## 6. Riesgos

- Diferencias de título entre seed y SPA rompen el emparejamiento por título
  (el SPA no infiere IDs por orden).
- Ejecutar el seed sin revisar la consulta 8 puede duplicar cursos con tildes o
  espacios distintos; el seed compara títulos exactos.
- Si Production usa otra base que el entorno de desarrollo, la carga debe
  hacerse en la base a la que apunta `DATABASE_URL` de Vercel (verificable con
  la consulta 1).
- Publicar cursos sin revisar la consulta 7 habilita cuestionarios que el
  backend rechazará con `409` al no tener una única respuesta correcta.

## 7. Implementación entregada (2026-11-01): carga idempotente, auditable y reversible

Fuente única: `scripts/generar-carga-catalogo.js`. Extrae `const MODULES` de
`public/js/datos/modulos.js` con `vm` (sin copiar contenido a mano), valida el catálogo y
emite el SQL.

```bash
node scripts/generar-carga-catalogo.js            # escribe database/loads/
node scripts/generar-carga-catalogo.js --resumen  # solo reporte, no escribe
```

Salidas en `database/loads/`:

| Archivo | Uso |
| --- | --- |
| `20261101_carga_catalogo_tres_cursos.sql` | Carga completa: preflight → manifiesto → reactivación → insertos → verificación → `COMMIT`. |
| `20261101_carga_catalogo_tres_cursos_verificacion.sql` | Solo lectura; falla con excepción si el catálogo no coincide. |
| `20261101_carga_catalogo_tres_cursos_respaldo.sql` | Exporta el estado previo en JSON (evidencia y respaldo lógico). |
| `20261101_carga_catalogo_tres_cursos_reversion.sql` | **Reversión segura (la única válida en Production):** desactiva el lote y archiva sus cuestionarios sin borrar ninguna fila. |
| `20261101_carga_catalogo_tres_cursos_reversion_fisica.sql` | Borrado literal del lote. Bloqueado si existen datos de usuarios o si no se ejecutó antes la reversión segura. Solo para entornos sin actividad. |

Alcance: 3 cursos, 9 módulos, 11 lecciones, 11 cuestionarios, 44 opciones y
9 badges (12 254 caracteres de contenido de lección).

Decisiones de diseño:

- **Idempotencia**: cada `INSERT` usa `WHERE NOT EXISTS` por título normalizado
  (curso, módulo, lección), por lección (cuestionario) y por `orden` (opción).
  Reejecutar no duplica ni sobreescribe contenido existente.
- **Publicación**: los cuestionarios se insertan con
  `estado_revision = 'publicado'`, igual que `src/seed/data.sql`; sin ese valor
  el catálogo se sirve pero el cuestionario no se consume.
- **Auditoría**: `catalog_load_batches` + `catalog_load_items` registran solo las
  filas creadas por el lote mediante
  `WITH nueva AS (INSERT ... RETURNING id) INSERT INTO catalog_load_items ...`.
  La reversión nunca toca filas preexistentes.
- **Preflight**: aborta si hay títulos ambiguos (curso, módulo, lección) o más de
  un cuestionario en una lección, antes de escribir nada.
- **Atomicidad**: todo ocurre dentro de `BEGIN ... COMMIT` con
  `ON_ERROR_STOP=1`.

### 7.1 Validación ejecutada (PostgreSQL 17 local aislado, 2026-11-01)

Base de prueba `merito_carga_probe`, creada con `database/schema.sql`, la
migración `20261101_lesson_quiz_responses.sql` y datos de usuarios
deliberadamente realistas: 2 docentes, un curso de diagnóstico piloto con
inscripciones, progreso, badges, proyecto, intento y respuestas. La segunda base
`merito_carga_probe_limpia` no tiene usuarios y sirve para la reversión física.
Ninguna sentencia se ejecutó contra Production.

| Caso | Acción | Resultado |
| --- | --- | --- |
| A | Estado inicial con el piloto cargado | 2 usuarios, 1 curso, 2 intentos y 2 respuestas de intento |
| B | Preflight con dos cursos homónimos insertados a propósito | Aborta con `Carga abortada: cursos duplicados por título`; 0 módulos, 0 lecciones y 0 cuestionarios escritos |
| C | Primera carga | 3 / 9 / 11 / 11 / 44 y 9 badges; 87 filas de manifiesto; usuarios, intentos y progreso del piloto sin cambios |
| D | Reejecución de la carga | Conteos y manifiesto idénticos (87), sin filas nuevas |
| E | Script de verificación independiente | 11 lecciones verificadas: 1 cuestionario, 4 opciones y exactamente 1 correcta por lección; contenido entre 615 y 1259 caracteres |
| E2 | Actividad real sobre el lote (inscripción, progreso, badge, proyecto, regla de finalización, intento y respuesta de lección) | 1 inscripción, 2 progresos, 1 respuesta de intento, 2 badges de usuario, 1 proyecto, 1 regla y 1 respuesta de lección registrados |
| F | Reversión segura | 3 cursos y 11 lecciones desactivados, 11 cuestionarios archivados, **0 filas borradas**: usuarios, inscripciones, progreso, intentos, respuestas, badges, proyectos y reglas idénticos; manifiesto intacto (87) |
| G | Recarga tras la reversión segura | Reactiva el lote (4 cursos activos, 12 cuestionarios publicados) sin duplicar filas y sin tocar datos de usuarios |
| H | Intento de reversión física con datos de usuarios | Bloqueada: `Reversión física bloqueada: el lote tiene datos de usuarios (enrollments=1, user_progress=2, quiz_attempt_answers=1, user_badges=2, projects=1, course_completion_rules=1, lesson_quiz_responses=1)`; 0 filas borradas |
| I | Reversión física en base limpia, sin ejecutar antes la segura | Bloqueada: `Ejecuta primero la reversión segura: quedan 3 curso(s) del lote activos.` |
| J | Reversión segura y luego física en base limpia | Todos los conteos a 0, incluido el manifiesto |

Comprobaciones automatizadas del arnés: 21/21 aprobadas.

Verificación de navegación con la API local apuntando a esa base
(`GET /api/v1/courses`, `GET /api/v1/courses/:id`) y la misma normalización de
títulos del SPA (`normalizeLessonTitle`):

- 3/3 cursos emparejados por título normalizado.
- 11/11 lecciones emparejadas dentro de su curso.
- 11/11 lecciones con un único cuestionario publicado y 4 opciones.
- `GET /api/v1/courses` responde con `meta: { totalCursos, cursosActivos }`.

### 7.2 Procedimiento definitivo para Production (preparado, no ejecutado)

Orden exacto. Cada paso es independiente y verificable; ninguno se ejecutó
contra Supabase.

```bash
# 0. Respaldo verificable del catálogo y de los datos de usuarios
psql "$DATABASE_URL" -f database/loads/20261101_carga_catalogo_tres_cursos_respaldo.sql > respaldo_catalogo_20261101.json
pg_dump "$DATABASE_URL" --data-only -t users -t enrollments -t user_progress \
  -t quiz_attempts -t quiz_attempt_answers -t user_badges -t projects \
  > respaldo_usuarios_20261101.sql

# 1. Verificación de dependencias (solo lectura)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql

# 2. Migración de calificación en servidor (aditiva; el código funciona sin ella)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20261101_lesson_quiz_responses.sql

# 3. Instalación del catálogo (preflight aborta si hay títulos ambiguos)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/loads/20261101_carga_catalogo_tres_cursos.sql

# 4. Comprobaciones de integridad (falla con excepción si algo no coincide)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/loads/20261101_carga_catalogo_tres_cursos_verificacion.sql
npm run contenido:catalogo

# 5. Validación funcional: usuarios y progreso
#    GET /api/v1/courses -> meta.totalCursos / meta.cursosActivos
#    GET /api/v1/courses/:id -> modulos[].lecciones[] con quizzes sin es_correcta
#    POST /api/v1/progress/lesson/:id con un usuario real de bajo riesgo
#    POST /api/v1/quizzes/lessons/:id/responses -> 201 (ya con la migración)

# 6. Solo si hubiera que retirar el catálogo
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/loads/20261101_carga_catalogo_tres_cursos_reversion.sql
```

El paso 2 puede ejecutarse antes o después de publicar el código: sin la tabla
`lesson_quiz_responses`, `POST /api/v1/quizzes/lessons/:id/responses` responde
`503` con un mensaje en español y `POST /api/v1/progress/lesson/:id` sigue
funcionando (probado end-to-end, 13/13 comprobaciones).

La reversión del paso 6 es **segura**: no borra filas. Para republicar el lote,
basta con volver a ejecutar el paso 3.

### 7.3 Mapa de borrado en cascada y mitigación

Todas estas relaciones llegan al catálogo mediante `ON DELETE CASCADE`
(`database/schema.sql`), por lo que borrar un curso del lote destruye datos de
usuarios:

| Tabla | FK | Efecto al borrar el curso |
| --- | --- | --- |
| `modules` | `curso_id → courses` | Borra módulos |
| `lessons` | `modulo_id → modules` | Borra lecciones |
| `quizzes` | `leccion_id → lessons` | Borra cuestionarios |
| `quiz_options` | `quiz_id → quizzes` | Borra opciones |
| `enrollments` | `curso_id → courses` | **Borra matrículas de usuarios** |
| `user_progress` | `leccion_id → lessons` | **Borra el avance de usuarios** |
| `quiz_attempt_answers` | `quiz_id → quizzes` | **Borra respuestas históricas de intentos** |
| `user_badges` | `badge_id → badges` | **Borra badges obtenidos** |
| `projects` | `course_id → courses` | **Borra proyectos entregados por usuarios** |
| `course_completion_rules` | `course_id → courses` | Borra la regla de finalización |
| `lesson_quiz_responses` | `leccion_id`/`quiz_id` | **Borra el historial de respuestas de lección** |

Mitigaciones implementadas:

1. **La reversión de Production no borra**: desactiva (`activo = FALSE`) y
   archiva cuestionarios; los datos de usuarios quedan intactos.
2. **La reversión física tiene tres guardias**: exige que el lote exista, que la
   reversión segura se haya ejecutado antes y que no exista ni un registro de
   usuario vinculado al lote; en cualquier otro caso aborta con el detalle.
3. **La reversión segura compara 7 métricas de usuarios antes y después**
   (`enrollments`, `user_progress`, `quiz_attempt_answers`, `user_badges`,
   `projects`, `course_completion_rules` y, si la migración está aplicada,
   `lesson_quiz_responses`); si alguna cambia, la transacción aborta.
4. **Respaldo previo obligatorio** (paso 0) para restaurar catálogo y datos de
   usuarios por separado si algo fallara fuera de este procedimiento.

Restauración desde el respaldo: `respaldo_catalogo_20261101.json` contiene el
estado de cursos, módulos, lecciones, cuestionarios, opciones y badges antes de
la carga; `respaldo_usuarios_20261101.sql` contiene solo datos de usuarios y se
restaura con `psql "$DATABASE_URL" -f respaldo_usuarios_20261101.sql` dentro de
una transacción, tras verificar que el catálogo ya está en su sitio.

Fuera de alcance de esta carga:

- El segundo módulo de `Legislación Educativa Colombiana` que existe en
  `src/seed/data.sql` no se incluye: no tiene contenido en `public/js/datos/modulos.js`.
- El `Simulacro diagnóstico` posterior al login está asociado en
  `src/routes/quizzes.js` al curso `Evaluación Educativa y Autonomía
  Institucional`; estos tres cursos no lo alimentan.

