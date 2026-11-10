# Calificación segura de cuestionarios de lección

Estado: 2026-11-10. El **código está desplegado y verificado** en producción
(commit `4502261`): el SPA y el endpoint califican solo con identificadores y
la API devuelve `503 "La calificación segura aún no está habilitada en este
entorno."` porque `public.lesson_quiz_responses` **no existe en Supabase**
(verificado con `to_regclass` el 2026-11-10 → NULL). Falta únicamente aplicar
`database/migrations/20261101_lesson_quiz_responses.sql` en producción (ver
`docs/handoff.md` §2 quater y §3 P0); en cuanto exista la tabla, la
calificación pasa a habilitada en caliente, sin redeploy. Suites simuladas:
20/20 en verde.

## 1. Problema corregido

Antes:

- El SPA calificaba el cuestionario en el navegador comparando la opción
  elegida con un índice `correct` escrito en `indexInicial.html`.
- Al acertar, el SPA enviaba `POST /api/v1/progress/lesson/:id` con
  `{ puntaje: 100 }`; la API guardaba ese puntaje sin verificarlo.
- Cualquier cliente autenticado podía enviar `puntaje: 100` (o 90, o 1) sin
  responder nada. El detalle del curso (`GET /api/v1/courses/:id`) ya no
  exponía `es_correcta` ni explicaciones, pero el puntaje seguía siendo
  manipulable.

Ahora:

- El navegador solo envía identificadores (`quizId`, `optionId`).
- El servidor valida lección, pregunta y opción, califica con
  `quiz_options.es_correcta` y registra la respuesta con instantáneas de texto.
- El puntaje y la finalización se derivan de las respuestas registradas.
- `POST /api/v1/progress/lesson/:id` ignora el `puntaje` del cliente.

## 2. Contrato nuevo

`POST /api/v1/quizzes/lessons/:lessonId/responses` (requiere
`Authorization: Bearer <token>`).

Cuerpo aceptado (todo lo demás se ignora, incluidos `correct`, `puntaje`,
`score` o `lesson`):

```json
{ "quizId": 12, "optionId": 45 }
```

Respuesta `201`:

```json
{
  "response": {
    "id": 501,
    "quizId": 12,
    "leccionId": 7,
    "correct": true,
    "correctOptionId": 45,
    "explanation": "Texto pedagógico posterior al envío",
    "answeredAt": "2026-11-01T00:00:00.000Z"
  },
  "lesson": {
    "id": 7,
    "completed": true,
    "masteredQuizzes": 1,
    "totalQuizzes": 1,
    "attempts": 1,
    "puntaje": 100
  }
}
```

Errores:

| Código | Cuándo |
| --- | --- |
| `400` | Falta `quizId`/`optionId`, no son enteros positivos o la opción no pertenece a la pregunta. |
| `401` | Sin token o token inválido/inactivo. |
| `404` | La pregunta no pertenece a una lección/módulo/curso activo. |
| `409` | La pregunta no tiene exactamente una opción correcta (dato inválido). |
| `503` | La migración `lesson_quiz_responses` no está aplicada. |

## 3. Reglas de seguridad aplicadas

1. Autenticación obligatoria (`authenticate`); el usuario se toma de
   `req.user.id`, nunca del cuerpo.
2. Propiedad del registro: la pregunta debe pertenecer a la lección indicada y
   la lección a un módulo y curso activos.
3. Integridad de la respuesta: la opción debe pertenecer a la pregunta y la
   pregunta debe tener exactamente una opción correcta.
4. El resultado (`respuesta_correcta`) y el puntaje se calculan en SQL; el
   cliente no puede enviarlos.
5. Historial append-only: cada envío inserta una fila nueva con
   `pregunta_snapshot` y `opcion_snapshot`; la API no actualiza ni borra.
6. La lección se completa solo cuando todas sus preguntas se respondieron
   correctamente al menos una vez; el puntaje se fija en `100`.
7. `user_progress` conserva su `UNIQUE (usuario_id, leccion_id)`; los reenvíos
   incrementan `intentos` sin duplicar filas.
8. Si la lección no tiene cuestionario, el progreso se registra con
   `puntaje = NULL`: completar la lectura no otorga una nota.
9. Modo estricto opcional: con `LESSON_COMPLETION_REQUIRES_QUIZ=true`,
   `POST /progress/lesson/:id` responde `409` si el cuestionario no está
   dominado.
10. Los resultados históricos no se tocan: la migración no altera tablas
    existentes y el código solo lee `user_progress`.

## 4. Migración

`database/migrations/20261101_lesson_quiz_responses.sql`:

- Crea `lesson_quiz_responses` (`usuario_id`, `leccion_id`, `quiz_id`,
  `opcion_id`, `respuesta_correcta`, `pregunta_snapshot`, `opcion_snapshot`,
  `respondida_en`).
