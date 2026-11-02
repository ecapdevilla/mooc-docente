# Guía de agentes - MéritoDocente

## Propósito

Este archivo es el contexto operativo mínimo para agentes de IA que trabajen en el proyecto. Leerlo antes de explorar el repositorio. Mantenerlo actualizado cuando cambien comandos, arquitectura o decisiones importantes.

## Estado verificado

- Plataforma MOOC para preparación de concursos de méritos docentes.
- Backend: Node.js 18+, Express 4, PostgreSQL, JWT y bcryptjs.
- Frontend: HTML, CSS y JavaScript vanilla; la SPA principal es `indexInicial.html` (autocontenida) y consume la API directamente.
- Punto de entrada backend: `src/server.js`. Escucha solo si se ejecuta directamente y exporta la app para uso serverless.
- API base: `/api/v1`.
- Esquema de datos: `database/schema.sql`.
- Datos iniciales: `src/seed/data.sql` y `src/seed/seed.js`, idempotentes. Las opciones de quiz se reconcilian al reejecutar el seed.
- Base de datos de desarrollo: Supabase (pooler) mediante `DATABASE_URL` en `.env`.
- Pruebas: `tests/` tiene 6 suites (salud, autenticación, cursos, progreso, interfaz del SPA con jsdom y experiencia de aprendizaje). `tests/learning-experience.test.js` corre sin base de datos con un doble de la API (8 pruebas). `npm test` requiere la base configurada en `.env`.
- Servido local: `GET /` entrega `indexInicial.html`; `public/` expone `/api-client.js` y `/auth.js` en la raíz.
- Despliegue: `vercel.json` y `api/index.js` preparan frontend estático + API serverless. Aún no desplegado ni verificado en Vercel.
- Git: repositorio inicializado, rama `main`, remoto `origin` apuntando a `https://github.com/ecapdevilla/mooc-docente.git`.
- Deuda menor: el archivo `nulul` en la raíz es un artefacto de shell versionado por error.

## Auditoría de arquitectura (2026-09-10)

La hoja de ruta funcional completa, incluido el simulacro gratuito y la importación de 50 preguntas desde Word, está en `docs/roadmap.md`.

### Arquitectura real

El flujo actual es:

`Frontend -> Express -> rutas con SQL directo -> PostgreSQL`

- `src/server.js` configura Express, seguridad, rate limiting, rutas, `/health` y el arranque condicionado a una conexión válida.
- `src/config/database.js` usa `pg.Pool` y exige `DATABASE_URL`.
- Las consultas están directamente en `src/routes/`; `src/controllers/` y `src/models/` están vacíos.
- `public/api-client.js` y `public/auth.js` son el cliente de API y la gestión de sesión con `localStorage`.
- `app.js` es la lógica que intenta consumir la API.
- `indexInicial.html` es la SPA documentada, pero actualmente usa principalmente módulos y progreso locales; existe una segunda integración en `app.js`.

### Estado validado para el quiz (2026-09-16)

