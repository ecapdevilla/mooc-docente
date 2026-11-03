# Guía de agentes - MéritoDocente

## Propósito

Este archivo es el contexto operativo mínimo para agentes de IA que trabajen en el proyecto. Leerlo antes de explorar el repositorio. Mantenerlo actualizado cuando cambien comandos, arquitectura o decisiones importantes.

## Estado verificado

- Plataforma MOOC para preparación de concursos de méritos docentes.
- Backend: Node.js 18+, Express 4, PostgreSQL, JWT y bcryptjs.
- Frontend: HTML, CSS y JavaScript vanilla. Desde la Etapa 1 (2026-11-02) el SPA está modularizado: `indexInicial.html` (30 KB) conserva solo el marcado, `public/styles/app.css` la hoja de estilos y `public/js/**` (16 archivos clásicos) los datos, el núcleo, las vistas y el arranque. Consume la API directamente. Ver `docs/arquitectura-frontend.md`.
- Punto de entrada backend: `src/server.js`. Escucha solo si se ejecuta directamente y exporta la app para uso serverless.
- API base: `/api/v1`.
- Esquema de datos: `database/schema.sql`.
- Datos iniciales: `src/seed/data.sql` y `src/seed/seed.js`, idempotentes. Las opciones de quiz se reconcilian al reejecutar el seed.
- Base de datos de desarrollo: PostgreSQL local definido en `.env` (`meritodocente` en `127.0.0.1:5432`); Supabase (pooler) queda para producción y pruebas remotas. Tras un clon o una base vacía: `npm run db:preparar` y `npm run seed`.
- Pruebas: `tests/` tiene 26 suites y 198 pruebas. Las de interfaz ejecutan el SPA real en jsdom con `tests/spa-dom.js` (resuelve `/js/**` y `/styles/**` desde disco); `tests/spa-modular.test.js` protege el contrato modular de la Etapa 1, `tests/spa-acciones.test.js` el de la delegación de eventos de la T2.1, `tests/spa-ruta.test.js` el del router por hash de la T2.2, `tests/course-assessment.test.js` y `tests/course-assessment-spa.test.js` el del examen final de curso de la T2.4 y `tests/learning-experience.test.js` corre sin base de datos con un doble de la API. `npm test` requiere `DATABASE_URL` y `JWT_SECRET`; si el checkout no trae `.env`, la suite se corre con el PostgreSQL local `merito_test_local` (ver `docs/arquitectura-frontend.md`, sección 8) o con la base de Supabase.
- Servido local: `GET /` entrega `indexInicial.html`; `express.static(public)` sirve `/styles/app.css`, `/js/**` y `diagnosticoPiloto.{js,css}`. Desde la T2.5 (2026-11-02) `indexInicial.html` es la única entrada del frontend.
- Despliegue: `vercel.json` + `api/index.js` (frontend estático + API serverless) en `https://mooc-docente.vercel.app`. Production verificado el 2026-11-02: `/health` reporta el mismo `commit` que el SHA publicado, el HTML estático lleva la CSP declarada en `vercel.json` y `/js/vistas/evaluacion.js` se sirve como `application/javascript`.
- Git: remoto `origin` → `https://github.com/ecapdevilla/mooc-docente.git`. `main` es la rama de producción; `recovery/integracion-20261031` se conserva como histórico. Modelo completo en `docs/estrategia-ramas.md`.
- Deuda menor: el archivo `nulul` en la raíz es un artefacto de shell versionado por error.

## Auditoría de arquitectura (2026-09-10)

La hoja de ruta funcional completa, incluido el simulacro gratuito y la importación de 50 preguntas desde Word, está en `docs/roadmap.md`.

### Arquitectura real

El flujo actual es:

`Frontend -> Express -> rutas con SQL directo -> PostgreSQL`

