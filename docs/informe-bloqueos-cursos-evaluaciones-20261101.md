# Informe técnico: catálogo vacío y calificación segura (2026-11-01)

Ámbito: rama `recovery/integracion-20261031` (HEAD remoto `463d6aa`), clon
aislado `c:\Users\capde\mooc-docente-cursos-eval`. Sin commit, sin push, sin
cambios en Vercel ni en Production.

## A. Causa comprobada de la API vacía

Evidencia verificable:

- `GET /api/v1/courses` → `200 {"courses":[]}`; `GET /api/v1/courses/1` → `404`.
- `GET /api/v1/ping/health` → `db:connected` (la conexión funciona).
- Un fallo de tabla o permisos devolvería `500`; no ocurre, luego `courses`
  existe y la consulta se ejecuta.
- `src/routes/courses.js` solo filtra `c.activo = TRUE`; no hay `JOIN` en el
  listado que pueda vaciar el resultado, y el orden es `id ASC`.
- Los tres cursos que busca el SPA están en `src/seed/data.sql` con
  `activo = TRUE`; no están en la base de Production.

Conclusión: **no hay cursos activos en la base a la que apunta Production**. No
es un defecto de la ruta. Quedan dos estados posibles que requieren una lectura
SQL para distinguirse: tabla `courses` vacía (seed nunca aplicado en esa base) o
filas con `activo = false` (catálogo despublicado). El clon no tiene `.env`, por
lo que no se pudo ejecutar la consulta autorizada.

Consulta puntual solicitada (solo lectura, archivo
`database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql`):
resultado de las consultas 1, 3, 4, 8, 9, 11 y 12.

Hallazgo adicional medido hoy con `curl` (GET/POST de solo lectura): en
Production, `POST /api/v1/auth/login` con un JSON de formato válido responde
`500 {"error":"Error interno del servidor"}`, mientras `GET /api/v1/courses`,
`/ping/health` y `/diagnostico-piloto/info` responden `200` y
`POST /api/v1/auth/login` con `{}` responde `400`. También
`POST /api/v1/quizzes/post-login/attempts` con token inválido responde `500` en
lugar de `401`. Indica un fallo de base de datos en el camino de identidad
(tabla/columnas de `users`) o una versión de API distinta de `463d6aa`; se
confirma con las consultas 11 y 12. Es un bloqueo de Production previo a este
trabajo, no una regresión de los cambios locales.


## B. Corrección implementada / carga necesaria

Código (sin cambio de contrato del SPA):

- `GET /api/v1/courses` añade `meta: { totalCursos, cursosActivos }`, que
  distingue "sin filas" de "todas inactivas" desde la propia API.
- Diagnóstico reproducible: `database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql`
  y `scripts/diagnostico-catalogo.js` (`npm run diagnostico:catalogo`), con
  barrera que aborta si una sentencia no es `SELECT/WITH/SHOW/EXPLAIN`.
- Plan de carga: `docs/carga-catalogo-production.md` (staging primero,
  transacción, acta de ids, verificación y rollback). **No se cargaron datos.**

Datos: la carga del catálogo sigue pendiente de autorización y de la lectura SQL
anterior. No se inventaron cursos ni se ejecutaron seeds.

## C. Nueva calificación segura de cuestionarios

- Endpoint: `POST /api/v1/quizzes/lessons/:lessonId/responses` con
  `{ quizId, optionId }`. Solo acepta identificadores; ignora `correct`,
  `puntaje`, `score` o cualquier resultado enviado por el cliente.
- Valida autenticación, que la pregunta pertenezca a la lección y a un
  módulo/curso activos, que la opción pertenezca a la pregunta y que exista
  exactamente una opción correcta.
- Califica con `quiz_options.es_correcta` en SQL y registra una fila
  append-only en `lesson_quiz_responses` con instantáneas de pregunta y opción.
- Deriva el puntaje: `100` solo si todas las preguntas de la lección fueron
  respondidas correctamente; en caso contrario `NULL`.
- Actualiza `user_progress` sin duplicar filas (`ON CONFLICT ... DO UPDATE`) y
  crea la inscripción cuando corresponde.
- `POST /api/v1/progress/lesson/:id` ya no acepta `puntaje`: lo calcula. Si la
  lección no tiene cuestionario, el progreso queda sin nota. Modo estricto
  opcional con `LESSON_COMPLETION_REQUIRES_QUIZ=true` (responde `409`).
- SPA: `loadCourseMap` conserva `quizzes`; `renderLesson` pinta el mismo bloque
  `.lx-quiz` con las preguntas de la API (sin `es_correcta`) y
  `answerApiQuiz` envía solo IDs, muestra la explicación del servidor y permite
  reintento. El diseño 2.0 no se modificó.
- Si la migración no está aplicada, el endpoint responde `503` y el progreso
  sigue funcionando sin puntaje (no hay `500`).

## D. Archivos modificados

Nuevos:

- `database/migrations/20261101_lesson_quiz_responses.sql`
- `database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql`
- `src/services/lessonQuiz.js`
- `scripts/diagnostico-catalogo.js`
- `docs/carga-catalogo-production.md`
- `docs/calificacion-segura-cuestionarios.md`
- `docs/informe-bloqueos-cursos-evaluaciones-20261101.md`
- `tests/lesson-quiz-security.test.js`
- `tests/progress-security.test.js`
- `tests/lesson-quiz-spa.test.js`
- `tests/catalog-diagnostics.test.js`

Modificados:

- `src/routes/courses.js` (contadores `meta`).
- `src/routes/quizzes.js` (endpoint de calificación).
- `src/routes/progress.js` (puntaje derivado, modo estricto).
- `indexInicial.html` (quizzes de la API, `answerApiQuiz`, sin `puntaje` en
  `persistLesson`; sin cambios de diseño).
- `tests/progress.test.js` (el puntaje ya no se acepta del cliente).
- `tests/courses.test.js` (contrato de `meta`).
- `package.json` (script `diagnostico:catalogo`).
- `AGENTS.md` (estado y contratos del 2026-11-01).

## E. Migraciones necesarias

`database/migrations/20261101_lesson_quiz_responses.sql`: solo
`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` y `COMMENT`.
No altera, borra ni reescribe tablas, preguntas, intentos o progreso histórico.
No se ejecutó en Production ni en staging.

## F. Pruebas y resultados

- Suites existentes con base simulada: 6 suites, **66/66 PASS**
  (`admin-pilot-diagnostic`, `admin-pilot-diagnostic-ui`,
  `admin-pilot-diagnostic-import`, `learning-experience`, `ui-design`,
  `pilot-diagnostic-isolation`) → login/usuarios, diagnóstico de 50 preguntas,
  administrador, importador Excel y rediseño 2.0 sin regresiones.
- Suites nuevas: 4 suites, **20/20 PASS** (`lesson-quiz-security` 9,
  `progress-security` 4, `lesson-quiz-spa` 3, `catalog-diagnostics` 4).
- `node --check` correcto en los 9 archivos JS tocados.
- `git diff --check` sin errores de espacios.
- No ejecutadas: `auth`, `courses`, `progress`, `quizzes`, `health`,
  `admin-routes`, `spa-ui` (requieren `DATABASE_URL`; el clon aislado no tiene
  `.env`). No se ejecutó ninguna prueba destructiva contra Production.
- Nota de ejecución: jest en Windows requiere `--runInBand` para estas suites
  (con workers en paralelo el proceso terminó con código 1 sin fallos de test).

## G. Pendientes reales

1. Ejecutar la consulta de diagnóstico y confirmar "vacío" vs "inactivo".
2. Autorizar la carga del catálogo en staging y luego en Production.
3. Aplicar la migración de respuestas en staging y correr las suites con base
   real (incluida una prueba del endpoint nuevo).
4. Verificar en navegador la navegación autenticada curso → módulo → lección en
   Production con credenciales.
5. Migrar a la API las actividades del prototipo que aún viven en el HTML;
   mientras tanto no otorgan puntaje.
6. Definir la regla de aprobación por intentos: hoy dominar la lección admite
   reintentos, aunque todo queda registrado (`lesson_quiz_responses.intentos`).
7. Activar `LESSON_COMPLETION_REQUIRES_QUIZ=true` solo cuando el SPA use
   siempre actividades de la API.
8. Aplicar `course_completion_rules` usando `lesson_quiz_responses` como fuente
   de aprobación.
9. Confirmar en Production el `500` de `POST /auth/login` con las consultas 11
   y 12, y verificar que la función desplegada corresponde a `463d6aa`.

## H. Procedimiento de despliegue controlado

1. Revisar el diff local y ejecutar de nuevo las suites con base simulada.
2. Ejecutar la migración en staging; correr las suites con base real.
3. Ejecutar la migración en Production (idempotente, aditiva).
4. Publicar API + SPA en `recovery/integracion-20261031` (commit y push solo con
   autorización expresa).
5. Verificar en Production, en este orden:
   - `GET /api/v1/ping/health` → `db:connected`.
   - `GET /api/v1/courses` → `courses` y `meta` (tras la carga de datos).
   - `GET /api/v1/courses/:id` → sin `es_correcta` ni explicaciones.
   - `POST /api/v1/quizzes/lessons/:id/responses` sin token → `401`.
   - Con token: opción incorrecta → `201` sin puntaje; correcta → `201` con
     `puntaje: 100` y `lesson.completed: true`.
   - `POST /api/v1/progress/lesson/:id` con `{ puntaje: 100 }` → puntaje nulo
     si el cuestionario no está dominado.
   - Navegación curso → módulo → lección con usuario de prueba y progreso
     persistido.
6. Rollback: revertir el despliegue de código (la tabla nueva queda inerte) y,
   si se cargó catálogo, borrar solo los ids registrados en el acta de carga.

