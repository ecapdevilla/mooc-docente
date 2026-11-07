# Decisiones de producto pendientes (P1 y P2)

**Actualizado:** 2026-11-06

Registro de las decisiones que estaban abiertas en `docs/handoff.md` (§3 P1 y
P2) y el criterio adoptado por defecto para no dejar cabos sueltos. Las
decisiones de configuración ya viven como variables de entorno; las de código
quedan listadas como tareas concretas.

## P1 — Evaluación final por curso

| # | Tema | Decisión adoptada (2026-11-06) | Dónde vive |
| --- | --- | --- | --- |
| 1 | Umbral de aprobación | **80 %** es el criterio oficial por defecto | `COURSE_ASSESSMENT_PASSING_SCORE` (servicio `courseAssessment.js`) |
| 2 | Requisito de lecciones | **Apagado** por defecto: el estudiante decide cuándo presentar; no se bloquea el acceso | `COURSE_ASSESSMENT_REQUIRES_LESSONS` |
| 3 | Insignia / curso aprobado | **Sí, debe otorgar**: aprobar el examen final marca el curso como aprobado y desbloquea insignia | **Hecho** (Sprint A, 2026-11-06) |

### Insignia al aprobar (implementada)

Cerrada en el Sprint A (`docs/sprints-paralelos.md`):

- Migración `database/migrations/20261107_course_badges.sql`: `badges.curso_id` +
  índice único parcial `(curso_id, nombre)`.
- `src/services/courseAssessment.js` → `otorgarInsigniaCurso` (idempotente).
- `src/routes/courses.js` → `POST /assessment/attempts` devuelve `badge` al
  aprobar (con `nueva` para distinguir primer otorgamiento) y `null` al
  desaprobar.
- Pruebas en `tests/course-assessment-badge.test.js`.

Pendiente (frontend, opcional): mostrar la insignia en el resultado de
`vistas/evaluacion.js` y refrescar el dashboard cuando `badge.nueva` sea `true`.
Hoy el backend la expone; la vista no la pinta todavía.

## P2 — Contenido

| # | Tema | Estado | Acción |
| --- | --- | --- | --- |
| 4 | Banco del curso #1 (Fundamentos) | **Bloqueado por material del autor** | No se inventan preguntas: la fuente debe ser el material del autor (PDF/normas). Formato de captura en `docs/handoff.md` §0. |
| 5 | Reconciliar SPA ↔ BD | Pendiente, sin bloqueo | Afecta a `porLeccion` y a las áreas prioritarias del resultado; se aborda al cargar el banco real. |

### Regla de contenido

El banco de preguntas es contenido académico verificado: **nunca** se generan
preguntas desde el modelo sin el material del autor. El seed y la carga solo
insertan enunciados revisados con `LECCION`, `PREGUNTA`, opciones A–D, `CORRECTA`,
`EXPLICACION_CORRECTA`, `EXPLICACION_INCORRECTA`, `AREA` y `FUENTE`.