- Claves foráneas con `ON DELETE CASCADE` hacia `users`, `lessons`, `quizzes` y
  `ON DELETE SET NULL` hacia `quiz_options`.
- Índices por `(usuario_id, quiz_id)`, `(usuario_id, leccion_id)` y `quiz_id`.
- No contiene `ALTER`, `DROP`, `UPDATE` ni `DELETE`.

## 5. Comportamiento del SPA (diseño 2.0 intacto)

En `indexInicial.html`:

- `loadCourseMap` conserva `quizzes` de cada lección de la API.
- `getLessonContext` expone `apiQuizzes` (preguntas publicadas).
- `renderLesson` usa el mismo bloque `.lx-quiz` con las preguntas de la API
  cuando existen y hay sesión con API disponible; si no, mantiene la actividad
  local del prototipo.
- Cada opción lleva `data-option-id` y llama a `answerApiQuiz(quizId, optionId)`,
  que hace `POST /quizzes/lessons/:id/responses` y pinta la retroalimentación
  devuelta por el servidor (sin respuestas correctas en el HTML).
- Si la respuesta es incorrecta, la sección queda habilitada para reintentar;
  si es correcta y completa la lección, se actualiza cabecera, pie e índice con
  `refreshLessonCompletionUi()`.
- `persistLesson` envía `{}` (sin `puntaje`).

Sin cambios de CSS, HTML estructural, tipografía, colores ni navegación.

## 6. Pruebas

| Archivo | Cobertura | Resultado local |
| --- | --- | --- |
| `tests/lesson-quiz-security.test.js` | 401, 400, 404, 409, 503, calificación autoritativa, campos maliciosos, reenvíos append-only | 9/9 |
| `tests/progress-security.test.js` | puntaje ignorado, puntaje derivado, modo estricto, migración ausente | 4/4 |
| `tests/lesson-quiz-spa.test.js` | sin respuestas en el DOM, envío solo de IDs, feedback del servidor, progreso sin puntaje | 3/3 |
| `tests/catalog-diagnostics.test.js` | diagnóstico solo lectura y `meta` de cursos | 4/4 |

Ejecutar:

```bash
npx jest --runInBand tests/lesson-quiz-security.test.js \
  tests/progress-security.test.js tests/lesson-quiz-spa.test.js \
  tests/catalog-diagnostics.test.js
```

Las suites que usan PostgreSQL real (`auth`, `courses`, `progress`, `quizzes`,
`health`, `admin-routes`, `spa-ui`) requieren `DATABASE_URL`; no se ejecutaron
en este entorno porque el clon no tiene `.env`.

## 7. Despliegue controlado (no ejecutado)

Orden obligatorio:

1. Ejecutar la migración en staging y correr las suites con base real.
2. Ejecutar la migración en Production (solo `CREATE TABLE/INDEX IF NOT EXISTS`).
3. Publicar el código (API + SPA) en la rama de integración.
4. Verificar:
   - `GET /api/v1/courses/:id` no devuelve `es_correcta`.
   - `POST /quizzes/lessons/:id/responses` sin token → `401`.
   - Con token y opción incorrecta → `201` con `correct: false` y sin puntaje.
   - Con token y opción correcta → `lesson.completed: true`, `puntaje: 100`.
   - `POST /progress/lesson/:id` con `{ puntaje: 100 }` → `puntaje` nulo si el
     cuestionario no está dominado.
   - El intento aparece en `lesson_quiz_responses` con instantáneas.

Rollback: revertir el código deja la tabla nueva sin uso (no afecta a las
consultas existentes). No es necesario borrar datos; el historial es auditable.

## 8. Pendientes reales

- **Riesgo residual de reintentos**: el dominio se calcula como "acertó al menos
  una vez", por lo que reintentar hasta acertar también completa la lección.
  Cada respuesta queda registrada con su marca de tiempo e `intentos`, de modo
  que es auditable; para aprobación comercial conviene una regla adicional
  (primer intento, máximo de intentos o puntaje promedio) que aún no se aplica.
- Las actividades del prototipo que aún no existen en la API siguen
  calificándose en el navegador y **no otorgan puntaje**; su migración depende
  de cargar las preguntas en `quizzes`/`quiz_options`.
- Activar `LESSON_COMPLETION_REQUIRES_QUIZ=true` requiere que el SPA use
  siempre actividades de la API; hoy conviven ambos caminos.
- Las reglas de aprobación por curso (`course_completion_rules`) todavía no se
  aplican; deben apoyarse en `lesson_quiz_responses` y no en el progreso de
  lectura.
- Falta una prueba con base real del nuevo endpoint (esta entrega solo incluye
  pruebas con base simulada).