- El login de `indexInicial.html` funciona contra `/api/v1/auth/login`, guarda el token y carga cursos/progreso desde la API.
- Los quizzes de lección ya existen en PostgreSQL mediante `quizzes` y `quiz_options`; `GET /api/v1/courses/:id` devuelve la pregunta y sus opciones.
- La interfaz muestra el quiz de lección al abrir una lección y ofrece el quiz independiente como submódulo opcional `Simulacro diagnóstico` dentro del dashboard; no se abre automáticamente después de iniciar sesión.
- El `Simulacro diagnóstico` presenta una pregunta por pantalla, con indicador de avance, navegación anterior/siguiente y envío únicamente al finalizar.
- La retroalimentación del simulacro muestra puntaje general, gráfico de desempeño por tema, áreas prioritarias para reforzar y explicación individual de cada respuesta; los resultados del backend incluyen `area` y `topic` sin exponer respuestas correctas antes del envío.
- Las primeras preguntas se alojarán en Supabase/PostgreSQL, no dentro de `indexInicial.html`. Para esta primera carga se usarán `src/seed/data.sql` y `src/seed/seed.js`, manteniendo el seed idempotente.
- Cuando el volumen crezca, las preguntas deberán pasar a un editor administrativo/importador desde Word. Ese editor será la fuente operativa; el seed quedará para datos base y entornos nuevos.
- Antes de cargar preguntas nuevas, validar: enunciado, mínimo dos opciones, exactamente una respuesta correcta, explicación opcional, área/tema y fuente.
- Protocolo para nuevas preguntas: conservar el contexto completo enviado por el autor; asignar la pregunta a la lección temática más precisa; usar cuatro opciones plausibles y una sola correcta; registrar explicación correcta e incorrecta; añadir el `INSERT` idempotente en `src/seed/data.sql`; incluir la pregunta en la limpieza/reconciliación de `quiz_options`; ejecutar `npm run seed` y `git diff --check`; actualizar este archivo con el número, lección y respuesta correcta.
- Estándar de retroalimentación: no limitarse a indicar acierto/error. El simulacro debe devolver tema y área, agrupar el desempeño por tema, mostrar porcentaje visual, señalar áreas prioritarias de refuerzo y explicar cada respuesta con orientación de estudio. No exponer `es_correcta` antes del envío ni hardcodear preguntas en la SPA.
- Riesgo conocido: el detalle actual de cursos devuelve `es_correcta` porque el quiz de lección se califica en el navegador. El nuevo quiz independiente post-login debe ocultar la respuesta correcta, calificar en backend y persistir el intento.
- Preguntas incorporadas el 2026-09-16: se creó el curso `Evaluación Educativa y Autonomía Institucional`, con las lecciones `Evaluación integral y autonomía del SIEE` y `PEI, participación y autonomía institucional`. Cada pregunta quedó con 4 opciones y exactamente 1 correcta, con dificultad avanzada y explicaciones ampliadas.
- Se añadió una tercera pregunta avanzada sobre continuidad de la valoración, estrategias de apoyo y promoción según el Decreto 1290 de 2009; quedó en la lección `Evaluación integral y autonomía del SIEE`, con la opción C como única correcta.
- Se añadieron cuatro preguntas avanzadas: dos nuevas en `Evaluación integral y autonomía del SIEE` sobre valoración y SIEE, una en `Convivencia escolar y protección frente al acoso` y una en `Educación inclusiva y ajustes pedagógicos`. Sus respuestas correctas son A, B, A y A, respectivamente.
- Se añadieron las preguntas 5 a 8 en las lecciones `PEI, currículo y autonomía institucional`, `Gobierno escolar y distribución de competencias`, `Función docente, planeación y contexto` y `Familia, autonomía escolar y responsabilidad docente`. Sus respuestas correctas son B, C, C y C, respectivamente.
- Se añadieron las preguntas 9 a 12: convivencia y procedimiento disciplinario, competencias del Consejo Académico y Consejo Directivo, libertad de cátedra y currículo, y protección de derechos/confidencialidad. Sus respuestas correctas son C, B, C y B; la última usa la nueva lección `Protección de derechos, confidencialidad y actuación institucional`.
- Se añadieron las preguntas 13 a 17: valoración académica y convivencia, competencias institucionales ante transición escolar, inclusión y promoción, clasificación de conflicto/acoso, e información familiar y autonomía docente. Sus respuestas correctas son A, B, C, C y C; la última usa la nueva lección `Familia, información y participación educativa`.
- Se añadieron cinco preguntas nuevas: carrera docente y provisión de vacantes, Fondo de Servicios Educativos y contratación, competencias disciplinarias, jornada docente y custodia escolar. Sus respuestas correctas son B, C, C, C y C; las tres primeras usan lecciones nuevas y las dos últimas se asociaron a `Función docente, planeación y contexto` y `Protección de derechos, confidencialidad y actuación institucional`.
- Se añadieron las preguntas 29 a 33: permanencia y convivencia, seguimiento de funciones docentes, promoción anticipada, aplicación temporal del SIEE e información académica de estudiantes mayores de edad. Sus respuestas correctas son C, C, B, C y C.
- El listado de cursos quedó ordenado por `id ASC` en `src/routes/courses.js`; al agregar el curso avanzado, el orden por fecha hacía que una prueba de progreso tomara un curso de dos lecciones y devolviera 50% en lugar de 100%.
- El simulacro diagnóstico cuenta con `GET /api/v1/quizzes/post-login` y `POST /api/v1/quizzes/post-login/attempts`. El primero oculta `es_correcta`; el segundo califica en backend y guarda intentos/respuestas en `quiz_attempts` y `quiz_attempt_answers`. La SPA solo solicita las preguntas cuando la persona pulsa `Iniciar simulacro`.

