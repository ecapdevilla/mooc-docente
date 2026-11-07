# Despliegue en Vercel

Guía operativa para publicar el frontend (`indexInicial.html`) y la API Express como función serverless.

Arquitectura del despliegue:

```
Vercel (estático)  ->  indexInicial.html, diagnosticoPiloto.html, public/** (js/**, styles/app.css, diagnosticoPiloto.js|css)
Vercel (función)   ->  api/index.js  ->  src/server.js (Express)  ->  Supabase (PostgreSQL)
```

`indexInicial.html` es la única entrada del frontend desde la T2.5 (2026-11-02):
`index.html`, `app.js`, `public/api-client.js` y `public/auth.js` ya no existen ni
se publican.

## 1. Antes de desplegar (local)

```bash
npm install
npm test          # 26 suites / 198 pruebas en verde (requiere DATABASE_URL y JWT_SECRET)
npm run db:preparar  # idempotente; esquema + migraciones si la base está vacía
npm run seed
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
| `GET https://<dominio>/health` | `{"status":"ok",...,"commit":"<sha>"}` con el SHA publicado |
| `GET https://<dominio>/api/v1` | `{"status":"ok","api":"MéritoDocente","version":"v1"}` |
| `GET https://<dominio>/api/v1/ping/health` | `{"status":"ok","db":"connected"}` |
| `GET https://<dominio>/api/v1/courses` | 2 cursos |
| Cabeceras de `GET /` | `Content-Security-Policy` con `script-src-attr 'none'` y `script-src 'self'` |
| `GET https://<dominio>/js/vistas/evaluacion.js` | 200 `application/javascript` |
| Matrícula en el formulario | Usuario nuevo en la tabla `users` de Supabase |

Verificación ejecutada el 2026-11-02 sobre `https://mooc-docente.vercel.app`
(commit `6d3b3da`): `/health` → `commit: 6d3b3da`; `/` → 200 con 19
`<script src>`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff` y
`Referrer-Policy: no-referrer`; `/js/vistas/evaluacion.js` → 200
`application/javascript` (24.015 bytes); `/styles/app.css` → 200 `text/css`;
`/api/v1/courses` → 200 `application/json`;
`/api/v1/courses/1/assessment` → 401 (ruta publicada y protegida);
`/diagnostico-piloto` → `Cache-Control: no-store`. La CSP del HTML estático se
detalla en la sección 7.

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
- La migración `20261102_course_assessment.sql` ya está aplicada en Supabase
  (2026-11-03): en producción `GET /api/v1/courses/:id/assessment` ya no responde
  `503`.
- GitHub ya tiene `default_branch = main` y protección mínima en `main` (sin
  force-push ni borrado, 2026-11-06). El proyecto Vercel es `sourceless`
  (despliegue manual con `vercel --prod`, sin auto-deploy de Git); su
  `productionBranch` vinculado apunta a `recovery/integracion-20261031` pero no
  gobierna despliegues. Detalle en `docs/estrategia-ramas.md`, sección 6.

## 7. CSP del HTML estático (T2.5, 2026-11-02)

La SPA no la sirve Express en producción, sino la capa estática de Vercel, que no
pasa por Helmet. Por eso la CSP se declara dos veces:

| Capa | Dónde | Cuándo aplica |
| --- | --- | --- |
| Express (Helmet) | `src/server.js` | `npm run dev`, `npm start` y la función serverless |
| Vercel (estático) | `vercel.json` → `routes` legacy, cabeceras por ruta (`/` y `/(.*)`) | Production y Preview |

> **Trampa comprobada (2026-11-02):** con `builds` + `routes` (config legacy),
> Vercel **ignora** el arreglo `headers` de nivel superior. Las cabeceras solo se
> aplican si se declaran dentro de cada ruta (`"headers": { ... }`). Se verificó
> en Production: el `Cache-Control: no-store` de `/diagnostico-piloto` tampoco
> llegaba y empezó a funcionar al moverlo a la ruta. `tests/spa-modular.test.js`
> falla si se reintroduce el arreglo `headers`.

Valor publicado (idéntico al que genera Helmet con la configuración actual):

```text
script-src-attr 'none';default-src 'self';base-uri 'self';font-src 'self' https: data:;
form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';
script-src 'self';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
```

Junto con la CSP se envían `X-Content-Type-Options: nosniff` y
`Referrer-Policy: no-referrer`. Las dos directivas que más limitan el código son:

- `script-src 'self'`: no hay `<script>` en línea ni `eval`; todo el JS vive en
  `public/js/**`. Los CDN de Font Awesome y Google Fonts entran por `style-src
  https:` y `font-src https:`.
- `script-src-attr 'none'`: ningún atributo `on*`; las acciones viajan como
  `data-action` y las resuelve `public/js/nucleo/acciones.js`.

`tests/spa-modular.test.js` compara la cabecera de `vercel.json` con la que
responde Express en `GET /`: si Helmet cambia y `vercel.json` no, la suite falla
antes de publicar. Si se define `window.MERITO_API_BASE` hacia otro origen, hay
que añadir ese origen a `connect-src` en ambos lugares (hoy cae en
`default-src 'self'`).
