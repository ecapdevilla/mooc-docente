# Arquitectura del frontend (Etapa 1: SPA modular)

Fecha: 2026-11-02. Alcance: `indexInicial.html`, `public/styles/app.css` y `public/js/**`.

Este documento explica cómo está organizado el SPA después de la Etapa 1 para que
cualquier persona (o agente) pueda cambiar contenido, estilos o comportamiento sin
romper el producto ni las pruebas.

## 1. Qué cambió y qué no

Antes, `indexInicial.html` era aplicación, hoja de estilos y fuente de datos a la
vez: 6.700 líneas y 273 KB, imposible de revisar y con el contenido académico
enterrado entre CSS y JavaScript.

Ahora el HTML solo contiene estructura y orden de carga:

| Archivo | Rol | Tamaño |
| --- | --- | --- |
| `indexInicial.html` | Marcado de todas las vistas, IDs y puntos de integración | 574 líneas / 30 KB |
| `public/styles/app.css` | Toda la hoja de estilos | 3.072 líneas / 98,6 KB |
| `public/js/**` (16 archivos) | Datos, núcleo, vistas y arranque | 3.204 líneas / 150 KB |

Lo que **no** cambió en la Etapa 1:

- El marcado, los IDs, las clases y los textos visibles del HTML son los mismos.
- El JavaScript se movió sin reescribirse: la concatenación de los 16 archivos es
  byte a byte igual al bloque `<script>` original (verificado en la extracción).
- Se conservan los atributos `onclick`/`on*` y los 15 manejadores publicados en
  `window`. No se introdujo ningún framework, bundler ni paso de compilación.
- Los endpoints, el contrato de `localStorage` y la lógica de progreso no cambiaron.

## 2. Estructura

```text
indexInicial.html            # vistas + <link> al CSS + <script src> en orden
public/styles/app.css        # sistema visual del SPA (tokens, componentes, responsive)
public/js/
├── datos/
│   └── modulos.js           # const MODULES: catálogo, lecciones, contenido y quiz
├── nucleo/
│   ├── estado.js            # STORAGE_KEY, state, adminDiagnosticState, loadState/saveState
│   ├── ui.js                # showView, updateNavbar, progreso derivado, insignias
│   ├── api.js               # API_BASE, claves de sesión y apiFetch
│   ├── sesion.js            # saveSession/clearSession, mapa de cursos, progreso
│   └── modales.js           # modal de insignia y gestión de foco del teclado
├── admin/
│   ├── diagnostico-editor.js  # editor editorial del diagnóstico (661 líneas)
│   └── diagnostico-inicio.js  # initializeAdminDiagnostic, loadPilotDuration
├── vistas/
│   ├── acceso.js            # registro, login y logout
│   ├── dashboard.js         # panel: módulos, insignias, tarjetas
│   ├── quiz-diagnostico.js  # simulacro diagnóstico posterior al login
│   ├── curso-modelo.js      # modelo de presentación curso → módulo → lección
│   ├── curso.js             # vista de curso (#view-course)
│   ├── modulo.js            # vista de módulo (#view-module)
│   └── leccion.js           # vista de lección, actividad y progreso (#view-lesson)
└── principal.js             # init(): restaura sesión y arranca la interfaz
```

## 3. Orden de carga y por qué

`indexInicial.html` carga, al final del `<body>` y en este orden:

1. `datos/modulos.js`
2. `nucleo/estado.js`, `nucleo/ui.js`, `nucleo/api.js`
3. `admin/diagnostico-editor.js`, `admin/diagnostico-inicio.js`
4. `nucleo/sesion.js`
5. `vistas/quiz-diagnostico.js`, `vistas/acceso.js`, `vistas/dashboard.js`,
   `vistas/curso-modelo.js`, `vistas/curso.js`, `vistas/modulo.js`, `vistas/leccion.js`
6. `nucleo/modales.js`
7. `principal.js`

Reglas del modelo:

- Son **scripts clásicos** (`<script src>`), no módulos ES. Los scripts clásicos
  comparten el mismo ámbito global léxico, así que `MODULES`, `state` y las
  funciones declaradas en un archivo quedan disponibles para los siguientes sin
  `import`/`export` ni cambios en el código.
- **El orden importa.** Si un archivo usa `state` o una función de otro, debe
  cargarse después. `principal.js` siempre va al final porque ejecuta `init()`.
- No repetir nombres de `const`/`let`/`function` entre archivos: al compartir
  ámbito global, una redeclaración rompe toda la aplicación.
- No añadir `type="module"`: jsdom (usado por las pruebas) no ejecuta módulos ES y
  el proyecto mantiene el requisito de servir archivos sin compilar.
- Cualquier archivo nuevo debe registrarse en el HTML en la posición correcta y
  quedar cubierto por `tests/spa-modular.test.js` (verificación de existencia y
  orden).

## 4. Flujo de datos