### Experiencia de curso, módulo y lección (2026-11-01)

- `indexInicial.html` incorpora un sistema visual reutilizable con prefijo `.lx-` y tres vistas: `#view-course`, `#view-module` y `#view-lesson` renovada; el contenido está en `docs/inventario-academico-tres-cursos.md`.
- El dashboard abre la vista de curso (`openCourse`). Esa vista muestra la ruta real por módulos de la API, el avance por lección y los módulos/lecciones en preparación; no inventa objetivos ni resultados de aprendizaje: los declara en curación editorial.
- `loadCourseMap` conserva ahora `modules` y `apiLessons` con título, descripción y orden; `getCourseModel` y `getModuleModel` derivan todos los estados de `state.progress` y de la correspondencia por título.
- La vista de módulo lista solo lecciones con contenido publicado, marca la siguiente, permite continuar y deja las lecciones sin contenido como "En preparación", sin acción.
- La vista de lección conserva los IDs que usa la calificación existente (`quizBlock`, `quizOptions`, `quizFeedback`, `lessonNavInfo`), añade lectura tipada, índice lateral y navegación anterior/siguiente; `completeLessonFromFooter` reutiliza `completeLesson` y la persistencia en `/progress/lesson/:id`.
- Si un curso no tiene correspondencia con la API, la vista muestra una sola "Ruta del curso" y advierte que el avance es local.
- Validación ejecutada: `npx jest tests/ui-design.test.js tests/learning-experience.test.js` 14/14 y `npx jest` sobre las cinco suites de administrador, diagnóstico y Excel (54/54, con base simulada). Las suites que requieren PostgreSQL no se ejecutaron por falta de `.env`.
- Revisión visual con navegador real (`playwright-core` + Chrome) y API aislada: 33 capturas en 1440/768/390 px, sin desbordamiento horizontal. Evidencia en `docs/evidence/learning-experience/` (`README.md`, `manifest.json` y capturas identificadas como simulación).
- Defectos corregidos en esa revisión: `#lessonView` duplicaba `lx-lesson-layout` y reducía el artículo a 2 px (ahora `lx-lesson-page`); al responder correctamente la actividad, el estado se refresca en el lugar con `refreshLessonCompletionUi()` sin perder la retroalimentación.
- Production (2026-11-01, antes de publicar): `/api/v1/courses` devuelve `{"courses":[]}` aunque la base responde conectada, por lo que la SPA usará la ruta local de cada curso. El diagnóstico sigue publicado con 50 preguntas (`MD-DIA-2026-PILOTO-001`).
- Despliegue verificado (commit `906e771`, rama `recovery/integracion-20261031`, fast-forward): Production sirve el HTML idéntico al commit (SHA-256 coincidente), con 237 reglas `.lx-`, `#view-course`, `#view-module` y `lx-lesson-page`; rutas administrativas y simulacro siguen en 401 sin token; `/diagnostico-piloto` responde 200. La navegación autenticada en Production no se verificó: no hay credenciales y la API pública no publica cursos. Evidencia en `docs/evidence/learning-experience/production-postdeploy.json`.
- Pendiente: la calificación del quiz de lección sigue en el navegador (el detalle del curso expone `es_correcta`); debe migrarse al backend como el simulacro.

### Decisión de producto

`indexInicial.html` es la fuente principal de diseño, contenido y flujo de usuario: no es un archivo descartable, sino el prototipo más completo del producto. Los módulos, lecciones, quizzes, badges y pantallas que hoy funcionan con `localStorage` deben migrarse progresivamente a persistencia real.

`index.html` y `app.js` son una integración API provisional. No crear una tercera interfaz ni duplicar módulos. La dirección es conservar la experiencia de `indexInicial.html`, conectar sus acciones con la API y dejar una sola entrada frontend antes del despliegue.

### API registrada

