# Handoff — estado y siguientes pasos

**Actualizado:** 2026-11-06 (verificación de puesta al día: repo, docs y producción sin desfases; suite 26/26 y 198/198 en verde)
**Rama de producción:** `main` (histórico publicado durante la reconstrucción: `recovery/integracion-20261031`)
**Suites:** 27/27 suites y 202/202 pruebas en verde (`npx jest --maxWorkers=2`)
**Base de desarrollo:** PostgreSQL local `meritodocente` (`127.0.0.1:5432`) preparada
con `npm run db:preparar` + `npm run seed`. Supabase = producción, con el catálogo
de 3 cursos cargado el 2026-11-03 (§2 ter).

Este documento es el punto de entrada para retomar el trabajo, sea la misma
persona o un agente distinto. `AGENTS.md` sigue siendo el contexto operativo
(contratos, comandos, protocolo); aquí está **qué falta y en qué orden**.

## 0. Empezar aquí (estado al 2026-11-03)

**Producción ya funciona con contenido real.** `https://mooc-docente.vercel.app`
sirve 3 cursos desde Supabase (`GET /api/v1/courses` → `totalCursos: 3`), los 11
quizzes están `publicado` con 4 opciones y 1 correcta, y el mapeo SPA ↔ API por
título es 11/11 (detalle en §2 ter). Lo único pendiente de commit es este
documento y la entrada de estado de `AGENTS.md`.

**Verificación 2026-11-06 (sin cambios de código):** `main` local =
`origin/main` = `6afd474` (origin/recovery quedó en `4525786`); Production
sirve `6afd474` tras el despliegue manual de hoy (`vercel --prod`), con
`/api/v1/courses` → 3 cursos, HTML con CSP, 19 scripts y
`/js/vistas/evaluacion.js` como `application/javascript`; suite local 26/26
suites y 198/198 pruebas. Conteos reales medidos sobre el proyecto: 19
`<script src>` ↔ 19 archivos JS en `public/js/**` (3.927 líneas, 193 KB),
`indexInicial.html` de 532 líneas y `app.css` de 2.905 líneas (102 KB). El
archivo `nulul` ya no existe (eliminado en `5e0c2e0`). La tarea #1 quedó
cerrada: migración `20261106_lessons_descripcion.sql` creada y registrada en
`scripts/preparar-base-local.js`; la tarea de panel quedó con rama por defecto
`main` (hecho), protección mínima de `main` (hecha) y `main` publicado en
Production. En la misma sesión se aplicó un pulido de apariencia (selección,
feedback táctil en botones, `text-wrap: balance`, scrollbar sutil) documentado
en `docs/diseno-visual.md`, y se registraron las decisiones P1/P2 en
`docs/decisiones-producto.md`; la suite completa queda en 27/27 y 202/202.
En paralelo se ejecutaron dos sprints con fronteras de archivos disjuntas (ver
`docs/sprints-paralelos.md`): la insignia de curso al aprobar (backend, Sprint
A) y el pulido visual/accesibilidad de la vista de evaluación final (frontend,
Sprint B).

### Orden propuesto para la próxima sesión

| # | Tarea | Por qué en ese orden | Coste |
| --- | --- | --- | --- |
| 1 | ~~Versionar el `ALTER` de `lessons.descripcion` como migración~~ | **Hecho el 2026-11-06**: `20261106_lessons_descripcion.sql` | — |
| 2 | Decidir P1: umbral, requisito de lecciones, insignia | Es criterio, no código; define qué ve quien aprueba | una línea cada una |
| 3 | Contenido real del curso `Fundamentos de Pedagogía y Didáctica` (id 2) desde el PDF | Es el curso con menos banco (3 preguntas) y el que tienes documentado | sesión completa |
| 4 | Simulacro gratuito sin registro (backend) | Prioridad 4 de `AGENTS.md` | sesión completa |
| 5 | Editor/importador de preguntas desde Word | Prioridad 5; deja de depender del seed | sesión completa |

No empezar por 4 ni 5 sin cerrar 1 y 2: son minutos y desbloquean al resto.

### Qué conviene que prepares tú (ahorra tokens y contexto)

El PDF grande del curso no hace falta que lo lea ni que lo pegues en el chat: con
un bloque estructurado se carga directo. Por cada pregunta, estos campos:

```text
LECCION: <título exacto de una lección que ya exista, o "NUEVA: <título>">
PREGUNTA: <enunciado>
A) ...
B) ...
C) ...
D) ...
CORRECTA: <A|B|C|D>
EXPLICACION_CORRECTA: <por qué está bien>
EXPLICACION_INCORRECTA: <por qué fallan las otras tres>
AREA: <área del curso>
FUENTE: <norma, página del PDF o autor>
```

- Con 5–10 preguntas por bloque hay material para una sesión; no hace falta todo.
- Lecciones que ya existen en el curso id 2 (los títulos deben coincidir para que
  el progreso del SPA se sincronice):
  `¿Qué es la Pedagogía?`, `Estrategias didácticas para el aula` (módulo
  `Fundamentos de Pedagogía`) y `Corrientes pedagógicas contemporáneas` (módulo
  `Corrientes Pedagógicas`). Si una pregunta no encaja, se crea lección nueva.
- Con eso escribo el `INSERT` idempotente, reconcilio `quiz_options` y ejecuto
  `npm run seed` o la carga, sin volver a procesar el PDF.
- Si prefieres, deja el PDF en `docs/fuentes/` y lo extraigo con un script
  (`pdftotext`); cuesta menos que pegarlo, pero igual hay que revisar el
  resultado pregunta por pregunta.

## 1. Lo último que se hizo (T2.4, cerrada)

> Lo más reciente **no** es la T2.4: ver §2 ter (P4.1/P4.2 ejecutados en Supabase
> el 2026-11-03).

Evaluación final por curso, de punta a punta:

| Capa | Archivo | Qué aporta |
| --- | --- | --- |
| BD | `database/migrations/20261102_course_assessment.sql` | `curso_id`, `alcance` y `aprobado` en `quiz_attempts`; aditiva e idempotente |
| Servicio | `src/services/courseAssessment.js` | Banco del curso sin clave, umbral (`COURSE_ASSESSMENT_PASSING_SCORE`, 80 % por defecto), requisitos de lecciones, veredicto |
| Rutas | `src/routes/courses.js` | `GET /api/v1/courses/:id/assessment`, `POST …/assessment/attempts` |
| SPA | `public/js/vistas/evaluacion.js` | `#/evaluacion/<curso>`: una pregunta por pantalla, envío único, resultado del servidor |
| Vistas | `public/js/vistas/curso.js`, `indexInicial.html` | Botón `Evaluación final` y contenedor `#view-assessment` |
| Núcleo | `acciones.js`, `ruta.js`, `ui.js`, `api.js` | Acciones, ruta, ocultado de vista y `error.data` para el `403` de requisitos |
| Estilos | `public/styles/app.css` | Bloque `.assessment-*` |
| Pruebas | `tests/course-assessment.test.js` (20), `course-assessment-db.test.js` (5), `course-assessment-spa.test.js` (3) | Contrato, persistencia real y vista en jsdom |

Regla que no se debe romper: **el navegador nunca calcula puntaje ni aprobación**.
Envía `{ answers: [{ questionId, optionId }] }` y muestra lo que responde el
servidor. Detalle completo en `docs/evaluacion-final-por-curso.md`.

## 2. Qué está publicado

La T2.4 y la T2.5 están cerradas y publicadas. `git status` debe quedar limpio
salvo este documento cuando se está cerrando una sesión.

| Commit | Contenido |
| --- | --- |
| `be8b1c8` | T2.4: evaluación final por curso + `db:preparar` |
| `9da930d` | `.env.example`: variables del examen final |
| `5d6a811` | T2.5: frontend único + CSP + `docs/estrategia-ramas.md` |
| `db45957` | CSP por ruta (el arreglo `headers` de nivel superior no se aplicaba) |
| `6d3b3da` | Limpieza: cabeceras solo por ruta, sin arreglo ignorado |
| `3e88b78`, `6195bcc` | Evidencia del despliegue y aclaración de ramas/tag |

`main` y `recovery/integracion-20261031` avanzan juntos; el tag anotado `v0.2.0`
apunta al commit verificado `6195bcc`. El despliegue de Vercel es **manual**
(`vercel --prod`, proyecto `sourceless`), no por auto-deploy desde una rama (ver
`docs/estrategia-ramas.md`, sección 6).