```text
public/js/datos/modulos.js  (const MODULES: títulos, contenido HTML, quiz)
        │
        ├─ lo usa el SPA para renderizar rutas y lecciones locales
        └─ lo usan scripts/generar-carga-catalogo.js y
           scripts/auditar-contenido-catalogo.js como fuente del catálogo en PostgreSQL

API /api/v1  ──apiFetch──►  nucleo/api.js
        │                      │
        │                      ├─ nucleo/sesion.js: loadCourseMap, syncProgressFromApi, persistLesson
        │                      └─ vistas/*: consumen state.courseMap y state.progress
        │
state ──► nucleo/estado.js (localStorage `meritodocente_state_v1`)
```

- `MODULES` es la **fuente única de contenido del frontend**. Ya no está dentro
  del HTML: si se edita el contenido de una lección o una pregunta, se edita en
  `public/js/datos/modulos.js`.
- `state.courseMap` guarda la correspondencia curso ↔ módulo ↔ lección de la API y
  `state.progress` el avance real; ambos se sincronizan al iniciar sesión.
- Si la API no responde, el SPA degrada a modo local y lo declara en pantalla; no
  inventa métricas ni contenido.

## 5. Recetas

**Añadir o cambiar contenido de una lección**

1. Editar la lección en `public/js/datos/modulos.js` (`title`, `content`, `quiz`).
2. Mantener 4 opciones plausibles y exactamente una respuesta correcta.
3. Registrar el cambio en `src/seed/data.sql` si la pregunta debe existir en la base.
4. Ejecutar `npm run contenido:catalogo` (auditoría) y `npm run carga:catalogo`
   (regenera `database/loads/`).
5. Validar con `npx jest tests/spa-modular.test.js tests/learning-experience.test.js`.

**Añadir una vista nueva**

1. Crear `public/js/vistas/<nombre>.js` con funciones y manejadores (`window.<accion>`).
2. Añadir el bloque de marcado en `indexInicial.html` con los IDs necesarios.
3. Registrar el `<script src="/js/vistas/<nombre>.js"></script>` después de los
   archivos de los que dependa y antes de `principal.js`.
4. Añadir la vista a `showView` (`nucleo/ui.js`) y su enlace/acción.
5. Cubrir el flujo con una prueba jsdom usando `tests/spa-dom.js`.

**Añadir estilos**

Van en `public/styles/app.css`, con los tokens existentes (`--navy`, `--blue`,
`--teal`). Para componentes nuevos del recorrido de aprendizaje se usa el prefijo
`.lx-`. No volver a introducir bloques `<style>` en el HTML.

**Depurar en el navegador**

`npm run dev` sirve `GET /` con el HTML modular y `GET /js/**`, `GET /styles/**`
desde `public/` mediante `express.static`. En DevTools cada vista y cada archivo
aparecen por separado, con números de línea reales.

## 6. Pruebas

- `tests/spa-dom.js` es el cargador compartido: resuelve `/js/...` y
  `/styles/...` desde el disco con un `ResourceLoader` de jsdom, espera a que el
  SPA exponga `handleRegister` y entrega el `JSDOM` listo. Las pruebas ejecutan
  exactamente los archivos que sirve Express, no una copia del HTML.
- `tests/spa-modular.test.js` es el guardián del contrato: falla si el HTML vuelve
  a tener `<style>` o `<script>` en línea, si un archivo referenciado no existe,
  si aparece `export`/`import`/`type="module"`, si el CSS pierde tamaño o identidad
  visual, si `MODULES` deja de ser consumible, si Express no sirve los recursos o
  si `vercel.json` deja de enrutarlos antes del catch-all.
- Suites jsdom: `spa-ui`, `learning-experience`, `lesson-quiz-spa`,
  `admin-pilot-diagnostic-ui` y `ui-design`.
- Comando completo: `npm test` (21 suites, 144 pruebas) con `DATABASE_URL` y
  `JWT_SECRET` definidos. Detalle del entorno en la sección 8.

## 7. Despliegue

- **Express**: `src/server.js` monta `express.static(public)` antes de las rutas,
  por lo que `/styles/app.css` y `/js/**` se sirven solos en local y en la función
  serverless.
- **Vercel**: `vercel.json` agrega, antes del catch-all del SPA, las rutas
  `/styles/(.*) -> public/styles/$1` y `/js/(.*) -> public/js/$1`, con
  `Cache-Control: public, max-age=0, must-revalidate`. Como los archivos no llevan
  hash en el nombre, esa cabecera evita servir una versión vieja tras un despliegue.
