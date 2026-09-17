# Guía de agentes - MéritoDocente

## Propósito

Este archivo es el contexto operativo mínimo para agentes de IA que trabajen en el proyecto. Leerlo antes de explorar el repositorio. Mantenerlo actualizado cuando cambien comandos, arquitectura o decisiones importantes.

## Estado verificado

- Plataforma MOOC para preparación de concursos de méritos docentes.
- Backend: Node.js 18+, Express 4, PostgreSQL, JWT y bcryptjs.
- Frontend: HTML, CSS y JavaScript vanilla; la SPA principal es `indexInicial.html` (autocontenida) y consume la API directamente.
- Punto de entrada backend: `src/server.js`. Escucha solo si se ejecuta directamente y exporta la app para uso serverless.
- API base: `/api/v1`.
- Esquema de datos: `database/schema.sql`.
- Datos iniciales: `src/seed/data.sql` y `src/seed/seed.js`, idempotentes. Las opciones de quiz se reconcilian al reejecutar el seed.
- Base de datos de desarrollo: Supabase (pooler) mediante `DATABASE_URL` en `.env`.
- Pruebas: `tests/` tiene 5 suites (salud, autenticación, cursos, progreso y la interfaz del SPA con jsdom). `npm test` pasa 26/26 (validado 2026-09-16).
- Servido local: `GET /` entrega `indexInicial.html`; `public/` expone `/api-client.js` y `/auth.js` en la raíz.
- Despliegue: `vercel.json` y `api/index.js` preparan frontend estático + API serverless. Aún no desplegado ni verificado en Vercel.
- Git: repositorio inicializado, rama `main`, remoto `origin` apuntando a `https://github.com/ecapdevilla/mooc-docente.git`.
- Deuda menor: el archivo `nulul` en la raíz es un artefacto de shell versionado por error.

## Auditoría de arquitectura (2026-09-10)

La hoja de ruta funcional completa, incluido el simulacro gratuito y la importación de 50 preguntas desde Word, está en `docs/roadmap.md`.

### Arquitectura real

El flujo actual es:

`Frontend -> Express -> rutas con SQL directo -> PostgreSQL`

- `src/server.js` configura Express, seguridad, rate limiting, rutas, `/health` y el arranque condicionado a una conexión válida.
- `src/config/database.js` usa `pg.Pool` y exige `DATABASE_URL`.
- Las consultas están directamente en `src/routes/`; `src/controllers/` y `src/models/` están vacíos.
- `public/api-client.js` y `public/auth.js` son el cliente de API y la gestión de sesión con `localStorage`.
- `app.js` es la lógica que intenta consumir la API.
- `indexInicial.html` es la SPA documentada, pero actualmente usa principalmente módulos y progreso locales; existe una segunda integración en `app.js`.

### Estado validado para el quiz (2026-09-16)

- El login de `indexInicial.html` funciona contra `/api/v1/auth/login`, guarda el token y carga cursos/progreso desde la API.
- Los quizzes de lección ya existen en PostgreSQL mediante `quizzes` y `quiz_options`; `GET /api/v1/courses/:id` devuelve la pregunta y sus opciones.
- La interfaz actual muestra el quiz al abrir una lección, no inmediatamente después de iniciar sesión. Aún no existe el flujo de quiz independiente post-login.
- Las primeras preguntas se alojarán en Supabase/PostgreSQL, no dentro de `indexInicial.html`. Para esta primera carga se usarán `src/seed/data.sql` y `src/seed/seed.js`, manteniendo el seed idempotente.
- Cuando el volumen crezca, las preguntas deberán pasar a un editor administrativo/importador desde Word. Ese editor será la fuente operativa; el seed quedará para datos base y entornos nuevos.
- Antes de cargar preguntas nuevas, validar: enunciado, mínimo dos opciones, exactamente una respuesta correcta, explicación opcional, área/tema y fuente.
- Riesgo conocido: el detalle actual de cursos devuelve `es_correcta` porque el quiz de lección se califica en el navegador. El nuevo quiz independiente post-login debe ocultar la respuesta correcta, calificar en backend y persistir el intento.
- Preguntas incorporadas el 2026-09-16: se creó el curso `Evaluación Educativa y Autonomía Institucional`, con las lecciones `Evaluación integral y autonomía del SIEE` y `PEI, participación y autonomía institucional`. Cada pregunta quedó con 4 opciones y exactamente 1 correcta, con dificultad avanzada y explicaciones ampliadas.
- El listado de cursos quedó ordenado por `id ASC` en `src/routes/courses.js`; al agregar el curso avanzado, el orden por fecha hacía que una prueba de progreso tomara un curso de dos lecciones y devolviera 50% en lugar de 100%.
- El quiz independiente post-login ya cuenta con `GET /api/v1/quizzes/post-login` y `POST /api/v1/quizzes/post-login/attempts`. El primero oculta `es_correcta`; el segundo califica en backend y guarda intentos/respuestas en `quiz_attempts` y `quiz_attempt_answers`.