El commit de la T2.5 toca: `vercel.json`, `src/server.js`, `tests/spa-modular.test.js`,
`tests/spa-dom.js`, `AGENTS.md`, `README.md`, `docs/arquitectura-frontend.md`,
`docs/architecture.md`, `docs/deploy-vercel.md`, `docs/proyecto.md`,
`docs/roadmap.md` y `docs/estrategia-ramas.md` (nuevo), además de los cuatro
archivos borrados.

## 2 bis. Despliegue verificado (2026-11-02)

| Comprobación | Resultado |
| --- | --- |
| `GET https://mooc-docente.vercel.app/health` | `{"status":"ok",...,"commit":"6d3b3da"}` |
| `GET /` | 200, 19 `<script src>`, `#view-assessment`, CSP + `nosniff` + `no-referrer` |
| `GET /indexInicial.html` | 200 con la misma CSP (ruta catch-all) |
| `GET /js/vistas/evaluacion.js` | 200 `application/javascript` (24.015 bytes) |
| `GET /styles/app.css` | 200 `text/css` |
| `GET /api/v1/courses` | 200 `application/json` |
| `GET /api/v1/courses/1/assessment` | 401 (ruta publicada y protegida) |
| `GET /diagnostico-piloto` | `Cache-Control: no-store` |

La CSP del HTML estático se detalla en `docs/deploy-vercel.md`, sección 7. Ojo:
con `builds` + `routes` el arreglo `headers` de nivel superior se ignora; las
cabeceras van dentro de cada ruta.

## 2 ter. P4.1 y P4.2 ejecutados en Supabase (2026-11-03)

**Resultado: hecho.** Migración aplicada y catálogo de 3 cursos cargado en
producción. `/api/v1/courses` pasó de `totalCursos: 0` a **`3`**, sin cambios de
código.

### Credenciales (nota de seguridad)

La cadena de Supabase se pegó en `.gitignore`, que **sí está versionado**: se
habría publicado en el repo. Se movió a `.env.produccion`
(`DATABASE_URL_PRODUCCION=...`), excluido por `.gitignore:6` (`.env.*`), y
`.gitignore` volvió a `HEAD` (`git diff` vacío). **Recomendado rotar la
contraseña de la base**: quedó escrita en el chat.

### Comandos ejecutados

```powershell
$raw=(Get-Content .env.produccion -Raw).Trim(); $u=$raw.Substring($raw.IndexOf('=')+1)
psql $u -v ON_ERROR_STOP=1 -f database/migrations/20261102_course_assessment.sql
psql $u -v ON_ERROR_STOP=1 -f database/loads/20261101_carga_catalogo_tres_cursos.sql
```

### Cronología de lo que pasó en producción

1. **Migración:** `EXIT=0`. Añadió `quiz_attempts.curso_id`, `alcance`,
   `aprobado`, el `CHECK` y el índice parcial.
2. **Primer intento de carga: `ERROR: column "descripcion" of relation "lessons"
   does not exist`.** El script es transaccional: **no escribió nada**.
   Causa: el esquema de Supabase nació de una versión anterior de
   `database/schema.sql`; la columna está en el repo (línea 52) pero **ninguna
   migración la añadía**, así que `npm run db:preparar` nunca la crea en bases
   ya existentes.
3. **Arreglo:** `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS descripcion TEXT;`
   (aditivo, idéntico a `schema.sql:52`, sobre una tabla con 0 filas).
4. **Reintento de la carga:** `EXIT=0` y verificación propia
   `3 cursos, 9 módulos, 11 lecciones, 11 cuestionarios y 44 opciones
   consistentes`.

### Estado verificado en producción

| Comprobación | Resultado |
| --- | --- |
| `GET /api/v1/courses` | `{"meta":{"totalCursos":3,"cursosActivos":3}}` |
| Cursos (ids 2, 3, 4) | Fundamentos (2 módulos / 3 lecciones), Legislación (1 / 2), IA (6 / 6); los tres activos |
| Quizzes | 11, todos `estado_revision = publicado`, con 4 opciones y 1 correcta cada uno |
| `GET /api/v1/diagnostico-piloto/info` | `200`, el simulacro quedó intacto |
| Mapeo SPA ↔ API por título | **11/11 lecciones emparejadas 1 a 1** |
| Preguntas de `Evaluación final` | curso 2 → 3, curso 3 → 2, curso 4 → 6 (no habrá `409`) |