- Pública: `GET /health`, `GET /api/v1/ping/health`, registro, login, listado y detalle de cursos.
- Autenticada: usuario actual, progreso, completar lección, perfil, actualización de perfil e inscripciones.
- Administrativa: listado de usuarios y actualización de usuarios bajo `/api/v1/admin`.
- Simulacro diagnóstico: ruta protegida para obtener preguntas sin respuestas correctas y ruta protegida para calificar/persistir el intento; el acceso se muestra como submódulo opcional del dashboard.

### Bloqueos funcionales: estado

Todos los bloqueos del inventario anterior (1-12) están corregidos: el seed es idempotente y canónico, el progreso usa `req.user.id`, los badges gestionan `rows`, `validateProgress` se aplica a la ruta, el perfil no toca columnas inexistentes, `tests/` tiene suites reales y `public/` se sirve desde Express.

Corregidos además en la sesión del 2026-09-12:

1. `GET /api/v1/courses/:id` fallaba con 500 (`column "qo.orden" must appear in the GROUP BY clause`, código 42803). El `ORDER BY` debe ir dentro de `json_agg(... ORDER BY ...)`.
2. Al reejecutar el seed quedaban opciones de quiz obsoletas y aparecían quizzes con dos respuestas correctas. Ahora el seed reconcilia las opciones de los quizzes sembrados (4 opciones y 1 correcta por quiz).
3. `public/api-client.js` terminaba con `module.exports`, que lanza `ReferenceError` en el navegador; ahora expone `window.api` y mantiene compatibilidad con Node.
4. `GET /api/v1/progress` no exponía el detalle por lección; ahora cada módulo incluye `lessons` con `completada`.
5. Al cargar el curso de evaluación, `GET /api/v1/courses` podía cambiar el primer curso por el orden de `creado_en`; ahora el orden es determinista por `id ASC`.

Pendientes reconocidos (no bloquean el desarrollo actual):

- `docs/swagger.yaml` no existe, por lo que `/api-docs` no se monta.
- `index.html` y `app.js` siguen siendo la integración provisional; su retiro está planificado.
- El contenido del SPA y el del seed no coinciden lección por lección. El mapeo actual es por orden (módulo del prototipo ↔ curso de la API) y la reconciliación de contenido corresponde a la Fase 3.
- El despliegue en Vercel está configurado pero no ejecutado ni verificado.

## Plan de conexión a Supabase

### Fase 1: Supabase como PostgreSQL administrado (recomendada)

Conservar Express, `pg`, JWT y bcryptjs. Crear el proyecto Supabase, ejecutar el esquema corregido en el SQL Editor, cargar un seed idempotente y poner la cadena PostgreSQL de Supabase en `DATABASE_URL`. Configurar SSL para producción y probar primero `/health`, registro, login, cursos y progreso.

Esta fase no requiere `@supabase/supabase-js`, Supabase Auth ni una reescritura de las consultas. El pooler de Supabase debe usarse según la cadena recomendada por el proyecto y las credenciales deben permanecer solo en `.env`.

Estado (2026-09-12): completada. La API opera contra Supabase con `pg`, JWT y bcryptjs; registro, login, cursos, progreso, perfil e inscripciones responden correctamente y están cubiertos por pruebas.

### Fase 2: consolidación de aplicación

Elegir un único frontend oficial, alinear sus respuestas con la API y separar rutas, controladores y modelos solo cuando exista una necesidad concreta. Añadir pruebas mínimas para salud, autenticación, cursos y progreso.

### Fase 3: servicios nativos de Supabase (opcional)

Evaluar Supabase Auth, Storage y Row Level Security únicamente después de estabilizar la API actual. Es una migración mayor porque cambia identidad, autorización y acceso a datos.

## Punto actual y siguiente acción

Estado (2026-09-16): Supabase conectado y operativo; seed canónico; bloqueos funcionales corregidos; 30 pruebas pasan; `indexInicial.html` registra e inicia sesión contra la API y guarda el progreso en PostgreSQL (con respaldo local si la API no responde); configuración de Vercel preparada pero sin desplegar. Las preguntas avanzadas están cargadas en Supabase mediante el seed. El dashboard ofrece el `Simulacro diagnóstico` como submódulo opcional; al abrirlo, se califica en backend y se guarda el intento.

