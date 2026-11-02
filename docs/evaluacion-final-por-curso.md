# Evaluación final por curso

Estado: 2026-11-02. Contrato de backend implementado y probado en local; la
migración **no** se ha ejecutado en Production ni se ha desplegado.

## 1. Problema y alcance

Antes de esta etapa el SPA no tenía examen final de curso. Lo único evaluable
fuera de las lecciones era el simulacro post-login, que:

- siempre consulta el curso fijo `Evaluación Educativa y Autonomía
  Institucional`;
- no informa si la persona aprobó ni con qué umbral;
- no deja historial asociado al curso.

La T2.4 añade el contrato `GET/POST /api/v1/courses/:id/assessment`. El envío
lo califica el servidor con el banco de preguntas del curso, persiste el
intento en `quiz_attempts`/`quiz_attempt_answers` y devuelve el veredicto, el
desempeño por tema y las áreas por reforzar.

## 2. `GET /api/v1/courses/:id/assessment`

Requiere `Authorization: Bearer <token>`.

Respuesta `200`:

```json
{
  "assessment": {
    "cursoId": 1,
    "titulo": "Evaluación Educativa y Autonomía Institucional",
    "area": "Evaluación",
    "umbralAprobacion": 80,
    "totalPreguntas": 12,
    "preguntas": [
      {
        "id": 37,
        "pregunta": "En una institución...",
        "leccion": "Evaluación integral y autonomía del SIEE",
        "area": "Evaluación",
        "opciones": [{ "id": 145, "opcion": "...", "orden": 1 }]
      }
    ],
    "requisitos": {
      "leccionesTotales": 4,
      "leccionesCompletadas": 4,
      "exigeLecciones": false,
      "habilitada": true
    },
    "historial": [
      {
        "id": 12,
        "puntaje": 83.33,
        "aciertos": 10,
        "totalPreguntas": 12,
        "aprobado": true,
        "finalizadoEn": "2026-11-02T18:40:00.000Z"
      }
    ]
  }
}
```

Reglas del contrato:

- Las opciones nunca incluyen `es_correcta`, `esCorrecta` ni explicaciones.
- El orden de preguntas y opciones es determinista (`q.id`, `qo.orden`) para
  que el examen sea reproducible y comparable entre intentos.
- `historial` devuelve los últimos cinco intentos de ese curso para esa
  persona, del más reciente al más antiguo.
- Códigos: `400` id inválido, `401` sin sesión, `404` curso inexistente o
  inactivo, `409` curso sin preguntas, `503` migración sin aplicar.

## 3. `POST /api/v1/courses/:id/assessment/attempts`

Requiere `Authorization: Bearer <token>`.

Cuerpo aceptado (cualquier otro campo se ignora, incluidos `puntaje`,
`aprobado` o `attempt`):

```json
{
  "answers": [
    { "questionId": 37, "optionId": 145 },
    { "questionId": 38, "optionId": 150 }
  ]
}
```

Respuesta `201`:

```json
{
  "attempt": {
    "id": 13,
    "estado": "finalizado",
    "iniciadoEn": "2026-11-02T19:00:00.000Z",
    "finalizadoEn": "2026-11-02T19:00:00.000Z",
    "puntaje": 50,
    "aciertos": 1,
    "totalPreguntas": 2,
    "aprobado": false,
    "umbralAprobacion": 80
  },
  "results": [
    {
      "questionId": 37,
      "correct": true,
      "correctOptionId": 145,
      "explanation": "Explicación de la respuesta correcta.",
      "topic": "Evaluación integral y autonomía del SIEE",
      "area": "Evaluación"
    }
  ],
  "porLeccion": [
    { "leccion": "Normatividad de la evaluación", "aciertos": 0, "total": 1, "porcentaje": 0 }
  ],
  "areasPrioritarias": [
    { "area": "Legislación", "aciertos": 0, "total": 1, "porcentaje": 0 }
  ]
}
```

Reglas de calificación:

- Debe responderse **cada** pregunta del curso exactamente una vez; si falta
  una, sobra o se repite, la respuesta es `400` y no se guarda nada.
