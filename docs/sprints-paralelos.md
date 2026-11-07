# Sprints paralelos · descomposición y coordinación

**Creado:** 2026-11-06
**Propósito:** dividir el trabajo en sprints independientes que varios agentes
puedan ejecutar en simultáneo sobre el mismo repositorio **sin cruzarse**, con
un coordinador que integra al final.

## 1. Principio de descomposición

Un sprint es seguro para ejecutarse en paralelo si **no comparte archivos** con
los demás sprints activos. La frontera se define por **áreas de archivos**, no
por funcionalidad:

| Área | Archivos | Quién la toca |
| --- | --- | --- |
| Backend (API/servicios/rutas) | `src/**` | un sprint |
| Base de datos | `database/migrations/**`, `database/schema.sql` | un sprint (o el backend) |
| Frontend lógica | `public/js/**` | un sprint |
| Frontend estilos | `public/styles/**` | el mismo sprint del frontend (o coordinador) |
| Marcado | `indexInicial.html` | el coordinador o un único sprint |
| Pruebas | `tests/<suite-nueva>.test.js` | una suite por sprint, **sin tocar suites ajenas** |
| Documentación | `docs/**`, `AGENTS.md`, `README.md` | **solo el coordinador** |

Reglas de no-cruce:
- Un sprint **no** toca archivos de otra área activa.
- Un sprint **no** hace `git add`/`commit`/`push`: deja los cambios en el working
  tree. El coordinador integra, resuelve la suite completa y commitea.
- Cada sprint añade una **suite nueva** (`tests/...test.js`); nunca modifica
  suites existentes salvo que sea estrictamente su área (y aun así sin romper).

## 2. Sprints de esta tanda (2 en paralelo)

### Sprint A — Backend: insignia de curso al aprobar el examen final
- **Área:** `src/**` + `database/migrations/**` + suite nueva.
- **Archivos:** `database/migrations/20261107_course_badges.sql` (nuevo),
  `src/services/courseAssessment.js`, `src/routes/courses.js`,
  `tests/course-assessment-badge.test.js` (nuevo).
- **Contrato:** al aprobar (`aprobado = true`) en `POST /assessment/attempts`,
  otorgar una insignia de curso de forma idempotente y exponerla en la respuesta
  (`badge`), sin cambiar el resto del contrato de la respuesta.
- **NO toca:** `public/**`, `indexInicial.html`, `server.js`, `docs/**`.

### Sprint B — Frontend: acabado visual y accesibilidad de la vista de evaluación final
- **Área:** `public/**` + suite `course-assessment-spa`.
- **Archivos:** `public/js/vistas/evaluacion.js`,
  `public/styles/app.css` (solo bloque `.assessment-*`),
  `tests/course-assessment-spa.test.js` (ampliar, no romper).
- **Contrato:** pulir presentación (resultado, estados, foco, responsive) sin
  cambiar la lógica de datos ni el contrato con la API.
- **NO toca:** `src/**`, `database/**`, `indexInicial.html`, `server.js`, `docs/**`.

## 3. Rol del coordinador

1. Define los sprints y sus fronteras (este documento).
2. Lanza cada sprint (agente propio o subagente) con el contrato por escrito.
3. Ejecuta **uno** de los sprints personalmente.
4. Al cierre: revisa los cambios de cada sprint, corre `node --check` y la suite
   completa (`npx jest --maxWorkers=2`), actualiza `docs/handoff.md`/`AGENTS.md`,
   hace el commit y el push, y despliega si el cambio es servido.

## 4. Cómo escalar a más sprints

Añadir filas a la tabla del §2 respetando las fronteras del §1. Ejemplos futuros
(no en esta tanda): simulacro gratuito sin registro (backend nuevo + vista
nueva), editor/importador Word (backend + admin SPA), banco de contenido
(seed/carga, no código). Nunca dos sprints activos sobre la misma área.