Estado (2026-11-01): se añadió el recorrido de aprendizaje curso → módulo → lección con el sistema `.lx-` en `indexInicial.html`; las tres vistas consumen módulos, lecciones y progreso reales de la API y declaran como "en preparación" lo que aún no tiene contenido. La suite `tests/learning-experience.test.js` (8 pruebas, sin base de datos) cubre estados, navegación y persistencia simulada. Pendiente de revisión visual en navegador a 1440/768/390 px y de decisión sobre la calificación del quiz de lección en backend.

Siguiente acción concreta: revisar el recorrido curso → módulo → lección en navegador y luego ampliar el banco de preguntas o construir el editor/importador administrativo.

## Comandos

```bash
npm install
npm run dev       # nodemon src/server.js
npm start         # node src/server.js
npm run seed      # idempotente; requiere PostgreSQL y variables de entorno
npm test          # 6 suites; las que usan PostgreSQL requieren la base de .env
```

Requisitos de ejecución: Node.js >= 18, PostgreSQL >= 14 y un `.env` basado en `.env.example`. El servidor verifica la conexión a la base de datos antes de escuchar en el puerto. Con `npm run dev`, el SPA está en `http://localhost:3000/` y la API en `http://localhost:3000/api/v1`. Para reproducir el enrutado de Vercel en local: `npx vercel dev`.

## Mapa rápido

- `src/routes/`: definición de endpoints y middleware asociado.
- `src/controllers/`: manejo de solicitudes y respuestas.
- `src/models/`: consultas y acceso a datos.
- `src/services/`: lógica de negocio reutilizable.
- `src/middleware/auth.js`: autenticación y autorización.
- `src/utils/validators.js`: validación de entradas.
- `indexInicial.html`: SPA principal (diseño, contenido y flujo del producto).
- `docs/inventario-academico-tres-cursos.md`: inventario A/B/C, contrato de la API, correspondencia SPA↔BD y modelo de presentación de curso, módulo y lección.
- `tests/learning-experience.test.js`: integración sin base de datos del recorrido curso → módulo → lección con un doble de la API.
- `public/`: cliente HTTP y autenticación usados por la integración provisional.
- `api/index.js`: entrada serverless de la API para Vercel.
- `vercel.json`: builds y rutas del despliegue (frontend estático + API).
- `database/schema.sql`: tablas, relaciones e índices.
- `docs/architecture.md`: descripción general de arquitectura.

## Contratos importantes

- Autenticación: `Authorization: Bearer <token>`.
- Rutas públicas y protegidas deben conservar el prefijo `/api/v1`.
- Las consultas SQL deben usar parámetros; no concatenar valores recibidos del cliente.
- No exponer secretos de `.env`, tokens ni contraseñas en código, logs o documentación.
- Los cambios de esquema deben incluir la actualización de `database/schema.sql` y del seed cuando aplique.
- Mantener compatibilidad con las respuestas que consume `indexInicial.html` y `public/api-client.js`.
- Preguntas iniciales: guardar en PostgreSQL/Supabase mediante `quizzes` y `quiz_options`; no hardcodearlas en el HTML. Usar el seed para la primera carga y reservar un editor/importador para la gestión posterior.
- Mapeo SPA ↔ API: `indexInicial.html` empareja cada módulo del prototipo con un curso por título, resuelve las lecciones por orden (`modulos[].lecciones[]`) y guarda cada lección completada con `POST /api/v1/progress/lesson/:id`. `GET /api/v1/progress` entrega, por módulo, `lessons` con `completada`.
- Origen de la API en el SPA: `window.MERITO_API_BASE` si está definido; si no, `origen actual + /api/v1`; si no, `http://localhost:3000/api/v1` (apertura con `file://`). Si la API no responde, el SPA degrada a modo local y avisa al usuario.
- Claves de `localStorage` compartidas: `auth_token` y `user`.
- Antes de cambiar un endpoint, revisar su ruta, controlador/modelo y llamada del frontend inmediata; no explorar todo el repositorio sin necesidad.

## Protocolo de trabajo para agentes