- Cada `optionId` debe pertenecer a su `questionId`; si no, `400`.
- Si una pregunta no tiene exactamente una opción con `es_correcta = TRUE`, se
  responde `409` y no se registra el intento.
- `puntaje = round(aciertos / total * 100, 2)`.
- `aprobado = puntaje >= umbralAprobacion`.
- `porLeccion` y `areasPrioritarias` se ordenan de menor a mayor porcentaje;
  `areasPrioritarias` solo incluye áreas por debajo del umbral.

## 4. Umbral y requisito de lecciones

Variables de entorno (no requieren reiniciar el proceso para el umbral, porque
se leen en cada solicitud):

| Variable | Efecto | Defecto |
| --- | --- | --- |
| `COURSE_ASSESSMENT_PASSING_SCORE` | Porcentaje mínimo para aprobar (0-100) | `80` |
| `COURSE_ASSESSMENT_REQUIRES_LESSONS` | `true` exige completar todas las lecciones antes de calificar (`403`) | desactivado |

El umbral del 80 % es una recomendación de producto **pendiente de
aprobación**; el valor efectivo se publica en `umbralAprobacion` para que la
interfaz no lo duplique.

## 5. Persistencia y migración

`database/migrations/20261102_course_assessment.sql` (aditiva, reversible e
idempotente) añade a `quiz_attempts`:

| Columna | Tipo | Uso |
| --- | --- | --- |
| `curso_id` | `INTEGER` → `courses(id)` | Curso evaluado |
| `alcance` | `VARCHAR(20)` con `CHECK` | `diagnostico` (simulacro) o `evaluacion_curso` |
| `aprobado` | `BOOLEAN` | Veredicto calculado en el servidor |

Además crea el índice parcial `idx_quiz_attempts_usuario_curso` y documenta las
columnas con `COMMENT ON COLUMN`. El esquema canónico (`database/schema.sql`)
ya incluye las tres columnas y el índice.

Orden de despliegue: **primero la migración, después el código**. Si el código
llega antes, `GET` y `POST` responden `503` con un mensaje explícito en lugar
de fallar con `500`.

Los intentos de diagnóstico existentes quedan con `alcance = 'diagnostico'` por
el valor por defecto; no se modifican preguntas, opciones, progreso ni
insignias.

## 6. Seguridad

- La clave y las explicaciones nunca viajan en el `GET`; solo se devuelven en
  el `POST` después de calificar.
- El cliente no puede aportar `puntaje`, `aprobado` ni resultados: cualquier
  campo distinto de `answers` se ignora y el veredicto se recalcula.
- El historial es append-only: cada envío crea un intento nuevo con su snapshot
  de pregunta y opción; la API no actualiza ni borra intentos.
- Las consultas usan parámetros y filtran `activo = TRUE` en curso, módulo y
  lección.

## 7. Pendientes

1. Vista del SPA para presentar el examen (`#/evaluacion/<curso>`), reutilizando
   el patrón del simulacro: una pregunta por pantalla, envío único al final y
   pantalla de resultados con `porLeccion` y `areasPrioritarias`.
2. Aprobación del umbral definitivo y del requisito de lecciones.
3. Insignia del curso **solo** al aprobar el examen final; hoy el backend no
   otorga insignias en este flujo.
4. Cargar/verificar el banco del curso #1 antes de habilitar el examen en
   Production.

## 8. Validación ejecutada (2026-11-02)

- `node --check` sin errores en `src/services/courseAssessment.js` y
  `src/routes/courses.js`.
- `tests/course-assessment.test.js` (20 pruebas, base simulada): contrato del
  `GET`, umbral configurable, `400/401/404/409/503`, calificación del servidor,
  rechazo de puntajes del cliente, snapshot y requisito de lecciones.
- `tests/course-assessment-db.test.js` (5 pruebas, PostgreSQL real): consulta
  sin claves, aprobación con el banco real, persistencia de `curso_id`,
  `alcance` y `aprobado`, historial y envío incompleto.
- Migración aplicada dos veces sobre `merito_test_local`
  (`postgres:15`, `127.0.0.1:5433`) sin errores: es idempotente.
- Suite completa: **25/25 suites y 193/193 pruebas**.
- No se tocó Supabase ni Production.