- `src/server.js` configura Express, seguridad, rate limiting, rutas, `/health` y el arranque condicionado a una conexión válida.
- `src/config/database.js` usa `pg.Pool` y exige `DATABASE_URL`.
- Las consultas están directamente en `src/routes/`; `src/controllers/` y `src/models/` están vacíos.
- `public/js/nucleo/api.js` y `public/js/nucleo/sesion.js` son el cliente de API y la gestión de sesión con `localStorage`.
- ~~`public/api-client.js`, `public/auth.js` y `app.js`~~: retirados en la T2.5 (2026-11-02). No existe una segunda integración que mantener.
- `indexInicial.html` es la SPA documentada: conserva el marcado y los puntos de integración; desde la Etapa 1 carga sus estilos desde `public/styles/app.css` y su lógica desde `public/js/**`.

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
- Calificación en backend: el detalle del curso ya no expone `es_correcta`; el quiz de lección se califica con `POST /api/v1/quizzes/lessons/:lessonId/responses` y el examen final de curso con `GET/POST /api/v1/courses/:id/assessment` (T2.4). El cliente solo envía identificadores y el servidor deriva puntaje, finalización y veredicto.
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
- Resuelto el 2026-11-01: el detalle del curso ya no expone `es_correcta` y el quiz de lección se califica en el backend (`POST /api/v1/quizzes/lessons/:lessonId/responses`); el puntaje y la finalización se derivan de `lesson_quiz_responses`.

### Frontend modular: Etapa 1 (2026-11-02)

- Motivo: `indexInicial.html` era aplicación, hoja de estilos y fuente de datos a la vez (6.700 líneas, 273 KB), con el contenido académico enterrado entre CSS y JavaScript. Antes de ampliar cursos y evaluaciones había que separar responsabilidades sin cambiar comportamiento.
- Resultado: `indexInicial.html` conserva el marcado (575 líneas, 30 KB); `public/styles/app.css` contiene la hoja de estilos (3.072 líneas, 98,6 KB); `public/js/**` contiene 16 archivos clásicos (3.204 líneas, 150 KB): `datos/modulos.js`, `nucleo/{estado,ui,api,sesion,modales}.js`, `admin/{diagnostico-editor,diagnostico-inicio}.js`, `vistas/{acceso,dashboard,quiz-diagnostico,curso-modelo,curso,modulo,leccion}.js` y `principal.js`. La T2.1 añadió `nucleo/acciones.js` (17 archivos, 3.264 líneas) y la T2.2 `nucleo/ruta.js`: hoy son 18 archivos, 3.717 líneas y 166 KB.
- Modelo técnico: scripts clásicos (`<script src>`) sin bundler ni módulos ES. Comparten el ámbito global léxico, así que `MODULES`, `state` y las funciones se resuelven entre archivos sin `import`/`export`; el orden de carga importa y `principal.js` (init) va al final. No se puede usar `type="module"` porque jsdom no ejecuta módulos ES.
- La extracción fue mecánica y verificada: la concatenación de los 16 archivos coincide byte a byte con el bloque `<script>` original y el CSS con el bloque `<style>`. No se reescribió código, marcado, IDs, textos ni `onclick`, y no se tocaron endpoints ni la lógica de progreso.
- Fuente de contenido: `MODULES` vive ahora en `public/js/datos/modulos.js`. `scripts/generar-carga-catalogo.js` y `scripts/auditar-contenido-catalogo.js` leen ese archivo (mismo parser con `vm`), y los cinco SQL de `database/loads/` se regeneraron con la nueva ruta en la cabecera.
- Pruebas: nuevo `tests/spa-dom.js` (cargador jsdom con `ResourceLoader` que sirve `/js/**` y `/styles/**` desde disco y espera a que el SPA exponga `handleRegister`) y nuevo `tests/spa-modular.test.js` (8 pruebas): falla si el HTML vuelve a tener `<style>`/`<script>` en línea, si falta un archivo referenciado, si aparece `export`/`import`/`type="module"`, si el CSS pierde tamaño o identidad visual, si `MODULES` deja de ser consumible, si Express no sirve los recursos, si `vercel.json` deja de enrutarlos antes del catch-all o si la CSP deja de permitir los manejadores en línea que el marcado aún usa.
- Las cinco suites jsdom (`spa-ui`, `learning-experience`, `lesson-quiz-spa`, `admin-pilot-diagnostic-ui`, `ui-design`) se actualizaron para cargar los archivos reales; `ui-design` lee el CSS desde `public/styles/app.css`.
- Servido: Express ya cubría `public/` con `express.static`; `vercel.json` añade `/styles/(.*) -> public/styles/$1` y `/js/(.*) -> public/js/$1` antes del catch-all, con `Cache-Control: public, max-age=0, must-revalidate` porque los nombres no llevan hash.
- CSP alineada (hallazgo preexistente, resuelto en T2.1): Helmet servía `script-src-attr 'none'`, que bloqueaba los 49 `onclick`/`onsubmit` del marcado y dejaba el SPA inerte cuando el HTML sale por Express (local y `vercel dev`); en Production el HTML lo sirve la capa estática de Vercel, por eso no se había detectado. Durante la Etapa 1 se declaró `'unsafe-inline'` como deuda temporal y `tests/spa-modular.test.js` fijó ese contrato. La T2.1 sustituyó los 51 manejadores por `data-action` + delegación, devolvió la directiva a `'none'` e invirtió el contrato de la prueba.
- Validación ejecutada: `node --check` en los 16 archivos; servidor real con `/` 200 (29.929 bytes, enlaza `app.css`), `/styles/app.css` 200 `text/css` (98.634 bytes) y los módulos 200; `npm test` 21/21 suites y 144/144 pruebas; `npm run contenido:catalogo` idéntico al baseline (3 cursos, 9 módulos, 11 lecciones, 11 cuestionarios, 44 opciones, 12.254 caracteres).
- Despliegue de la Etapa 1 verificado (commits `6d17a44` y `ac831c6`, rama `recovery/integracion-20261031`): `GET https://mooc-docente.vercel.app/` 200 con 16 `<script src>`, 0 `<style>` en línea y enlace a `/styles/app.css`; `/styles/app.css` 200 `text/css` con `Cache-Control: public, max-age=0, must-revalidate`; `/js/principal.js`, `/js/datos/modulos.js` y `/js/nucleo/sesion.js` 200 `application/javascript`; `/api/v1/courses` 200 y `/health` 200 con `commit: ac831c6`. El HTML, el CSS y tres módulos servidos tienen el mismo SHA-256 que el repositorio al normalizar CRLF, de modo que publicar no alteró el contenido.
- Referencia completa: `docs/arquitectura-frontend.md` (estructura, orden de carga, flujo de datos, recetas, pruebas, despliegue, límites y evidencia).
- Límites asumidos en esta etapa: ~~no hay router (`hash`/`pushState`)~~ (resuelto en T2.2, ver más abajo) y siguen publicados `index.html`/`app.js` y `diagnosticoPiloto.html`. Etapa 2: retiro del frontend duplicado (la delegación de eventos quedó resuelta en T2.1 y el router en T2.2). Un framework solo se evaluará después, por vista.

