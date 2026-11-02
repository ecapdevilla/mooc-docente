# Login con 500 en Production: causa raíz y corrección

Estado: 2026-11-01. Diagnóstico medido contra
`https://mooc-docente.vercel.app` (solo lecturas y peticiones sin efecto) y
contra la API local. No se ejecutó ningún cambio en Production.

## 1. Síntoma reportado

`POST /api/v1/auth/login` devolvía `500` al iniciar sesión desde el SPA.

## 2. Evidencia medida

| Petición | Production | Local (`src/server.js`) |
| --- | --- | --- |
| `POST /api/v1/auth/login` con JSON malformado | `500` | `400` |
| `POST /api/v1/no-existe` con JSON malformado | `500` | `400` |
| `POST /api/v1/auth/login` con JSON válido y usuario inexistente | `401` | `401` |
| `POST /api/v1/auth/login` con cuerpo vacío y `Content-Type: application/json` | `400` | `400` |
| `GET /api/v1/courses` | `200 {"courses":[]}` sin `meta` | `200` con `meta` |

Lectura de los datos:

1. El `500` **no es un fallo del login**: se reproduce igual en una ruta que no
   existe. Lo dispara cualquier cuerpo JSON que `express.json()` no pueda
   interpretar, antes de llegar al router de autenticación.
2. El login con JSON válido responde `401` correctamente en Production, así que
   la consulta de usuarios, el hash y la validación no están rotos.
3. `GET /api/v1/courses` en Production no devuelve `meta`, mientras que la rama
   local sí: **el bundle desplegado está desactualizado** respecto de
   `recovery/integracion-20261031` (commit `463d6aa`). Con el código actual el
   mismo caso responde `400`.

## 3. Causa raíz

`body-parser` reporta el cuerpo inválido como `SyntaxError` con
`type = 'entity.parse.failed'` y `status = 400`. El manejador global de errores
lo estaba tratando como error interno en la versión desplegada, así que:

- la respuesta era `500` con el mensaje genérico;
- el cuerpo recibido (que puede incluir credenciales) se imprimía completo en
  los logs mediante `console.error('❌ Server error:', err)`.

No hay defecto en `src/routes/auth.js` ni en `src/middleware/auth.js`.

## 4. Corrección aplicada (local)

`src/server.js`, manejador global de errores:

- Detecta explícitamente `err.type === 'entity.parse.failed'` (o `SyntaxError`
  con `body`) y responde **400** con
  `{ error: 'JSON inválido en el cuerpo de la solicitud' }`.
- Para 4xx registra solo método, ruta, código y mensaje: no vuelca el cuerpo de
  la petición ni el stack.
- Los 5xx siguen registrándose completos y responden
  `{ error: 'Error interno del servidor' }` fuera de desarrollo.
- El stack sigue disponible únicamente en `NODE_ENV=development` y nunca para
  errores de parseo.

`api/index.js` no requiere cambios: envuelve la misma app de Express, por lo que
la corrección aplica al despliegue serverless.

## 5. Pruebas añadidas

`tests/errores-http.test.js` (4 casos, `npx jest tests/errores-http.test.js`):

1. JSON malformado en `/auth/login` → `400`, mensaje explícito, sin `stack` y
   sin eco del cuerpo enviado.
2. JSON malformado en una ruta inexistente → `400` (demuestra que es global y no
   de autenticación).
3. Ruta inexistente sin cuerpo → `404 Ruta no encontrada`.
4. Login con credenciales inexistentes → `401`, no `500`.

Resultado: 4/4 en verde.

## 6. Acción pendiente

1. Desplegar la rama `recovery/integracion-20261031` (el código en Production es
   anterior a `463d6aa`; la ausencia de `meta` en `/courses` lo confirma).
2. Tras el despliegue, repetir las cinco peticiones de la tabla del punto 2:
   los dos casos con JSON malformado deben pasar de `500` a `400`.
3. Si después del despliegue algún `POST` sobre `users` sigue devolviendo `500`,
   revisar las tablas de identidad de la base de Production con
   `database/diagnostics/20261101_diagnostico_catalogo_solo_lectura.sql`
   (consultas 11 y 12): sería un problema de esquema, no del login.

## 7. Verificación tras el despliegue (2026-11-01)

