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