### Decisión de producto

`indexInicial.html` es la fuente principal de diseño, contenido y flujo de usuario: no es un archivo descartable, sino el prototipo más completo del producto. Los módulos, lecciones, quizzes, badges y pantallas que hoy funcionan con `localStorage` deben migrarse progresivamente a persistencia real.

`index.html` y `app.js` fueron la integración API provisional y se retiraron en la T2.5 (2026-11-02). No crear interfaces paralelas: todo trabajo nuevo entra por `indexInicial.html` + `public/js/**`.

### API registrada

- Pública: `GET /health`, `GET /api/v1/ping/health`, registro, login, listado y detalle de cursos.
- Autenticada: usuario actual, progreso, completar lección, perfil, actualización de perfil e inscripciones.
- Administrativa: listado de usuarios y actualización de usuarios bajo `/api/v1/admin`.
- Simulacro diagnóstico: ruta protegida para obtener preguntas sin respuestas correctas y ruta protegida para calificar/persistir el intento; el acceso se muestra como submódulo opcional del dashboard.
- Evaluación final por curso: `GET /api/v1/courses/:id/assessment` (preguntas sin clave, umbral, requisitos e historial) y `POST /api/v1/courses/:id/assessment/attempts` (calificación y persistencia), ambas protegidas; contrato en `docs/evaluacion-final-por-curso.md`.

### Bloqueos funcionales: estado

Todos los bloqueos del inventario anterior (1-12) están corregidos: el seed es idempotente y canónico, el progreso usa `req.user.id`, los badges gestionan `rows`, `validateProgress` se aplica a la ruta, el perfil no toca columnas inexistentes, `tests/` tiene suites reales y `public/` se sirve desde Express.

Corregidos además en la sesión del 2026-09-12:

1. `GET /api/v1/courses/:id` fallaba con 500 (`column "qo.orden" must appear in the GROUP BY clause`, código 42803). El `ORDER BY` debe ir dentro de `json_agg(... ORDER BY ...)`.
2. Al reejecutar el seed quedaban opciones de quiz obsoletas y aparecían quizzes con dos respuestas correctas. Ahora el seed reconcilia las opciones de los quizzes sembrados (4 opciones y 1 correcta por quiz).
3. `public/api-client.js` terminaba con `module.exports`, que lanza `ReferenceError` en el navegador; ahora expone `window.api` y mantiene compatibilidad con Node. (El archivo se retiró en la T2.5; queda como registro histórico.)
4. `GET /api/v1/progress` no exponía el detalle por lección; ahora cada módulo incluye `lessons` con `completada`.
5. Al cargar el curso de evaluación, `GET /api/v1/courses` podía cambiar el primer curso por el orden de `creado_en`; ahora el orden es determinista por `id ASC`.

Pendientes reconocidos (no bloquean el desarrollo actual):

- `docs/swagger.yaml` no existe, por lo que `/api-docs` no se monta.
- ~~`index.html` y `app.js` siguen siendo la integración provisional; su retiro está planificado.~~ Retirados en la T2.5 (2026-11-02); `tests/spa-modular.test.js` impide reintroducirlos.
- El contenido del SPA y el del seed no coinciden lección por lección. El mapeo actual es por orden (módulo del prototipo ↔ curso de la API) y la reconciliación de contenido corresponde a la Fase 3.
- ~~El despliegue en Vercel está configurado pero no ejecutado ni verificado.~~ Ejecutado y verificado (2026-11-02); ver `docs/deploy-vercel.md` y `docs/estrategia-ramas.md`.

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

> **Entrada rápida:** `docs/handoff.md` concentra el estado, lo que falta por
> prioridad, lo que requiere decisión humana y las trampas conocidas. Las
> entradas de estado que siguen son el registro cronológico; la vigente es la
> última (T2.4).

Estado (2026-09-16): Supabase conectado y operativo; seed canónico; bloqueos funcionales corregidos; 30 pruebas pasan; `indexInicial.html` registra e inicia sesión contra la API y guarda el progreso en PostgreSQL (con respaldo local si la API no responde); configuración de Vercel preparada pero sin desplegar. Las preguntas avanzadas están cargadas en Supabase mediante el seed. El dashboard ofrece el `Simulacro diagnóstico` como submódulo opcional; al abrirlo, se califica en backend y se guarda el intento.

Estado (2026-11-01): se añadió el recorrido de aprendizaje curso → módulo → lección con el sistema `.lx-` en `indexInicial.html`; las tres vistas consumen módulos, lecciones y progreso reales de la API y declaran como "en preparación" lo que aún no tiene contenido. La suite `tests/learning-experience.test.js` (8 pruebas, sin base de datos) cubre estados, navegación y persistencia simulada. Pendiente de revisión visual en navegador a 1440/768/390 px y de decisión sobre la calificación del quiz de lección en backend.

Estado (2026-11-02): Etapa 1 del frontend completada y verificada. `indexInicial.html` ya no contiene CSS ni JavaScript: enlaza `public/styles/app.css` y carga 16 archivos clásicos de `public/js/**` en orden (datos → núcleo → admin → vistas → arranque). La extracción es byte a byte equivalente al bloque original, las cinco suites jsdom cargan los archivos reales y la nueva suite `tests/spa-modular.test.js` impide que el HTML vuelva a convertirse en aplicación, estilos y datos a la vez. La suite completa queda en 21/21 suites y 144/144 pruebas. `MODULES` se edita ahora en `public/js/datos/modulos.js` y los scripts de catálogo leen ese archivo. Sigue pendiente el examen final por curso, el router por hash y el retiro de `index.html`/`app.js`.

Estado (2026-11-02, T2.1): la interfaz ya no usa manejadores en línea. Los 51 atributos `on*` (27 en el HTML y 24 en plantillas de `vistas/*.js`) se sustituyeron por `data-action` + `data-*`; un único oyente `click`/`submit` en `public/js/nucleo/acciones.js` (15 acciones registradas) los resuelve y aplica `preventDefault()`, equivalente al antiguo `return false`. `src/server.js` volvió a `script-src-attr 'none'` y `tests/spa-acciones.test.js` (9 pruebas, 5 con clics reales en jsdom) fija el contrato. Suite completa: 22/22 suites y 153/153 pruebas. Desplegado y verificado en Production (commit `833e8f6`): `/` sirve 17 scripts y 0 manejadores. Matiz: Vercel sirve `/` y `/js/**` desde su capa estática sin CSP propia; la directiva aplica a las respuestas de Express. Declararla en `vercel.json` para el HTML estático queda como tarea aparte.