### Decisión de producto

`indexInicial.html` es la fuente principal de diseño, contenido y flujo de usuario: no es un archivo descartable, sino el prototipo más completo del producto. Los módulos, lecciones, quizzes, badges y pantallas que hoy funcionan con `localStorage` deben migrarse progresivamente a persistencia real.

`index.html` y `app.js` son una integración API provisional. No crear una tercera interfaz ni duplicar módulos. La dirección es conservar la experiencia de `indexInicial.html`, conectar sus acciones con la API y dejar una sola entrada frontend antes del despliegue.

### API registrada

- Pública: `GET /health`, `GET /api/v1/ping/health`, registro, login, listado y detalle de cursos.
- Autenticada: usuario actual, progreso, completar lección, perfil, actualización de perfil e inscripciones.
- Administrativa: listado de usuarios y actualización de usuarios bajo `/api/v1/admin`.
- Quiz post-login: ruta protegida para obtener preguntas sin respuestas correctas y ruta protegida para calificar/persistir el intento.

### Bloqueos funcionales: estado

Todos los bloqueos del inventario anterior (1-12) están corregidos: el seed es idempotente y canónico, el progreso usa `req.user.id`, los badges gestionan `rows`, `validateProgress` se aplica a la ruta, el perfil no toca columnas inexistentes, `tests/` tiene suites reales y `public/` se sirve desde Express.

Corregidos además en la sesión del 2026-09-12:

1. `GET /api/v1/courses/:id` fallaba con 500 (`column "qo.orden" must appear in the GROUP BY clause`, código 42803). El `ORDER BY` debe ir dentro de `json_agg(... ORDER BY ...)`.
2. Al reejecutar el seed quedaban opciones de quiz obsoletas y aparecían quizzes con dos respuestas correctas. Ahora el seed reconcilia las opciones de los quizzes sembrados (4 opciones y 1 correcta por quiz).
3. `public/api-client.js` terminaba con `module.exports`, que lanza `ReferenceError` en el navegador; ahora expone `window.api` y mantiene compatibilidad con Node.
4. `GET /api/v1/progress` no exponía el detalle por lección; ahora cada módulo incluye `lessons` con `completada`.
5. Al cargar el curso de evaluación, `GET /api/v1/courses` podía cambiar el primer curso por el orden de `creado_en`; ahora el orden es determinista por `id ASC`.

Pendientes reconocidos (no bloquean el desarrollo actual):

- `docs/swagger.yaml` no existe, por lo que `/api-docs` no se monta.
- `index.html` y `app.js` siguen siendo la integración provisional; su retiro está planificado.
- El contenido del SPA y el del seed no coinciden lección por lección. El mapeo actual es por orden (módulo del prototipo ↔ curso de la API) y la reconciliación de contenido corresponde a la Fase 3.
- El despliegue en Vercel está configurado pero no ejecutado ni verificado.

## Plan de conexión a Supabase

### Fase 1: Supabase como PostgreSQL administrado (recomendada)

Conservar Express, `pg`, JWT y bcryptjs. Crear el proyecto Supabase, ejecutar el esquema corregido en el SQL Editor, cargar un seed idempotente y poner la cadena PostgreSQL de Supabase en `DATABASE_URL`. Configurar SSL para producción y probar primero `/health`, registro, login, cursos y progreso.

Esta fase no requiere `@supabase/supabase-js`, Supabase Auth ni una reescritura de las consultas. El pooler de Supabase debe usarse según la cadena recomendada por el proyecto y las credenciales deben permanecer solo en `.env`.

Estado (2026-09-12): completada. La API opera contra Supabase con `pg`, JWT y bcryptjs; registro, login, cursos, progreso, perfil e inscripciones responden correctamente y están cubiertos por pruebas.

### Fase 2: consolidación de aplicación

Elegir un único frontend oficial, alinear sus respuestas con la API y separar rutas, controladores y modelos solo cuando exista una necesidad concreta. Añadir pruebas mínimas para salud, autenticación, cursos y progreso.

### Fase 3: servicios nativos de Supabase (opcional)

Evaluar Supabase Auth, Storage y Row Level Security únicamente después de estabilizar la API actual. Es una migración mayor porque cambia identidad, autorización y acceso a datos.

## Punto actual y siguiente acción

Estado (2026-09-16): Supabase conectado y operativo; seed canónico; bloqueos funcionales corregidos; 30 pruebas pasan; `indexInicial.html` registra e inicia sesión contra la API y guarda el progreso en PostgreSQL (con respaldo local si la API no responde); configuración de Vercel preparada pero sin desplegar. Las dos primeras preguntas avanzadas ya están cargadas en Supabase mediante el seed. El diagnóstico independiente aparece en el dashboard después del login, se califica en backend y guarda el intento.

Siguiente acción concreta: revisar el diagnóstico en navegador y ampliar el banco con nuevas preguntas; después construir el editor/importador administrativo para dejar de depender del seed.

## Comandos

