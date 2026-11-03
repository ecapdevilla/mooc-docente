# Handoff — estado y siguientes pasos

**Actualizado:** 2026-11-02
**Rama de producción:** `main` (histórico publicado durante la reconstrucción: `recovery/integracion-20261031`)
**Suites:** 26/26 suites y 198/198 pruebas en verde (`npx jest --maxWorkers=2`)
**Base de desarrollo:** PostgreSQL local `meritodocente` (`127.0.0.1:5432`) preparada
con `npm run db:preparar` + `npm run seed`. Supabase = producción, intacto.

Este documento es el punto de entrada para retomar el trabajo, sea la misma
persona o un agente distinto. `AGENTS.md` sigue siendo el contexto operativo
(contratos, comandos, protocolo); aquí está **qué falta y en qué orden**.

## 1. Lo último que se hizo (T2.4, cerrada)

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

## 2. Qué está publicado (nada pendiente de commit)

La T2.4 y la T2.5 están cerradas y publicadas; `git status` debe quedar limpio.

| Commit | Contenido |
| --- | --- |
| `be8b1c8` | T2.4: evaluación final por curso + `db:preparar` |
| `9da930d` | `.env.example`: variables del examen final |
| `5d6a811` | T2.5: frontend único + CSP + `docs/estrategia-ramas.md` |
| `db45957` | CSP por ruta (el arreglo `headers` de nivel superior no se aplicaba) |
| `6d3b3da` | Limpieza: cabeceras solo por ruta, sin arreglo ignorado |
| `3e88b78`, `6195bcc` | Evidencia del despliegue y aclaración de ramas/tag |

`main` y `recovery/integracion-20261031` avanzan juntos; el tag anotado `v0.2.0`
apunta al commit verificado `6195bcc`. Vercel sigue publicando desde
`recovery/...` hasta que se cambie la *Production Branch* (ver
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

11. Aplicar `20261102_course_assessment.sql` en Supabase siguiendo
    `docs/carga-catalogo-production.md` (secciones 7.2 y 7.3, con respaldo y
    verificación de cascada). **No** se ha tocado producción.
12. ~~Verificar el despliegue en Vercel y la estrategia de ramas
    (`docs/deploy-vercel.md`).~~ Verificado el 2026-11-02 (tabla §2 bis) y
    estrategia definida en `docs/estrategia-ramas.md`. Quedan tres pasos de panel
    que requieren la cuenta: rama por defecto `main` en GitHub, protección de
    `main` y *Production Branch* de Vercel en `main`.

## 4. Lo que le toca a la persona (no al agente)

| Tema | Por qué es tuyo | Dónde queda |
| --- | --- | --- |
| Revisar y firmar el diff | Cambia contrato de UI y añade un script | `git status` / `git diff` |
| Commit y push | No se hacen commits automáticos | Rama `main` |
| Decidir umbral, requisito e insignia | Es criterio académico y comercial | P1 arriba |
| Validar el banco del curso #1 | Requiere criterio docente | P2 arriba |
| Credenciales Supabase y Vercel | Son secretos: nunca en el repo | `.env` / panel de Vercel |
| Abrir la vista en el navegador | Aquí no hay navegador real | `npm run dev` → `http://localhost:3000/` |

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
| Hoja de ruta completa | `docs/roadmap.md` |

Al cerrar una sesión, actualizar **este archivo** (secciones 1–3) y la línea
`Siguiente acción concreta` de `AGENTS.md`, con el formato de handoff que figura
en `AGENTS.md`.