Estado (2026-11-02, T2.2): el SPA tiene router por hash. `public/js/nucleo/ruta.js` es el 18.º archivo (431 líneas) y publica `#/`, `#/acceso`, `#/dashboard`, `#/curso/<curso>`, `#/modulo/<curso>[/<módulo>]`, `#/leccion/<curso>/<índice>`, `#/diagnostico` y `#/admin/diagnostico`. `showView` sincroniza la URL con `pushState` al final de cada render, y `hashchange`/`popstate` aplican atrás/adelante sin duplicar la vista. Los enlaces profundos protegidos sin sesión llevan a `#/acceso` con el modal abierto; las rutas inválidas caen al panel (con sesión) o al inicio. `iniciarRuta()` corre cuando `refreshSession()` ya resolvió, así que el enlace profundo encuentra la sesión y el `courseMap`. Suite completa: 23/23 suites y 168/168 pruebas (`tests/spa-ruta.test.js`, 15 pruebas, incluida `history.back()` real). Servidor real en 3107: `/` 200 con 18 scripts, 0 manejadores `on*` y `/js/nucleo/ruta.js` 200 `application/javascript`. Desplegado y verificado en Production (código en `fe7770c`; los commits posteriores solo tocan documentación): `/` sirve 18 scripts y 0 manejadores, `/js/nucleo/ruta.js` 200 `application/javascript` y el HTML, `ruta.js` y `principal.js` coinciden por SHA-256 al normalizar CRLF.

Estado (2026-11-02, T2.4): el examen final de curso tiene contrato de backend y vista en el SPA. `GET /api/v1/courses/:id/assessment` publica las preguntas del curso sin clave, el umbral vigente, los requisitos de lecciones y los últimos cinco intentos; `POST /api/v1/courses/:id/assessment/attempts` califica en el servidor, aplica el umbral (`COURSE_ASSESSMENT_PASSING_SCORE`, 80 % por defecto), persiste el intento en `quiz_attempts` con `curso_id`, `alcance = 'evaluacion_curso'` y `aprobado`, y devuelve desempeño por lección y áreas prioritarias. La migración `20261102_course_assessment.sql` es aditiva e idempotente; mientras no esté aplicada, ambos endpoints responden `503`. En el cliente, el botón `Evaluación final` del héroe del curso abre `#/evaluacion/<curso>` (`public/js/vistas/evaluacion.js`): una pregunta por pantalla, envío único de `{ questionId, optionId }`, resultado y retroalimentación tomados del servidor y `403` de requisitos pintado con el avance real. Suite completa: 26/26 suites y 196/196 pruebas. `tests/course-assessment-spa.test.js` cubre la vista; la migración no está aplicada en Production.

Estado (2026-11-02, T2.5 + CSP estática + despliegue verificado): `indexInicial.html` es la única entrada del frontend. Se retiraron `index.html`, `app.js`, `public/api-client.js` y `public/auth.js`, junto con sus rutas en `src/server.js` y `vercel.json`; `tests/spa-modular.test.js` suma dos guardas (los archivos no existen ni se publican, y la CSP del HTML estático coincide carácter a carácter con la de Express). `vercel.json` declara `Content-Security-Policy` para `/` y `/indexInicial.html` con los mismos valores que Helmet (`script-src 'self'`, `script-src-attr 'none'`, `object-src 'none'`, `style-src 'self' https: 'unsafe-inline'`), más `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`: Production ya no entrega el HTML sin CSP. Font Awesome (cdnjs) y Google Fonts siguen permitidos por `style-src`/`font-src https:`. Despliegue verificado en `https://mooc-docente.vercel.app`: `/health` reporta el SHA publicado, `/` responde 200 con 19 `<script src>` y la cabecera CSP, `/js/vistas/evaluacion.js` 200 `application/javascript`, `/styles/app.css` 200 `text/css` y `/api/v1/courses` 200. Estrategia de ramas y de publicación en `docs/estrategia-ramas.md`.

Siguiente acción concreta: cerrar las decisiones P1 (umbral, requisito de lecciones, insignia al aprobar) y cargar el banco verificado del curso #1; después, el simulacro gratuito sin registro y el editor/importador de preguntas. Requiere a la persona: cambiar la rama por defecto de GitHub y la *Production Branch* de Vercel a `main`, y aplicar `20261102_course_assessment.sql` en Supabase.