### Lo que queda

1. ~~**Versionar el `ALTER` de `lessons.descripcion`** como migración
   (`database/migrations/20261103_*.sql`).~~ **Hecho el 2026-11-06**: se creó
   `database/migrations/20261106_lessons_descripcion.sql` y se registró en
   `scripts/preparar-base-local.js`; validado con `db:preparar` + `seed` + suite.
2. **Verificación visual** (necesita sesión: el mapa de cursos se construye al
   iniciar sesión; hay 2 usuarios en producción): abrir un curso y comprobar que
   el chip pasa a **"Progreso sincronizado"** y que `Evaluación final` abre con
   preguntas.
3. **`npm run diagnostico:catalogo` falla desde esta máquina** contra Supabase:
   `self-signed certificate in certificate chain`. `src/config/database.js` usa
   `rejectUnauthorized: true` y Node no confía en la cadena del pooler; en Vercel
   sí funciona. Para correrlo en local hace falta `DB_SSL_CA` (o
   `NODE_EXTRA_CA_CERTS`) con la CA de Supabase. No se tocó código por esto.
4. Nada más: `git status` solo muestra `docs/handoff.md`.

### Validación previa (base desechable, eliminada)

Antes de tocar producción se probó todo en `meritodocente_preflight`, ya
borrada; no se modificó `meritodocente`.

| Script | Resultado |
| --- | --- |
| `database/schema.sql` | OK |
| `database/migrations/20261102_course_assessment.sql` | `EXIT=0`, `COMMIT` |
| `database/loads/20261101_carga_catalogo_tres_cursos.sql` | `EXIT=0`, `COMMIT`, verificación propia: `3 cursos, 9 módulos, 11 lecciones, 11 cuestionarios y 44 opciones consistentes` |

Estado final de la base de prueba: `courses` con 3 filas, todas activas
(1 Fundamentos de Pedagogía y Didáctica, 2 Legislación Educativa Colombiana,
3 Inteligencia Artificial para Docentes) y los ids del seed no interfieren
porque el SPA empareja por título.

La migración deja en `quiz_attempts`: `curso_id INTEGER REFERENCES courses(id)
ON DELETE CASCADE`, `alcance VARCHAR(20) NOT NULL DEFAULT 'diagnostico'`,
`aprobado BOOLEAN`, el `CHECK (alcance IN ('diagnostico','evaluacion_curso'))`
y el índice parcial `idx_quiz_attempts_usuario_curso`. Es idempotente
(`IF NOT EXISTS`): si ya estuviera aplicada, no cambia nada.

El `schema.sql` canónico **ya incluye** esas tres columnas; en una base nueva la
migración solo emite `NOTICE ... ya existe`. En Supabase el esquema era anterior
y las creó (verificado).

La carga crea `catalog_load_items` para auditar el lote y revertirlo sin tocar
datos previos; su preflight aborta sin escribir si hubiera títulos duplicados
en el catálogo destino.

## 3. Pendiente, en orden

### P1 — Necesita decisión de producto (no de código)

1. **Umbral definitivo.** Hoy `COURSE_ASSESSMENT_PASSING_SCORE` cae en 80 %.
   Definir si 80 % es el criterio oficial por curso o si varía; si cambia, es
   variable de entorno y no requiere tocar código.
2. **Requisito de lecciones.** `COURSE_ASSESSMENT_REQUIRES_LESSONS=true` exige
   completar las lecciones antes de presentar (por defecto está apagado).
   Confirmar el valor que verá el usuario real.
3. **Insignia/curso aprobado.** Hoy el examen no otorga insignia. Decidir si
   aprobar el examen final marca el curso como aprobado en el dashboard y cómo se
   ve.

### P2 — Contenido (bloquea habilitar la evaluación en producción)