1. Leer este archivo y el archivo directamente relacionado con la tarea.
2. Formular una hipótesis local sobre la causa o el cambio requerido.
3. Revisar solo un vecino: ruta, controlador, modelo, cliente o test relacionado.
4. Hacer el cambio más pequeño que pruebe la hipótesis.
5. Ejecutar una validación enfocada antes de continuar. Como mínimo, usar `node --check` sobre los JS modificados; para API usar una prueba HTTP o Jest cuando exista.
6. En el cierre, registrar archivos tocados, validación ejecutada, resultado y bloqueos.

No repetir lecturas ya cubiertas por este archivo. No modificar archivos no relacionados ni rehacer formato por estilo. No crear commits automáticamente.

## Handoff entre agentes

Usar este formato en el mensaje de entrega o en el resumen de la sesión:

```text
Objetivo:
Archivos revisados:
Cambio realizado:
Validación:
Resultado:
Bloqueos o decisiones pendientes:
Siguiente acción concreta:
```

El agente siguiente debe comenzar por `Siguiente acción concreta` y solo ampliar la exploración si la validación lo exige.

## Bloqueos 2026-11-01: catálogo y calificación segura

Estado (2026-11-01, local, sin commit ni despliegue):

- Bloque 1: `GET /api/v1/courses` en Production responde `{"courses":[]}`. La
  consulta y los filtros son correctos; el detalle `404` y la conexión
  `db:connected` descartan fallo de ruta o de permisos. Falta confirmar en la
  base si `courses` está vacía o con `activo = false` mediante
  `database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql` o
  `npm run diagnostico:catalogo` (solo lectura). El listado ahora incluye
  `meta: { totalCursos, cursosActivos }` para diagnosticarlo desde la API.
- Plan de carga: `docs/carga-catalogo-production.md` (staging, transacción,
  acta de ids, verificación y rollback). El seed no se ejecutó en Production.
- Bloque 2: la calificación se movió al backend con
  `POST /api/v1/quizzes/lessons/:lessonId/responses` (`{ quizId, optionId }`).
  Valida lección/pregunta/opción, califica con `quiz_options.es_correcta`,
  registra historial append-only en `lesson_quiz_responses` y deriva el puntaje
  (100 solo si la lección está dominada).
- `POST /api/v1/progress/lesson/:id` ya no acepta `puntaje` del cliente: lo
  calcula con las respuestas verificadas; sin cuestionario dominado queda en
  `NULL`. Con `LESSON_COMPLETION_REQUIRES_QUIZ=true` responde `409` si falta
  dominar la actividad.
- SPA: cuando la lección mapeada publica `quizzes` en la API, la actividad usa
  esas preguntas (sin `es_correcta`) y `answerApiQuiz` califica en el servidor;
  el diseño 2.0 no cambió. Las actividades solo locales del prototipo siguen
  calificándose en el navegador y no otorgan puntaje.
- Migración pendiente de aplicar: `database/migrations/20261101_lesson_quiz_responses.sql`.
- Pruebas nuevas: `lesson-quiz-security`, `progress-security`,
  `lesson-quiz-spa`, `catalog-diagnostics` (20/20 con base simulada).
- Detalle: `docs/calificacion-segura-cuestionarios.md` y
  `docs/informe-bloqueos-cursos-evaluaciones-20261101.md`.

## Carga del catálogo y login 500 (2026-11-01, verificado en local)

- Causa del `500` en `POST /api/v1/auth/login`: el manejador global de errores
  convertía `entity.parse.failed` de `body-parser` en `500` en cualquier ruta.
  Ahora `src/server.js` responde `400 "JSON inválido en el cuerpo de la
  solicitud"`, registra los 4xx sin volcar el cuerpo y reserva `console.error`
  para los 5xx. Detalle: `docs/login-500-production-20261101.md`.
- Production sigue desactualizado: allí el caso malformado responde `500` y
  `GET /api/v1/courses` no incluye `meta` (la rama local sí). Falta desplegar.
- Pruebas nuevas: `tests/errores-http.test.js` (5 casos: 400 en login y en ruta
  inexistente con JSON roto, log sin cuerpo ni contraseña, 404 sin cuerpo y 401
  con credenciales inválidas) y `tests/http-errors.test.js` (6 casos del
  clasificador). En local el error llega como `entity.parse.failed`; en Vercel
  llega con otra forma, así que `src/server.js` marca `req.cuerpoJsonInvalido`
  al envolver `express.json()` y `src/utils/httpErrors.js` queda como red de
  seguridad. `GET /health` devuelve `commit` con el SHA desplegado.
