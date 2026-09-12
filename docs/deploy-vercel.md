# Despliegue en Vercel

Guía operativa para publicar el frontend (`indexInicial.html`) y la API Express como función serverless.

Arquitectura del despliegue:

```
Vercel (estático)  ->  indexInicial.html, index.html, app.js, public/** (api-client.js, auth.js)
Vercel (función)   ->  api/index.js  ->  src/server.js (Express)  ->  Supabase (PostgreSQL)
```

## 1. Antes de desplegar (local)

```bash
npm install
npm test          # 4 suites / 19 pruebas en verde
npm run dev       # http://localhost:3000/
```

Prueba manual: matrícula en el formulario, inicio de sesión, abrir una lección y responder el quiz.
El progreso debe quedar en Supabase (`user_progress` y `enrollments`).

## 2. Variables de entorno

Se configuran **en Vercel** (Project → Settings → Environment Variables). El archivo `.env` nunca se sube: está en `.gitignore` y `.vercelignore`.

| Variable | Valor | Obligatoria |
| --- | --- | --- |
| `DATABASE_URL` | Cadena del **transaction pooler** de Supabase (puerto `6543`) | Sí |
| `JWT_SECRET` | Mismo valor del `.env` local | Sí |
| `NODE_ENV` | `production` | Sí |
| `CORS_ORIGIN` | `https://<tu-dominio>.vercel.app` (sin definir = `*`) | No |
| `JWT_EXPIRES_IN` | `7d` (valor por defecto) | No |

Para copiar los valores locales a Vercel sin exponerlos:

```powershell
Get-Content .env | Select-String '^(DATABASE_URL|JWT_SECRET|JWT_EXPIRES_IN)='
```

En Supabase, el transaction pooler está en *Connect → Transaction pooler* (puerto `6543`). En serverless es preferible a la conexión directa (5432) porque cada instancia de función abre su propio pool.

## 3. Desplegar

### Opción A: panel de Vercel (recomendada)

1. Entra a <https://vercel.com> con la cuenta de GitHub dueña del repositorio.
2. `Add New… → Project` → importa `ecapdevilla/mooc-docente`.
3. Framework Preset: **Other**. Build Command: vacío. Output Directory: vacío.
4. En *Environment Variables* agrega las de la tabla (marca Production y Preview).
5. `Deploy`.
6. Cuando termine: abre `https://<dominio>/`.

### Opción B: CLI

```bash
npx vercel login     # interactivo: lo ejecuta la persona dueña de la cuenta
npx vercel --prod    # primer despliegue de producción
```

## 4. Verificación posterior

| Comprobación | Resultado esperado |
| --- | --- |
| `GET https://<dominio>/` | SPA con navbar, hero y formulario de matrícula |
| `GET https://<dominio>/api/v1` | `{"status":"ok","api":"MéritoDocente","version":"v1"}` |
| `GET https://<dominio>/api/v1/ping/health` | `{"status":"ok","db":"connected"}` |
| `GET https://<dominio>/api/v1/courses` | 2 cursos |
| Matrícula en el formulario | Usuario nuevo en la tabla `users` de Supabase |

Si el formulario responde *"No pudimos conectar con el servidor"*, el SPA degradó a modo local y el problema está en la API (ver abajo).

## 5. Problemas frecuentes

- **500 en cualquier `/api/v1/...`**: revisar `DATABASE_URL`, `JWT_SECRET` y que `NODE_ENV=production`.
- **`too many connections` / `remaining connection slots`**: cambiar `DATABASE_URL` al transaction pooler (puerto `6543`).
- **404 en `/api/v1/...`**: revisar que `vercel.json` conserve el rewrite `/api/(.*) → /api/index.js` y ver los logs de la función (Deployments → Functions).
- **Cambios que no aparecen**: *Redeploy* sin caché después de editar variables de entorno.
- **Login/registro responde 401 o 500**: `JWT_SECRET` debe ser el mismo en Vercel y en local si se reutilizan tokens.

## 6. Pendientes conocidos del despliegue

- El simulacro gratuito sin registro (Fase 2 del roadmap) todavía no existe en el SPA.
- `docs/swagger.yaml` no existe, por lo que `/api-docs` no se monta.
- `index.html` y `app.js` son la integración provisional que se retirará.