## Comandos

```bash
npm install
npm run dev       # nodemon src/server.js
npm start         # node src/server.js
npm run seed      # idempotente; requiere PostgreSQL y variables de entorno
npm run db:preparar # idempotente; esquema + migraciones versionadas en la base de DATABASE_URL
npm test          # 26 suites / 198 pruebas; requieren DATABASE_URL y JWT_SECRET (base local o Supabase)
```

Requisitos de ejecución: Node.js >= 18, PostgreSQL >= 14 y `DATABASE_URL` + `JWT_SECRET` (en `.env` o como variables de entorno; el patrón está en `.env.example`). El servidor verifica la conexión a la base de datos antes de escuchar en el puerto. Con `npm run dev`, el SPA está en `http://localhost:3000/` y la API en `http://localhost:3000/api/v1`. Para reproducir el enrutado de Vercel en local: `npx vercel dev`. Si la base de `.env` está vacía, `npm test` falla en las suites de API y UI: `npm run db:preparar` y `npm run seed` la dejan lista. Para correr la suite sin tocar Supabase, usar el PostgreSQL local `merito_test_local` documentado en `docs/arquitectura-frontend.md` (sección 8).

## Mapa rápido

- `src/routes/`: definición de endpoints y middleware asociado.
- `src/controllers/`: manejo de solicitudes y respuestas.
- `src/models/`: consultas y acceso a datos.
- `src/services/`: lógica de negocio reutilizable.
- `src/middleware/auth.js`: autenticación y autorización.
- `src/utils/validators.js`: validación de entradas.
- `indexInicial.html`: SPA principal: marcado de vistas, IDs y orden de carga de los módulos.
- `public/styles/app.css`: hoja de estilos única del SPA (tokens y componentes `.lx-`).
- `public/js/datos/modulos.js`: `const MODULES`, fuente del catálogo, las lecciones y los quizzes del frontend.
- `public/js/nucleo/`: estado, vista/navbar, cliente de API, sesión y progreso, modales, `acciones.js` (registro `data-action` + oyente delegado) y `ruta.js` (router por hash).
- `public/js/vistas/`: una vista por archivo (acceso, dashboard, curso, módulo, lección, evaluación final, simulacro).
- `public/js/admin/`: editor administrativo del diagnóstico piloto.
- `public/js/principal.js`: `init()` del SPA; se carga al final.
- `tests/spa-dom.js`: cargador jsdom del SPA modular (sirve `/js/**` y `/styles/**` desde disco).
- `tests/spa-modular.test.js`: guardián del contrato de la Etapa 1.
- `tests/spa-ruta.test.js`: guardián del router por hash (T2.2): rutas, redirecciones y navegación real en jsdom.
- `tests/course-assessment-spa.test.js`: guardián de la vista del examen final (T2.4) en jsdom.
- `docs/handoff.md`: estado actual, pendientes por prioridad, tareas humanas y trampas conocidas. Empezar por aquí al retomar.
- `docs/estrategia-ramas.md`: modelo de ramas (`main` = producción), ciclo de PR/despliegue, tags, reversión y estado de la migración en GitHub/Vercel.
- `docs/arquitectura-frontend.md`: estructura, orden de carga, flujo de datos, recetas, pruebas y despliegue del frontend.
- `docs/inventario-academico-tres-cursos.md`: inventario A/B/C, contrato de la API, correspondencia SPA↔BD y modelo de presentación de curso, módulo y lección.
- `tests/learning-experience.test.js`: integración sin base de datos del recorrido curso → módulo → lección con un doble de la API.
- `public/`: recursos estáticos del SPA y de la página piloto: `js/**`, `styles/app.css`, `diagnosticoPiloto.{js,css}`. Sin cliente HTTP alternativo desde la T2.5.
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
- Mantener compatibilidad con las respuestas que consumen `indexInicial.html` y `public/js/nucleo/api.js`.
- Preguntas iniciales: guardar en PostgreSQL/Supabase mediante `quizzes` y `quiz_options`; no hardcodearlas en el HTML. La fuente del frontend es `public/js/datos/modulos.js`; para la primera carga se usa el seed y el editor/importador queda para la gestión posterior.
- Frontend modular (Etapa 1): no introducir `<style>` ni `<script>` con lógica en línea en `indexInicial.html`; los estilos van a `public/styles/app.css` y el código a `public/js/**` como scripts clásicos. El orden de carga importa y `principal.js` va al final. No usar `type="module"` (jsdom no ejecuta módulos ES) ni redeclarar nombres entre archivos (comparten ámbito global).
- Contenido del catálogo: `MODULES` se edita en `public/js/datos/modulos.js`; después se ejecutan `npm run contenido:catalogo` y `npm run carga:catalogo` para auditar y regenerar `database/loads/`. `tests/spa-modular.test.js` debe pasar.
- CSP: `src/server.js` sirve `script-src 'self'` y `script-src-attr 'none'`. El marcado no admite atributos `on*`: cada control declara `data-action` y su entrada en `public/js/nucleo/acciones.js`; el oyente delegado aplica `preventDefault()` y lee los parámetros de `data-*`. No añadir `<script>` en línea ni `eval`/`new Function` (las suites lo impiden).
- Router por hash (T2.2): las URLs son `#/`, `#/acceso`, `#/dashboard`, `#/curso/<curso>`, `#/modulo/<curso>[/<módulo>]`, `#/leccion/<curso>/<índice>`, `#/evaluacion/<curso>`, `#/diagnostico` y `#/admin/diagnostico`. `showView` es el único punto que sincroniza la URL (con `pushState`); `hashchange`/`popstate` aplican atrás/adelante con `replaceState` durante la aplicación. Los alias `#/modulo/<id API>` y `#/leccion/<id API>` se resuelven con `state.courseMap` y se canonizan. Una vista nueva debe declarar su ruta en `nucleo/ruta.js` y quedar cubierta por `tests/spa-ruta.test.js`.
- Evaluación final por curso (T2.4): `GET /api/v1/courses/:id/assessment` publica preguntas sin clave y `POST …/assessment/attempts` califica en el servidor. El cliente envía solo `{ answers: [{ questionId, optionId }] }` y nunca calcula puntaje ni aprobación; el `403` de requisitos trae `requisitos` en el cuerpo y se lee desde `error.data`. Detalle en `docs/evaluacion-final-por-curso.md`.
- Mapeo SPA ↔ API: `public/js/datos/modulos.js` aporta los módulos del prototipo y `nucleo/sesion.js` (`loadCourseMap`) los empareja con cada curso por título, resuelve las lecciones por orden (`modulos[].lecciones[]`) y guarda cada lección completada con `POST /api/v1/progress/lesson/:id`. `GET /api/v1/progress` entrega, por módulo, `lessons` con `completada`.
- Origen de la API en el SPA: `window.MERITO_API_BASE` si está definido; si no, `origen actual + /api/v1`; si no, `http://localhost:3000/api/v1` (apertura con `file://`). Si la API no responde, el SPA degrada a modo local y avisa al usuario.
- Claves de `localStorage` compartidas: `auth_token` y `user`.
- Antes de cambiar un endpoint, revisar su ruta, controlador/modelo y llamada del frontend inmediata; no explorar todo el repositorio sin necesidad.

