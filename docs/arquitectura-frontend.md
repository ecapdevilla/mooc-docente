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
| `indexInicial.html` | Marcado de todas las vistas, IDs y puntos de integración | 575 líneas / 30 KB |
| `public/styles/app.css` | Toda la hoja de estilos | 3.072 líneas / 98,6 KB |
| `public/js/**` (18 archivos) | Datos, núcleo, vistas, router y arranque | 3.717 líneas / 166 KB |

Lo que **no** cambió en la Etapa 1:

- El marcado, los IDs, las clases y los textos visibles del HTML son los mismos.
- El JavaScript se movió sin reescribirse: la concatenación de los 16 archivos
  originales es byte a byte igual al bloque `<script>` de partida (verificado en la
  extracción).
- **Etapa 2 (T2.1, 2026-11-02):** los atributos `onclick`/`onsubmit` desaparecieron
  del marcado y de las plantillas; ahora son `data-action` + `data-*` resueltos por
  un único oyente delegado en `nucleo/acciones.js`. La CSP vuelve a
  `script-src-attr 'none'`. Ver la sección 4.1.
- Los 15 manejadores publicados en `window` siguen existiendo: la delegación los
  invoca, así que las pruebas y la consola no cambian de contrato. No se introdujo
  ningún framework, bundler ni paso de compilación.
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
│   ├── modales.js           # modal de insignia y gestión de foco del teclado
│   ├── acciones.js          # registro `data-action` y oyente delegado (click/submit)
│   └── ruta.js              # router por hash: rutas, historial y redirecciones
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
│   ├── leccion.js           # vista de lección, actividad y progreso (#view-lesson)
│   └── evaluacion.js        # examen final del curso (#view-assessment)
└── principal.js             # init(): restaura sesión y arranca la interfaz
```

## 3. Orden de carga y por qué

`indexInicial.html` carga, al final del `<body>` y en este orden:

1. `datos/modulos.js`
2. `nucleo/estado.js`, `nucleo/ui.js`, `nucleo/api.js`
3. `admin/diagnostico-editor.js`, `admin/diagnostico-inicio.js`
4. `nucleo/sesion.js`
5. `vistas/quiz-diagnostico.js`, `vistas/acceso.js`, `vistas/dashboard.js`,
   `vistas/curso-modelo.js`, `vistas/curso.js`, `vistas/modulo.js`, `vistas/leccion.js`,
   `vistas/evaluacion.js`
6. `nucleo/modales.js`, `nucleo/acciones.js`, `nucleo/ruta.js`
7. `principal.js` (registra la delegación, ejecuta `init()` y arranca el router
   cuando la sesión ya está resuelta)

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

### 4.1 Delegación de eventos (T2.1)

La CSP se sirve con `script-src-attr 'none'`: ningún atributo del marcado puede
ejecutar JavaScript. El contrato de la interfaz es:

| Antes | Ahora |
| --- | --- |
| `onclick="openCourse('mod1')"` | `data-action="open-course" data-course-id="mod1"` |
| `onclick="showView('dashboard'); return false;"` | `data-action="show-view" data-view="dashboard"` |
| `onsubmit="handleLogin(event)"` | `data-action="handle-login"` |

`nucleo/acciones.js` mantiene el registro `ACCIONES` (nombre → función), registra
un único `click` y un único `submit` en `document` y llama `preventDefault()`
antes de ejecutar la acción, que es el equivalente exacto del antiguo
`return false`. Reglas:

- Una acción nueva se declara en `ACCIONES` y en el marcado; nunca con `on*`.
- Los parámetros viajan en `data-*` y se leen de `dataset`; `accionNumero()`
  normaliza los identificadores ausentes (`""`, `undefined`) a `null`.
- El oyente resuelve el ancestro más cercano con `[data-action]`, así que un
  icono o un `<span>` dentro del botón se comporta igual que el botón.
- Prohibido `eval`/`new Function`: el registro solo asocia nombres a funciones.

Estado verificado: 51 manejadores en línea (27 en `indexInicial.html` y 24 en las
plantillas de `vistas/*.js`) → 0, con 15 acciones registradas.

### 4.2 Router por hash (T2.2)

`nucleo/ruta.js` publica URLs compartibles y da sentido al botón atrás. Cada
vista tiene una ruta y el router la aplica leyendo `location.hash`:

| Ruta | Vista | Notas |
| --- | --- | --- |
| `#/` | landing de matrícula | con sesión redirige a `#/dashboard` |
| `#/acceso` | landing con el formulario a la vista | destino cuando falta sesión |
| `#/dashboard` | panel | requiere sesión |
| `#/curso/<curso>` | vista de curso | `<curso>` es el id de `MODULES` (`mod1`…) |
| `#/modulo/<curso>[/<módulo>]` | vista de módulo | `<módulo>` es el id de la API; sin él, el primero |
| `#/leccion/<curso>/<índice>` | vista de lección | índice 0-based, como `state.currentLesson` |
| `#/evaluacion/<curso>` | evaluación final del curso | requiere sesión; el servidor califica y decide el veredicto |
| `#/diagnostico` | simulacro del panel | abre el panel y conserva la ruta al recargar |
| `#/admin/diagnostico` | editor de preguntas | solo rol `admin` |

Reglas del contrato:

- **Una sola fuente de verdad.** `openCourse`, `openModule` y `openLesson` fijan
  el estado y llaman a `showView`; al final de `showView` el router escribe la
  URL con `history.pushState`. Como `pushState` no dispara `hashchange`, no hay
  doble render. `principal.js` llama a `iniciarRuta()` cuando `refreshSession()`
  ya resolvió, así que un enlace profundo encuentra la sesión y el `courseMap`.
- **Atrás/adelante.** `popstate` y `hashchange` aplican la ruta sin escribir en el
  historial. Durante la aplicación se usa `replaceState`, así que los alias se
  canonizan sin añadir entradas.
- **Enlaces profundos protegidos.** Sin sesión, cualquier ruta protegida lleva a
  `#/acceso`, muestra la landing con el formulario y abre el modal de sesión.
- **Rutas inválidas.** Curso o lección inexistente cae al panel (con sesión) o al
  inicio (sin sesión); nunca queda una vista vacía.
- **Alias compartibles.** `#/modulo/<id API>` y `#/leccion/<id API>` resuelven el
  curso con `state.courseMap` y se canonizan a la forma larga. Las rutas
  canónicas llevan el curso porque el SPA también funciona en modo local, donde
  los identificadores de la base de datos no existen.
- **Sin reescrituras en el servidor.** El fragmento no viaja al servidor: Vercel
  y Express siguen sirviendo `GET /` para todas las rutas.
- **`?vista=panel`** se mantiene como compatibilidad: con sesión redirige a
  `#/dashboard` antes de aplicar la ruta inicial.

## 5. Recetas

**Añadir o cambiar contenido de una lección**

1. Editar la lección en `public/js/datos/modulos.js` (`title`, `content`, `quiz`).
2. Mantener 4 opciones plausibles y exactamente una respuesta correcta.
3. Registrar el cambio en `src/seed/data.sql` si la pregunta debe existir en la base.
4. Ejecutar `npm run contenido:catalogo` (auditoría) y `npm run carga:catalogo`
   (regenera `database/loads/`).
5. Validar con `npx jest tests/spa-modular.test.js tests/learning-experience.test.js`.

**Añadir una vista nueva**

1. Crear `public/js/vistas/<nombre>.js` con las funciones de la vista.
2. Añadir el bloque de marcado en `indexInicial.html` con los IDs necesarios.
3. Registrar el `<script src="/js/vistas/<nombre>.js"></script>` después de los
   archivos de los que dependa y antes de `principal.js`.
4. Añadir la vista a `showView` (`nucleo/ui.js`), su ruta en `nucleo/ruta.js` y,
   si hay controles nuevos, declarar su acción en `nucleo/acciones.js` y usarla
   como `data-action`. No añadir `onclick`/`on*`: la CSP (`script-src-attr
   'none'`) los bloquea.
5. Si la ruta lleva parámetros, sincronizarla en `sincronizarRutaDeVista` y
   resolver el enlace en `navegarSegunRuta` con guarda de sesión.
6. Cubrir el flujo con una prueba jsdom usando `tests/spa-dom.js`, provocando
   clics reales (`.click()`), no llamadas directas, para validar la delegación.

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
- `tests/spa-acciones.test.js` (T2.1) protege la delegación: exige cero
  manejadores en línea en el HTML y en todos los módulos, comprueba que cada
  `data-action` declarado existe en `ACCIONES`, verifica que `acciones.js` se carga
  antes de `principal.js` y provoca clics y envíos reales en jsdom (modal de
  sesión, panel → curso, quiz de lección, completar lección, índice de lecciones).
- `tests/spa-ruta.test.js` (T2.2) protege el router: comprueba el lugar de
  `nucleo/ruta.js` en el pipeline, la normalización y construcción de rutas, las
  redirecciones sin sesión (`#/dashboard` → `#/acceso` con modal abierto), el
  `hashchange` manual, la navegación programática de curso/módulo/lección, el
  botón atrás real (`history.back()`), los alias por id de la API y la ruta del
  simulacro.
- `tests/course-assessment-spa.test.js` (T2.4) protege la vista del examen final:
  botón del curso → `#/evaluacion/<curso>`, preguntas sin `es_correcta` ni
  explicaciones, `POST` con solo `questionId`/`optionId` y resultado pintado con
  el veredicto del servidor.
- Suites jsdom: `spa-ui`, `spa-acciones`, `spa-ruta`, `course-assessment-spa`,
  `learning-experience`, `lesson-quiz-spa`, `admin-pilot-diagnostic-ui` y
  `ui-design`.
- Comando completo: `npm test` (26 suites, 196 pruebas) con `DATABASE_URL` y
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
- **Rutas del SPA**: desde T2.2 son fragmentos (`#/curso/mod1`, `#/leccion/mod1/2`…).
  El fragmento no llega al servidor, así que no hacen falta reescrituras
  adicionales en `vercel.json` ni en Express: `GET /` sigue siendo la única
  entrada y el router resuelve la vista en el navegador.
- **CSP estricta**: `src/server.js` declara `script-src-attr 'none'` (valor por
  defecto de Helmet, ahora explícito como contrato) porque el marcado ya no tiene
  atributos `on*`. `script-src 'self'` se mantiene: tampoco hay `<script>` en
  línea. Si alguien reintroduce un `onclick`, el navegador lo bloquea y fallan
  `tests/spa-modular.test.js` y `tests/spa-acciones.test.js`.
- **Alcance real de la cabecera**: en Production el HTML lo sirve la capa estática
  de Vercel, que **no** añade CSP; la directiva se aplica en las respuestas de la
  función Express (`/health`, `/api/v1/**`), en `npm run dev` y en `vercel dev`.
  Para forzarla también en el HTML publicado hay que declararla en
  `vercel.json` (`headers`); queda como tarea propia, con verificación de que los
  CDN de Font Awesome y Google Fonts siguen permitidos.
- Consecuencia práctica: cualquier control nuevo debe declarar `data-action` y su
  entrada en `nucleo/acciones.js`; no existe atajo por atributo.

## 8. Cómo reproducir la validación de la Etapa 1

El `.env` del checkout apunta a un PostgreSQL local (`meritodocente` en
`127.0.0.1:5432`), que suele estar vacío tras un clon. Para una base aislada de
pruebas, con cualquier PostgreSQL 14+:

```bash
# 1. Base de pruebas aislada
docker run -d --name merito-test-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_DB=merito_test_local -p 5433:5432 postgres:15

# 2. Esquema, migraciones y seed
#    `db:preparar` es idempotente: aplica database/schema.sql y las migraciones
#    versionadas, y omite las del editor piloto (requieren tablas base que solo
#    existen en Supabase) sin abortar.
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/merito_test_local" npm run db:preparar
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/merito_test_local" npm run seed

# 3. Suite completa
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/merito_test_local" \
JWT_SECRET="clave-local-solo-pruebas" npm test
```

Resultado esperado tras T2.2: **23 suites, 168 pruebas, 0 fallos**. La suite
`tests/spa-modular.test.js` aporta 8 pruebas, `tests/spa-acciones.test.js` 9
(4 de contrato estático y 5 de comportamiento delegado en jsdom) y
`tests/spa-ruta.test.js` 15 (5 de contrato y 10 de navegación real en jsdom).

## 9. Límites conocidos y siguiente etapa

Pendiente (no bloquea nada de lo anterior):

- **Manejo de eventos**: ~~el marcado usa 49 `onclick` y 51 atributos `on*`;
  funciona solo porque la CSP declara `script-src-attr 'unsafe-inline'`~~.
  Resuelto en T2.1: 0 atributos `on*`, delegación única en `nucleo/acciones.js` y
  CSP en `'none'`. Ver la sección 4.1.
- **Rutas del navegador**: ~~no hay `hash`/`pushState`; recargar una vista pierde
  el contexto~~. Resuelto en T2.2: router por hash con URLs compartibles, botón
  atrás y enlaces profundos; ver la sección 4.2. Queda como límite que
  `#/leccion` use el índice de la lección en el curso (los alias por id de la API
  cubren el enlace estable) y que el estado del simulacro en curso no se
  reconstruya al recargar `#/diagnostico`: se vuelve a pedir el cuestionario.
- **Frontends duplicados**: resuelto en la T2.5 (2026-11-02). `index.html`,
  `app.js`, `public/api-client.js` y `public/auth.js` se retiraron, junto con sus
  rutas de Express y `vercel.json`; `tests/spa-modular.test.js` impide
  reintroducirlos. `diagnosticoPiloto.html` sigue siendo una página aparte del
  piloto, documentada en su propio flujo.
- **Framework**: solo se evaluará por vista y con criterios escritos, cuando el
  router y el manejo de eventos ya estén resueltos. Migrar ahora no resuelve el
  cuello de botella real, que es contenido y evaluación final por curso.
- **Evaluación final por curso**: contrato de backend hecho en T2.4
  (`GET/POST /api/v1/courses/:id/assessment`, umbral en
  `COURSE_ASSESSMENT_PASSING_SCORE`); falta la vista del SPA y la decisión del
  umbral definitivo. Ver la sección 11.

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

### T2.1 · Delegación de eventos y CSP estricta (2026-11-02)

- Inventario de partida: **51 manejadores en línea** (49 `onclick` + 2 `onsubmit`),
  27 en `indexInicial.html` y 24 en las plantillas de `vistas/curso.js`,
  `vistas/dashboard.js`, `vistas/leccion.js` y `vistas/modulo.js`. Estado final:
  **0**.
- Sustitución mecánica verificada: el codemod exigió el número exacto de
  coincidencias por operación antes de escribir; ninguna operación quedó sin
  aplicar. Se eliminaron dos variables que solo existían para interpolar los
  manejadores (`moduloArg`, `siguienteArg`).
- Registro nuevo `public/js/nucleo/acciones.js` (15 acciones) y un único
  `click`+`submit` en `document`, activado al inicio de `init()`.
- `src/server.js`: `script-src-attr` vuelve a `'none'`; el comentario documenta el
  contrato en lugar de la deuda.
- Pruebas: `tests/spa-modular.test.js` invierte el contrato de CSP (0 manejadores y
  directiva `'none'`); `tests/spa-acciones.test.js` añade 9 pruebas, 5 de ellas con
  clics y `submit` reales sobre jsdom.
- Validación ejecutada: `node --check` en los 5 archivos modificados y en
  `acciones.js`; `npm test` → **22/22 suites y 153/153 pruebas**; servidor real en
  el puerto 3107 → `/` 200 con 17 `<script src>`, 0 manejadores y
  `script-src-attr 'none'`; `/js/nucleo/acciones.js` 200 `application/javascript`
  (3.343 bytes); `/styles/app.css` 200 `text/css`; `/api/v1/courses` 200.
- Nota de entorno: este checkout no incluye `.env`; la suite se ejecutó contra el
  PostgreSQL local documentado en la sección 8 (`merito_test_local`), sin tocar la
  base de Supabase ni Production.
- **Despliegue verificado en Production (commit `833e8f6`)**: `GET
  https://mooc-docente.vercel.app/` → 200 con **17** `<script src>` (incluye
  `/js/nucleo/acciones.js`) y **0** manejadores en línea; `/js/nucleo/acciones.js`
  → 200 `application/javascript`; `/styles/app.css` → 200 `text/css`;
  `/health` reporta `commit: 833e8f6`. El HTML, `acciones.js` y `principal.js`
  servidos tienen el mismo SHA-256 que el repositorio al normalizar CRLF.
- Matiz del despliegue: la CSP `script-src-attr 'none'` aparece en las respuestas
  de la función Express, no en `/` ni en `/js/**`, que Vercel sirve desde su capa
  estática. El SPA ya no depende de esa cabecera para funcionar: no hay atributos
  `on*` que bloquear.

### T2.2 · Router por hash (2026-11-02)

- Archivo nuevo `public/js/nucleo/ruta.js` (431 líneas, 15.115 bytes): constantes
  de ruta, normalización del hash, constructores de URL, resolución de curso,
  módulo y lección, guardas de sesión, `aplicarRuta` y `iniciarRuta`. Se carga
  entre `nucleo/acciones.js` y `principal.js`; el SPA pasa de 17 a 18 archivos.
- `nucleo/ui.js`: al final de `showView` se llama a `sincronizarRutaDeVista`, que
  deriva la URL del estado que fijaron `openCourse`, `openModule` y `openLesson`.
  No se duplicó la lógica de navegación ni se añadió estado nuevo al router.
- `principal.js`: `iniciarRuta()` se ejecuta cuando `refreshSession()` resolvió
  (antes solo se pre-renderizaba el panel). `?vista=panel` sigue funcionando y
  redirige a `#/dashboard`.
- `vistas/quiz-diagnostico.js`: abrir el simulacro fija `#/diagnostico`; cerrarlo
  vuelve a `#/dashboard`.
- Pruebas: `tests/spa-ruta.test.js` con 15 pruebas (5 de contrato estático y 10 de
  navegación real: redirección sin sesión, `hashchange` manual, curso/módulo/
  lección, `history.back()` real, alias por id de la API y simulacro).
  `tests/spa-modular.test.js` exige 18 scripts y el orden de `ruta.js`.
- Validación ejecutada: `node --check` en `ruta.js`, `ui.js`, `principal.js`,
  `quiz-diagnostico.js` y la suite nueva; `npm test` → **23/23 suites y 168/168
  pruebas**; servidor real en el puerto 3107 → `/` 200 (30.148 bytes) con 18
  `<script src>`, 1 referencia a `/js/nucleo/ruta.js`, **0** manejadores `on*` y
  `script-src-attr 'none'`; `/js/nucleo/ruta.js` → 200 `application/javascript`
  (15.115 bytes); `/styles/app.css` → 200 `text/css`.
- Nota de entorno: el PostgreSQL de `127.0.0.1:5432` estaba en modo de
  recuperación; la suite se ejecutó contra `merito_test_local` en
  `127.0.0.1:5433`, sin tocar Supabase ni Production.
- **Despliegue verificado en Production (código en `fe7770c`; los commits posteriores solo tocan documentación)**: `GET
  https://mooc-docente.vercel.app/` → 200 con **18** `<script src>` (incluye
  `/js/nucleo/ruta.js` antes de `principal.js`) y **0** manejadores en línea;
  `/js/nucleo/ruta.js` → 200 `application/javascript`; `/js/principal.js` → 200
  `application/javascript`; `/styles/app.css` → 200 `text/css`; `/health` reporta
  `commit: fe7770c`. El HTML, `ruta.js` y `principal.js` servidos tienen el mismo
  SHA-256 que el repositorio al normalizar CRLF.

## 11. Backend del examen final por curso (T2.4, 2026-11-02)

Contrato completo en `docs/evaluacion-final-por-curso.md`. Resumen:

- `src/services/courseAssessment.js`: lectura del banco del curso, agrupación de
  preguntas con sus opciones, calificación contra `quiz_options.es_correcta`,
  umbral configurable (`COURSE_ASSESSMENT_PASSING_SCORE`, 80 % por defecto),
  requisito opcional de lecciones (`COURSE_ASSESSMENT_REQUIRES_LESSONS`),
  desempeño por lección y áreas prioritarias.
- `src/routes/courses.js`: `GET /:id/assessment` (preguntas sin clave, umbral,
  requisitos e historial de los últimos cinco intentos) y
  `POST /:id/assessment/attempts` (validación, calificación, persistencia y
  respuesta con `results`, `porLeccion` y `areasPrioritarias`).
- `database/migrations/20261102_course_assessment.sql`: añade a `quiz_attempts`
  `curso_id`, `alcance` (`diagnostico` | `evaluacion_curso`) y `aprobado`, más
  el índice parcial `idx_quiz_attempts_usuario_curso`. Es aditiva, idempotente y
  reversible; `database/schema.sql` ya refleja el estado final.
- El cliente solo envía `answers: [{ questionId, optionId }]`; `puntaje`,
  `aprobado` o resultados enviados por el cliente se ignoran. Cada envío crea un
  intento nuevo con snapshot de pregunta y opción (historial append-only).
- Sin migración aplicada, ambos endpoints responden `503` con mensaje explícito
  en lugar de `500`.
- Pruebas nuevas: `tests/course-assessment.test.js` (20, base simulada),
  `tests/course-assessment-db.test.js` (5, PostgreSQL real: banco del curso,
  persistencia de `curso_id`/`alcance`/`aprobado`, historial y envío
  incompleto) y `tests/course-assessment-spa.test.js` (3, jsdom: botón del
  curso, ruta `#/evaluacion/<curso>`, preguntas sin clave y `POST` mínimo).
- Validación ejecutada: `node --check` en el servicio, la ruta y los módulos del
  SPA tocados; migración aplicada dos veces sobre `merito_test_local`
  (`127.0.0.1:5433`) sin errores; `npm test` → **26/26 suites y 196/196
  pruebas**. No se tocó Supabase ni Production.
- Pendiente: umbral definitivo, insignia solo al aprobar el examen final y banco
  verificado del curso #1.

## 12. T2.5 · frontend único y CSP estática (2026-11-02)

Cierre de la etapa de consolidación: `indexInicial.html` es la única entrada.

- **Retirados:** `index.html`, `app.js`, `public/api-client.js` y
  `public/auth.js`. Con ellos se fueron las rutas `GET /index.html` y
  `GET /app.js` de `src/server.js`, las entradas de `builds`/`routes` de
  `vercel.json` y la mención en el cargador de `tests/spa-dom.js`. No había otro
  consumidor: el SPA usa `public/js/nucleo/api.js` y `public/js/nucleo/sesion.js`.
- **CSP en la capa estática:** `vercel.json` declara `Content-Security-Policy`
  dentro de las rutas legacy `/` y `/(.*)`, además de
  `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`. El valor es
  el mismo que genera Helmet en `src/server.js`, de modo que `npm run dev` y
  Production aplican la misma política. Ojo: con `builds` + `routes` el arreglo
  `headers` de nivel superior se ignora; las cabeceras van por ruta. Detalle en
  `docs/deploy-vercel.md`, sección 7.
- **Guardas nuevas** en `tests/spa-modular.test.js` (10 pruebas): los cuatro
  archivos no existen ni aparecen en `vercel.json`, y la CSP de Vercel coincide
  carácter a carácter con la de `GET /` en Express.
- **Validación:** `node --check src/server.js` y `tests/*.js` tocados; `vercel.json`
  parseado con `require()`; `npx jest tests/spa-modular.test.js` → 10/10;
  suite completa → 26/26 suites y 198/198 pruebas.
- **Despliegue verificado** en `https://mooc-docente.vercel.app`: `/health`
  reportó el SHA publicado, `/` 200 con 19 `<script src>`, `/js/vistas/evaluacion.js`
  200 `application/javascript`, `/styles/app.css` 200 `text/css` y
  `/api/v1/courses` 200.