- Carga del catálogo implementada en `scripts/generar-carga-catalogo.js`
  (`npm run carga:catalogo`): extrae `const MODULES` de `indexInicial.html`,
  valida títulos normalizados y emite cinco SQL en `database/loads/`
  (carga, verificación, respaldo, reversión segura y reversión física).
  Idempotente por `WHERE NOT EXISTS`, auditable con
  `catalog_load_batches`/`catalog_load_items`, republicable (paso 1.b reactiva
  el lote) y reversible solo sobre lo creado por el lote.
- Reversión segura (`..._reversion.sql`): **no borra filas**; deja cursos,
  módulos y lecciones con `activo = FALSE`, archiva los cuestionarios y compara
  siete métricas de usuarios antes/después (aborta si cambian). La reversión
  física (`..._reversion_fisica.sql`) queda bloqueada si hay datos de usuarios o
  si no se ejecutó antes la segura. Motivo: `enrollments`, `user_progress`,
  `quiz_attempt_answers`, `user_badges`, `projects`, `course_completion_rules` y
  `lesson_quiz_responses` cuelgan con `ON DELETE CASCADE`.
- Validado en PostgreSQL 17 local aislado con usuarios reales simulados
  (`merito_carga_probe`, 21/21 comprobaciones): carga 3/9/11/11/44 + 9 badges +
  87 ítems de manifiesto, preflight que aborta sin escribir, reejecución
  idempotente, reversión segura sin pérdida de datos, recarga que republica y
  reversión física bloqueada. En `merito_carga_probe_limpia` la reversión física
  deja todo en cero tras la segura. Los cuestionarios se publican con
  `estado_revision = 'publicado'`.
- Compatibilidad con el esquema actual comprobada end-to-end sin la migración
  (base `merito_premigracion`, 13/13): la API arranca, `/courses` y
  `/courses/:id` responden 200 sin `es_correcta`, `progress/lesson` responde 200
  y la calificación segura degrada a `503` con mensaje en español. JSON inválido
  devuelve 400 y la bitácora no registra la contraseña enviada.
- Auditoría de contenido reproducible con `npm run contenido:catalogo`
  (`scripts/auditar-contenido-catalogo.js`): 6 lecciones completas y 5 que
  requieren revisión académica; las 11 tienen 4 opciones, una sola correcta y
  retroalimentación. Hallazgo: la respuesta correcta es la opción **B en las 11
  lecciones**. Detalle y pendientes en `docs/catalogo-contenido-auditoria.md`.
- Mapeo SPA ↔ catálogo comprobado contra la API local: 3/3 cursos y 11/11
  lecciones emparejados por título con un único cuestionario publicado.
- Nada de esto se ejecutó en Production. Procedimiento definitivo, mapa de
  cascada y mitigaciones en `docs/carga-catalogo-production.md` (secciones 7.2
  y 7.3).
- Nota de entorno: este checkout no tiene `.env`; las pruebas requieren
  `DATABASE_URL` y `JWT_SECRET` en el entorno y una base con
  `database/schema.sql`, el seed y
  `database/migrations/20261101_lesson_quiz_responses.sql`. Con eso la suite
  completa queda en 19/19 suites y 129/129 pruebas (`npx jest --maxWorkers=2`).

## Prioridades pendientes

1. ~~Corregir esquema, seed y contratos de autenticación, progreso y perfil.~~ Hecho (2026-09-12).
2. ~~Añadir pruebas mínimas para salud, autenticación, cursos y progreso.~~ Hecho: 4 suites, 19 pruebas.
3. ~~Crear Supabase y conectar PostgreSQL mediante `DATABASE_URL`.~~ Hecho.
4. Implementar el simulacro gratuito sin registro y su calificación en backend.
5. Crear editor, importar y publicar las primeras 50 preguntas desde Word.
6. Consolidar `indexInicial.html` como única SPA: progreso migrado a la API; falta reconciliar el contenido de lecciones y retirar `index.html`/`app.js`.
7. Verificar el despliegue en Vercel (`vercel.json` y `api/index.js` ya preparados) y definir la estrategia de ramas.