## Protocolo de trabajo para agentes

1. Leer `docs/handoff.md` (estado y pendientes) y este archivo, más el archivo directamente relacionado con la tarea.
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

El agente siguiente debe comenzar por `Siguiente acción concreta` y solo ampliar la exploración si la validación lo exige. Al cerrar una sesión, reflejar el resultado en `docs/handoff.md` (secciones 1 a 3) para que el relevo no dependa del historial de chat.

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
- Production ya está al día con `42c9160`: `POST /api/v1/auth/login` con JSON
  roto responde `400 "JSON inválido en el cuerpo de la solicitud"`,
  `GET /api/v1/courses` incluye `meta`, las credenciales inválidas dan `401`, las
  rutas protegidas sin token dan `401` y el diagnóstico piloto sigue sirviendo
  50 preguntas. Verificación repetible en `docs/login-500-production-20261101.md`.
- Pruebas nuevas: `tests/errores-http.test.js` (5 casos: 400 en login y en ruta
  inexistente con JSON roto, log sin cuerpo ni contraseña, 404 sin cuerpo y 401
  con credenciales inválidas), `tests/http-errors.test.js` (8 casos del
  clasificador) y `tests/vercel-entry.test.js` (4 casos del punto de entrada
  serverless: `/health`, `/api/v1`, ruta sin prefijo y JSON roto). En local el
  error llega como `entity.parse.failed`; en Vercel llega como 400 sin marcas,
  así que `src/server.js` marca `req.cuerpoJsonInvalido` al envolver
  `express.json()`, `src/utils/httpErrors.js` trata el 400 de una petición JSON
  como cuerpo inválido y el resto de formas queda cubierto por sus pruebas.