4. **Banco verificado del curso #1.** El examen publica las preguntas del curso
   que estén activas; falta revisión académica pregunta por pregunta. Sin banco,
   `GET /assessment` responde `409` y la vista muestra ese mensaje tal cual; con
   el banco a medias el resultado sale con áreas prioritarias poco fiables.
   Insumos: `docs/inventario-academico-tres-cursos.md`,
   `docs/catalogo-contenido-auditoria.md`, `docs/banco-diagnostico-concurso-2026-2027.md`.
5. **Reconciliar contenido SPA ↔ BD** (lecciones del prototipo vs cursos del
   seed). Afecta a `porLeccion` y a las áreas prioritarias del resultado.

### P3 — Código

6. **Revisión visual en navegador** de la vista nueva a 1440 / 768 / 390 px
   (`npm run dev`, entrar a un curso → `Evaluación final`). Las pruebas jsdom
   validan contrato, no píxeles.
7. ~~**T2.5: frontend único.** Retirar `index.html` y `app.js`, dejando
   `indexInicial.html` como única entrada (revisar `vercel.json` y `public/`).~~
   Hecho el 2026-11-02: también se retiraron `public/api-client.js` y
   `public/auth.js`, con dos guardas en `tests/spa-modular.test.js`.
8. ~~**CSP en `vercel.json`** para el HTML que sirve la capa estática (hoy la
   directiva `script-src-attr 'none'` solo viaja en las respuestas de Express).~~
   Hecho el 2026-11-02; se compara con la cabecera de Express en la suite. Detalle
   en `docs/deploy-vercel.md`, sección 7.
9. **Simulacro gratuito sin registro** y su calificación en backend
   (prioridad 4 de `AGENTS.md`).
10. **Editor/importador de preguntas** desde Word para dejar de depender del seed
    (prioridad 5 de `AGENTS.md`).

### P4 — Despliegue (requiere credenciales del humano)

11. ~~**P4.1 + P4.2 en Supabase.**~~ **Hecho el 2026-11-03** (§2 ter): migración
    del examen final aplicada y catálogo de 3 cursos cargado; `/api/v1/courses`
    devuelve `totalCursos: 3`, las 11 lecciones del SPA mapean 1 a 1 y
    `Evaluación final` ya encuentra preguntas. El `ALTER` de
    `lessons.descripcion` se versionó como migración el 2026-11-06
    (`20261106_lessons_descripcion.sql`).
12. ~~Verificar el despliegue en Vercel y la estrategia de ramas
    (`docs/deploy-vercel.md`).~~ Verificado el 2026-11-02 (tabla §2 bis) y
    estrategia definida en `docs/estrategia-ramas.md`. Estado de los tres pasos de
    panel (2026-11-06): rama por defecto `main` en GitHub **hecho**, protección
    mínima de `main` **hecha** (sin force-push ni borrado) y *Production Branch*
    de Vercel en `main` **pendiente** (cosmético: el proyecto es `sourceless`,
    despliegue manual).

## 4. Lo que le toca a la persona (no al agente)

| Tema | Por qué es tuyo | Dónde queda |
| --- | --- | --- |
| Revisar y firmar el diff | Cambia contrato de UI y añade un script | `git status` / `git diff` |
| Commit y push | No se hacen commits automáticos | Rama `main` |
| **Rotar la contraseña de Supabase** | La cadena se pegó en el chat el 2026-11-03 | Panel de Supabase → Database → Reset password, luego actualizar `.env.produccion` y la variable de Vercel |
| Decidir umbral, requisito e insignia | Es criterio académico y comercial | P1 arriba |
| Validar el banco del curso #1 | Requiere criterio docente | P2 arriba |
| **Preparar las preguntas del PDF** | Es contenido académico, no código | Plantilla en §0 |
| Verificar en el navegador de producción | Aquí no hay navegador real | Iniciar sesión en `https://mooc-docente.vercel.app` y confirmar chip "Progreso sincronizado" + `Evaluación final` con preguntas |
| Credenciales Supabase y Vercel | Son secretos: nunca en el repo | `.env.produccion` (ignorado) / panel de Vercel |
| Abrir la vista en local | Aquí no hay navegador real | `npm run dev` → `http://localhost:3000/` |

## 5. Cómo retomar en cinco comandos

```bash
cd c:/Users/capde/mooc-docente-cursos-eval
npm install
npm run db:preparar     # idempotente; solo si la base está vacía o cambió una migración
npm run seed            # idempotente
npx jest --maxWorkers=2 # debe dar 26/26 suites y 198/198 pruebas
```