```bash
npm install
npm run dev       # nodemon src/server.js
npm start         # node src/server.js
npm run seed      # idempotente; requiere PostgreSQL y variables de entorno
npm test          # 5 suites / 26 pruebas contra la base configurada en .env
```

Requisitos de ejecución: Node.js >= 18, PostgreSQL >= 14 y un `.env` basado en `.env.example`. El servidor verifica la conexión a la base de datos antes de escuchar en el puerto. Con `npm run dev`, el SPA está en `http://localhost:3000/` y la API en `http://localhost:3000/api/v1`. Para reproducir el enrutado de Vercel en local: `npx vercel dev`.

## Mapa rápido

- `src/routes/`: definición de endpoints y middleware asociado.
- `src/controllers/`: manejo de solicitudes y respuestas.
- `src/models/`: consultas y acceso a datos.
- `src/services/`: lógica de negocio reutilizable.
- `src/middleware/auth.js`: autenticación y autorización.
- `src/utils/validators.js`: validación de entradas.
- `indexInicial.html`: SPA principal (diseño, contenido y flujo del producto).
- `public/`: cliente HTTP y autenticación usados por la integración provisional.
- `api/index.js`: entrada serverless de la API para Vercel.
- `vercel.json`: builds y rutas del despliegue (frontend estático + API).
- `database/schema.sql`: tablas, relaciones e índices.
- `docs/architecture.md`: descripción general de arquitectura.

## Contratos importantes

- Autenticación: `Authorization: Bearer <token>`.
- Rutas públicas y protegidas deben conservar el prefijo `/api/v1`.
- Las consultas SQL deben usar parámetros; no concatenar valores recibidos del cliente.
- No exponer secretos de `.env`, tokens ni contraseñas en código, logs o documentación.
- Los cambios de esquema deben incluir la actualización de `database/schema.sql` y del seed cuando aplique.
- Mantener compatibilidad con las respuestas que consume `indexInicial.html` y `public/api-client.js`.
- Preguntas iniciales: guardar en PostgreSQL/Supabase mediante `quizzes` y `quiz_options`; no hardcodearlas en el HTML. Usar el seed para la primera carga y reservar un editor/importador para la gestión posterior.
- Mapeo SPA ↔ API: `indexInicial.html` empareja cada módulo del prototipo con un curso por título, resuelve las lecciones por orden (`modulos[].lecciones[]`) y guarda cada lección completada con `POST /api/v1/progress/lesson/:id`. `GET /api/v1/progress` entrega, por módulo, `lessons` con `completada`.
- Origen de la API en el SPA: `window.MERITO_API_BASE` si está definido; si no, `origen actual + /api/v1`; si no, `http://localhost:3000/api/v1` (apertura con `file://`). Si la API no responde, el SPA degrada a modo local y avisa al usuario.
- Claves de `localStorage` compartidas: `auth_token` y `user`.
- Antes de cambiar un endpoint, revisar su ruta, controlador/modelo y llamada del frontend inmediata; no explorar todo el repositorio sin necesidad.

## Protocolo de trabajo para agentes

1. Leer este archivo y el archivo directamente relacionado con la tarea.
2. Formular una hipótesis local sobre la causa o el cambio requerido.
3. Revisar solo un vecino: ruta, controlador, modelo, cliente o test relacionado.
4. Hacer el cambio más pequeño que pruebe la hipótesis.
5. Ejecutar una validación enfocada antes de continuar. Como mínimo, usar `node --check` sobre los JS modificados; para API usar una prueba HTTP o Jest cuando exista.
6. En el cierre, registrar archivos tocados, validación ejecutada, resultado y bloqueos.

No repetir lecturas ya cubiertas por este archivo. No modificar archivos no relacionados ni rehacer formato por estilo. No crear commits automáticamente.

## Handoff entre agentes

Usar este formato en el mensaje de entrega o en el resumen de la sesión:

```text
Objetivo:
Archivos revisados:
Cambio realizado:
Validación:
Resultado:
Bloqueos o decisiones pendientes:
Siguiente acción concreta:
```

El agente siguiente debe comenzar por `Siguiente acción concreta` y solo ampliar la exploración si la validación lo exige.

## Prioridades pendientes

1. ~~Corregir esquema, seed y contratos de autenticación, progreso y perfil.~~ Hecho (2026-09-12).
2. ~~Añadir pruebas mínimas para salud, autenticación, cursos y progreso.~~ Hecho: 4 suites, 19 pruebas.
3. ~~Crear Supabase y conectar PostgreSQL mediante `DATABASE_URL`.~~ Hecho.
4. Implementar el simulacro gratuito sin registro y su calificación en backend.
5. Crear editor, importar y publicar las primeras 50 preguntas desde Word.
6. Consolidar `indexInicial.html` como única SPA: progreso migrado a la API; falta reconciliar el contenido de lecciones y retirar `index.html`/`app.js`.
7. Verificar el despliegue en Vercel (`vercel.json` y `api/index.js` ya preparados) y definir la estrategia de ramas.