- El resto de rutas sigue igual: `/api/(.*)` y `/health` a la función, `/` e `/indexInicial.html` al SPA, `/diagnostico-piloto` a `diagnosticoPiloto.html`.
- **CSP y manejadores en línea**: Helmet aplica por defecto `script-src-attr 'none'`,
  que bloquea los atributos `onclick`/`onsubmit` del marcado y deja el SPA inerte
  cuando el HTML se sirve por Express (local y `vercel dev`). `src/server.js`
  declara ahora `script-src-attr 'unsafe-inline'` con un comentario que explica la
  deuda; `script-src 'self'` se mantiene (ya no hay `<script>` en línea). La Etapa 2
  elimina esos atributos y devuelve la directiva a `'none'`. En el despliegue
  actual de Vercel el HTML lo sirve la capa estática, así que esa cabecera no se
  aplicaba a Production; el arreglo protege el resto de rutas de servido.
  `tests/spa-modular.test.js` fija el contrato: mientras existan manejadores en
  línea, la CSP servida debe permitirlos.

## 8. Cómo reproducir la validación de la Etapa 1

El checkout puede no tener `.env`. Con cualquier PostgreSQL 14+:

```bash
# 1. Base de pruebas aislada
docker run -d --name merito-test-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_DB=merito_test_local -p 5433:5432 postgres:15

# 2. Esquema, migraciones y seed
psql "postgresql://postgres:postgres@localhost:5433/merito_test_local" -f database/schema.sql
psql "postgresql://postgres:postgres@localhost:5433/merito_test_local" \
  -f database/migrations/20261101_lesson_quiz_responses.sql
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/merito_test_local" npm run seed

# 3. Suite completa
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/merito_test_local" \
JWT_SECRET="clave-local-solo-pruebas" npm test
```

Resultado esperado en la Etapa 1: **21 suites, 144 pruebas, 0 fallos**. La suite
`tests/spa-modular.test.js` aporta 8 pruebas nuevas.

## 9. Límites conocidos y siguiente etapa

Pendiente (no bloquea nada de lo anterior):

- **Manejo de eventos**: el marcado sigue usando 49 `onclick=` y 51 atributos `on*`. Solo funcionan porque la CSP declara `script-src-attr 'unsafe-inline'`; es una deuda explícita, no un estado deseable. La Etapa 2 los sustituye por delegación de eventos en `principal.js` y devuelve la directiva a `'none'`.
- **Rutas del navegador**: no hay `hash`/`pushState`; recargar una vista pierde el
  contexto. Etapa 2: router por hash con URLs compartibles (`#/curso/<id>/leccion/<n>`).
- **Frontends duplicados**: `index.html` + `app.js` (28 KB) siguen publicados como
  integración provisional; `diagnosticoPiloto.html` es una página aparte. Retirarlos
  y unificar el diagnóstico es una tarea propia, con prueba de regresión.
- **Framework**: solo se evaluará por vista y con criterios escritos, cuando el
  router y el manejo de eventos ya estén resueltos. Migrar ahora no resuelve el
  cuello de botella real, que es contenido y evaluación final por curso.
- **Evaluación final por curso**: el SPA no tiene examen final de curso; ese
  contrato (`GET/POST /api/v1/courses/:id/assessment`) y el umbral de aprobación
  quedan para la siguiente fase.

## 10. Evidencia de la Etapa 1 (2026-11-02)

- Extracción verificada: la concatenación de los 16 archivos coincide byte a byte
  con el bloque `<script>` original; el CSS coincide con el bloque `<style>`.
- `node --check` sin errores en los 16 archivos.
- Servidor real (`node src/server.js`): `/` y `/indexInicial.html` 200 (29.929
  bytes, enlazan `app.css`), `/styles/app.css` 200 `text/css` (98.634 bytes),
  `/js/principal.js`, `/js/datos/modulos.js` y `/js/nucleo/sesion.js` 200.
- `npm test`: 21/21 suites y 144/144 pruebas.
- Hallazgo durante la validación (preexistente, no introducido por la Etapa 1): Helmet servía `script-src-attr 'none'` y bloqueaba los `onclick` del SPA cuando el HTML sale por Express; se alineó a `script-src-attr 'unsafe-inline'` con deuda documentada y prueba de contrato. Comprobado en la cabecera real de `GET /`.
- `npm run contenido:catalogo`: 3 cursos, 9 módulos, 11 lecciones, 11
  cuestionarios, 44 opciones y 12.254 caracteres, idéntico al baseline medido
  antes de la extracción.
- **Despliegue verificado (commits `6d17a44` + `ac831c6`, rama
  `recovery/integracion-20261031`)**: `GET https://mooc-docente.vercel.app/` → 200,
  16 `<script src>`, 0 `<style>` en línea y referencia a `/styles/app.css`;
  `/styles/app.css` → 200 `text/css` con `Cache-Control: public, max-age=0,
  must-revalidate`; `/js/principal.js`, `/js/datos/modulos.js` y
  `/js/nucleo/sesion.js` → 200 `application/javascript`; `/api/v1/courses` → 200 y
  `/health` → 200 con `commit: ac831c6`. El HTML, el CSS y tres módulos servidos
  coinciden con el repositorio (mismo SHA-256 al normalizar CRLF), así que el
  despliegue no altera el contenido.