Si la suite falla con `500` en las pruebas de UI o de API, la causa más probable
es que la base de `.env` esté vacía: repetir `db:preparar` y `seed`.

## 6. Trampas conocidas (ya pagadas, no repetir)

- **Migraciones del editor piloto sin DDL.** `20261031_pilot_editorial_drafts.sql`
  y `20261101_add_pilot_editorial_source_url.sql` dependen de `md_pilot_exams` y
  `md_pilot_questions`, que solo existen en Supabase. `db:preparar` las marca
  `OMITIDA` a propósito; no "arreglarlas" creando tablas a mano en local.
- **Puntaje en el cliente.** Cualquier intento de calcular aciertos en el SPA
  rompe el contrato y las pruebas; el veredicto siempre viene del servidor.
- **`403` de requisitos.** El cuerpo trae `requisitos`; se lee desde
  `error.data` (por eso `apiFetch` adjunta el body). No convertir ese caso en un
  error genérico. Los demás errores del endpoint (`409` sin banco, `503` sin
  migración) ya muestran el mensaje del servidor porque `apiFetch` usa
  `data.error` como `error.message`.
- **Clon viejo `mooc-docente-integracion`.** Es una instantánea obsoleta.
  `tests/admin-database-identity.test.js` apunta a un endpoint
  (`/api/v1/admin/database-identity`) que no existe aquí: no portarlo. Sus dos
  documentos de 2026-10-31 están superados por los de este repo: no copiarlos.
  Conserva cambios sin commit del 2026-10-31 (`indexInicial.html`,
  `src/routes/admin.js`, `src/server.js` y varios borradores): archivarlo
  (renombrar o comprimir), nunca borrarlo a ciegas.
- **Terminal abierta en el clon viejo.** VS Code puede arrancar la terminal en
  `mooc-docente-integracion`, que **no tiene `.env`**: cualquier `npm run seed` o
  `psql` lanzado ahí falla de inmediato (no puede escribir en ninguna base por
  accidente). Antes de ejecutar, confirmar `(Get-Location).Path` o usar
  `git -C <ruta>` con rutas absolutas. Todo lo hecho el 2026-11-03 vive en
  `mooc-docente-cursos-eval` (`AGENTS.md`, `docs/handoff.md` y el local
  `.env.produccion`, que está ignorado).
- **`headers` de nivel superior en `vercel.json`.** Con `builds` + `routes`
  (config legacy) Vercel lo ignora: la cabecera nunca aparece en Production.
  Comprobado el 2026-11-02 con la CSP y con el `no-store` de
  `/diagnostico-piloto`. Las cabeceras van dentro de cada ruta
  (`"headers": { ... }`) y `tests/spa-modular.test.js` falla si vuelve el arreglo.
- **`index.html` / `app.js`**: retirados en la T2.5 (2026-11-02). Si reaparecen,
  `tests/spa-modular.test.js` falla; no reintroducir una segunda integración.

## 7. Documentos por tema

| Si vas a tocar… | Lee |
| --- | --- |
| Estructura del SPA, orden de carga, router, pruebas | `docs/arquitectura-frontend.md` |
| Evaluación final por curso | `docs/evaluacion-final-por-curso.md` |
| Quiz de lección y calificación segura | `docs/calificacion-segura-cuestionarios.md` |
| Catálogo, contenido y correspondencia SPA↔BD | `docs/inventario-academico-tres-cursos.md`, `docs/catalogo-contenido-auditoria.md` |
| Despliegue y variables | `docs/deploy-vercel.md` |
| Ramas, PR, tags, reversión y cambio a `main` | `docs/estrategia-ramas.md` |
| Carga a producción | `docs/carga-catalogo-production.md` |
| Diseño, apariencia e identidad visual | `docs/diseno-visual.md` |
| Decisiones de producto (umbral, insignia, banco) | `docs/decisiones-producto.md` |
| Hoja de ruta completa | `docs/roadmap.md` |

Al cerrar una sesión, actualizar **este archivo** (secciones 1–3) y la línea
`Siguiente acción concreta` de `AGENTS.md`, con el formato de handoff que figura
en `AGENTS.md`.