- Marcador de despliegue: `GET /api/v1` y `GET /health` devuelven `commit` (SHA
  corto de `VERCEL_GIT_COMMIT_SHA`, o `local` en desarrollo), para verificar qué
  versión está en línea sin abrir el panel de Vercel. En Vercel solo `/api/*` y
  `/health` llegan a la función (`vercel.json`); `api/index.js` no normaliza
  `/health` porque vive fuera de `/api/v1`.
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
- Nota de entorno: la base de `.env` (`meritodocente` en `127.0.0.1:5432`) debe
  tener `database/schema.sql`, las migraciones versionadas y el seed; en una base
  vacía basta `npm run db:preparar` seguido de `npm run seed` (el script es
  idempotente y omite las migraciones del editor piloto, cuyas tablas base solo
  existen en Supabase). Con eso la suite completa queda en 26/26 suites y 196/196
  pruebas (`npx jest --maxWorkers=2`). Validado el 2026-11-02 sobre `postgres:15`
  en Docker (puerto 5433) con una base desechable; el procedimiento está en
  `docs/arquitectura-frontend.md` (sección 8).

## Prioridades pendientes

1. ~~Corregir esquema, seed y contratos de autenticación, progreso y perfil.~~ Hecho (2026-09-12).
2. ~~Añadir pruebas mínimas para salud, autenticación, cursos y progreso.~~ Hecho: 4 suites, 19 pruebas.
3. ~~Crear Supabase y conectar PostgreSQL mediante `DATABASE_URL`.~~ Hecho.
4. Implementar el simulacro gratuito sin registro y su calificación en backend.
5. Crear editor, importar y publicar las primeras 50 preguntas desde Word.
6. ~~Consolidar `indexInicial.html` como única SPA.~~ Etapa 1 hecha (2026-11-02): HTML solo con marcado, CSS en `public/styles/app.css`, lógica en `public/js/**` y guardián `tests/spa-modular.test.js`. T2.1 hecha: delegación de eventos (`data-action`) y CSP `script-src-attr 'none'`, con guardián `tests/spa-acciones.test.js`. T2.2 hecha: router por hash con URLs compartibles, botón atrás y enlaces profundos, con guardián `tests/spa-ruta.test.js`. T2.3 hecha: calificación del quiz de lección en backend (`POST /api/v1/quizzes/lessons/:lessonId/responses`). T2.4 hecha: examen final por curso (`GET/POST /api/v1/courses/:id/assessment`) con umbral configurable, persistencia y vista `#/evaluacion/<curso>` en el SPA. T2.5 hecha (2026-11-02): retirados `index.html`, `app.js`, `public/api-client.js` y `public/auth.js`, con dos guardas nuevas en `tests/spa-modular.test.js` (archivos inexistentes/no publicados y CSP estática igual a la de Express).
7. ~~Verificar el despliegue en Vercel (`vercel.json` y `api/index.js` ya preparados, ahora con rutas `/js/**` y `/styles/**`) y definir la estrategia de ramas.~~ Hecho (2026-11-02): `/health` en `https://mooc-docente.vercel.app` reporta el SHA publicado, `/` lleva CSP y sirve los 19 módulos, `/js/vistas/evaluacion.js` y `/styles/app.css` responden 200 y `/api/v1/courses` 200. Estrategia de ramas documentada en `docs/estrategia-ramas.md`; faltan los tres pasos de panel (rama por defecto, protección y *Production Branch* en `main`).
8. ~~Construir la evaluación final por curso (`GET/POST /api/v1/courses/:id/assessment`) con umbral de aprobación y persistencia del intento.~~ Hecho (T2.4): umbral configurable (80 % por defecto), requisito opcional de lecciones, persistencia en `quiz_attempts` con `alcance` y vista `#/evaluacion/<curso>` cubierta por `tests/course-assessment-spa.test.js`. Falta el banco verificado del curso #1.