Commit desplegado: `3d7eca7` en `recovery/integracion-20261031`.

| Petición a `https://mooc-docente.vercel.app` | Antes | Después |
| --- | --- | --- |
| `POST /api/v1/auth/login` con JSON malformado | `500` | `400` |
| `POST /api/v1/ruta-inexistente` con JSON malformado | `500` | `400` |
| `GET /api/v1/courses` | `200` sin `meta` | `200` con `meta {totalCursos, cursosActivos}` |
| `POST /api/v1/auth/login` con usuario inexistente | `401` | `401` |
| `POST /api/v1/quizzes/post-login/attempts` con token inválido | `500` | `401` |
| `GET /api/v1/progress` sin token | `401` | `401` |
| `GET /api/v1/diagnostico-piloto/info` | `200`, 50 preguntas | `200`, 50 preguntas |

Hallazgo adicional del despliegue: el `400` ya no llega con el mensaje
`JSON inválido en el cuerpo de la solicitud`, sino con el genérico
`Error interno del servidor`. Motivo: en el runtime serverless de Vercel el
error no trae `type = 'entity.parse.failed'` y el `SyntaxError` se crea en otro
contexto, así que la comprobación con `instanceof` falla.

Corrección definitiva: `src/server.js` envuelve `express.json()` y marca
`req.cuerpoJsonInvalido` cuando ese middleware rechaza el cuerpo; el manejador
global usa la marca antes de inspeccionar el error. `src/utils/httpErrors.js`
queda como red de seguridad para errores que no pasan por ese middleware y está
cubierto por `tests/http-errors.test.js` (8 casos).

### 7.1 Verificación final

Commit desplegado y confirmado en producción: `d6d5ce6` en
`recovery/integracion-20261031` (marcador `commit` de `GET /api/v1`).

| Sonda en `https://mooc-docente.vercel.app` | Resultado |
| --- | --- |
| `POST /api/v1/auth/login` con JSON malformado | `400 "JSON inválido en el cuerpo de la solicitud"` |
| `POST /api/v1/auth/login` con cuerpo de 20 KB | `400` con el mismo mensaje (límite `10kb`) |
| `POST /api/v1/auth/login` con `charset=iso-8859-1` | `400` con el mismo mensaje |
| `POST /api/v1/auth/login` con `{}` | `400 "\"email\" is required"` (validación, no cuerpo) |
| `GET /api/v1/courses` | `200` con `meta {totalCursos, cursosActivos}` |
| `POST /api/v1/auth/login` con usuario inexistente | `401` |
| `GET /api/v1/progress` sin token | `401` |
| `POST /api/v1/quizzes/post-login/attempts` con token inválido | `401` |
| `GET /api/v1/diagnostico-piloto/info` | `200` con 50 preguntas |
| `GET /api/v1` | `200` con `commit: d6d5ce6` |
| `GET /health` | `200` con `commit` (enrutado a la función en `vercel.json`) |

Observaciones del runtime que quedaron documentadas en el código:

1. En Vercel el fallo de análisis del cuerpo llega como `400` sin
   `entity.parse.failed`, sin `body` y sin un `SyntaxError` identificable; por eso
   la clasificación no puede depender de la forma del error. La combinación que
   funciona en producción es: marca en el middleware + `400` en una petición
   `application/json`.
2. Las validaciones de negocio responden sin lanzar, así que un `400` que llega
   al manejador global en una petición JSON solo puede venir del análisis del
   cuerpo. Un `500` con `SyntaxError` interno sigue reportándose como `500`.
3. `vercel.json` debe enrutar `/health` a `api/index.js`; la ruta catch-all sirve
   la SPA para todo lo demás. `api/index.js` no normaliza `/health` para no
   convertirla en `/api/v1/health`.

Para verificar qué versión está en línea sin abrir el panel, `GET /api/v1` y
`GET /health` devuelven `commit` (SHA corto de `VERCEL_GIT_COMMIT_SHA` o `local`
en desarrollo).

Pendiente conocido de contrato: un cuerpo enviado con `Content-Type: text/plain`
no pasa por el analizador JSON y la validación responde
`400 "\"value\" must be of type object"`. No afecta a la SPA (siempre envía
`application/json`), pero conviene responder `415` cuando el tipo no sea JSON.

