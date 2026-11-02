# Evidencia visual — experiencia curso → módulo → lección

Fecha de la revisión: 2026-11-01
Alcance: `indexInicial.html` (SPA autocontenida)
Entorno: Chrome estable en Windows conducido con `playwright-core`, viewports 1440×900 (escritorio), 768×1024 (tableta) y 390×844 (móvil), locale `es-CO` y `prefers-reduced-motion: reduce`.

## Naturaleza de las capturas

> **SIMULACIÓN.** Las capturas se generaron con la SPA real servida en `127.0.0.1` y una **API aislada** que responde con datos de demostración. No se usó Supabase, ni Production, ni datos personales. Cada imagen lleva el aviso «SIMULACIÓN · API aislada, sin datos reales».
>
> Los títulos de cursos y lecciones se leen del propio `indexInicial.html` para ejercitar la correspondencia real SPA ↔ API. Los módulos se agrupan como «Unidad 1», «Unidad 2» y «Unidad en preparación» para poder revisar los estados de contenido publicado y pendiente sin inventar contenido académico.

## Cobertura de la revisión

| Punto solicitado | Evidencia |
| --- | --- |
| Vista principal del curso | `full-course-*.jpg`, `noprog-course-*.jpg`, `nocourse-course-fallback-*.jpg` |
| Ruta de módulos | `full-course-*.jpg` (sección «Módulos en orden»), `full-course-progress-*.jpg` |
| Vista independiente del módulo | `full-module-*.jpg`, `full-module-pending-desktop.jpg` |
| Lectura completa de una lección | `full-lesson-*.jpg`, `noprog-lesson-*.jpg` |
| Índice lateral | `full-lesson-desktop.jpg`, `full-lesson-tablet.jpg` (índice sobre el contenido a ≤1080 px) |
| Navegación anterior/siguiente | `full-lesson-desktop.jpg` (pie con Anterior / Finalizar curso / Volver al módulo) |
| Actividades y cuestionarios | `full-lesson-quiz-desktop.jpg` (respuesta correcta, retroalimentación y estado completado) |
| Progreso | `full-course-progress-desktop.jpg` (33 % → 67 %), `noprog-course-*.jpg` (0 %) |
| Carga, error y contenido pendiente | `full-module-pending-desktop.jpg`, `apierror-login-apierror-*.jpg`, `nocourse-course-fallback-*.jpg` |
| Coherencia con Mérito Docente 2.0 | todas las capturas: misma tipografía, paleta, tarjetas, botones y navegación del rediseño `.lx-` |

## Defectos encontrados y corregidos

1. **La lección se renderizaba en una columna de 2 px.** `#lessonView` tenía `class="lx-lesson-layout"` y la vista inyectaba dentro otro `.lx-lesson-layout`; la cuadrícula exterior metía la cuadrícula interior en la columna de 290 px del índice. El artículo quedaba en 2 px de ancho, la página crecía a 4206 px de alto y el cuestionario era inalcanzable con puntero. Se dejó el contenedor como `lx-lesson-page` y la cuadrícula quedó solo en el marcado de la vista.
2. **El estado no se refrescaba al responder bien la actividad.** El quiz ya persistía la lección (`POST /progress/lesson/:id`), pero la cabecera seguía en «En curso», el pie ofrecía «Marcar completada» y el índice no marcaba la lección. Se añadió `refreshLessonCompletionUi()`, que actualiza en el lugar la cabecera, el pie, el índice, el porcentaje y el contador sin perder la retroalimentación.

## Comportamientos verificados en navegador

- **33 capturas, 0 fallos**: sin desbordamiento horizontal en 1440/768/390 px; botón principal de 54 px (curso), 44 px (módulo/lección) y 46–47 px en móvil.
- **Progreso real**: el curso parte de 33 % con una lección completada en la API y pasa a 67 % al terminar la actividad, con **una sola** escritura `POST /progress/lesson/:id`. En el escenario sin progreso se muestra 0 %, nunca un porcentaje inventado.
- **Curso sin correspondencia con la API**: una sola «Ruta del curso», aviso de avance local y **cero** escrituras de progreso al completar una lección.
- **Contenido pendiente**: «Unidad en preparación» no ofrece botones, declara «Aún sin contenido» y la ruta del curso la marca «En preparación».
- **Error de API**: el inicio de sesión muestra el mensaje de error y **no** abre el panel sin sesión validada.
- **Insignia**: al completar un módulo aparece el modal; mientras está abierto bloquea la navegación, por lo que las pruebas lo cierran antes de continuar (comportamiento esperado).
- **Navegación**: dashboard → curso → módulo → lección → anterior/siguiente funciona con los controles visibles; las migas reflejan curso, módulo y lección.

## Pruebas asociadas

- `npx jest tests/ui-design.test.js tests/learning-experience.test.js` → **14/14**.
- `npx jest tests/admin-pilot-diagnostic.test.js tests/admin-pilot-diagnostic-import.test.js tests/admin-routes.test.js tests/pilot-diagnostic-isolation.test.js tests/admin-pilot-diagnostic-ui.test.js` → **54/54** (administrador, diagnóstico y Excel con base de datos simulada).
- Las suites que requieren PostgreSQL real (`auth`, `courses`, `progress`, `quizzes`, `health`, `spa-ui`) no se ejecutaron: el entorno no tiene `.env`.

## Baseline de Production antes del despliegue

`production-predeploy-desktop.jpg`, `production-predeploy-mobile.jpg` y `production-predeploy.json`.

- `GET https://mooc-docente.vercel.app/` → 200; **0 referencias a `.lx-`**, sin `#view-course` ni `#view-module`: el rediseño aún no estaba servido.
- `GET /api/v1/admin/users` sin token → 401 «No se proporcionó token de autenticación».
- `GET /api/v1/quizzes/post-login` sin token → 401.
- `GET /api/v1/ping/health` → `{"status":"ok","db":"connected"}`.
- `GET /api/v1/courses` → `{"courses":[]}` y `GET /api/v1/courses/1` → 404: la base responde pero **no publica cursos** en Production.
- `GET /api/v1/diagnostico-piloto/info` → 50 preguntas, examen `MD-DIA-2026-PILOTO-001`, estado `revision_academica_pendiente` (sin cambios).
- `/diagnostico-piloto` → 200 y contiene el título del diagnóstico.

## Limitaciones de esta evidencia

- La revisión visual se hizo con API simulada: no sustituye una sesión real contra Supabase ni una revisión con contenido definitivo.
- La navegación autenticada en Production **no está verificada**: no se usaron credenciales y la API pública no publica cursos.
- El cuestionario de lección se califica en el navegador (el detalle del curso expone `es_correcta`). Es deuda técnica conocida; su migración al backend no forma parte de este despliegue.
- El arnés de revisión (servidor de simulación + capturas) fue temporal y se retiró después de generar la evidencia para no añadir una dependencia no declarada (`playwright-core`) al proyecto.
