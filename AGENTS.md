# Guía de agentes - MéritoDocente

## Propósito

Este archivo es el contexto operativo mínimo para agentes de IA que trabajen en el proyecto. Leerlo antes de explorar el repositorio. Mantenerlo actualizado cuando cambien comandos, arquitectura o decisiones importantes.

## Estado verificado

- Plataforma MOOC para preparación de concursos de méritos docentes.
- Backend: Node.js 18+, Express 4, PostgreSQL, JWT y bcryptjs.
- Frontend: HTML, CSS y JavaScript vanilla; la SPA principal está en `indexInicial.html` y usa `public/api-client.js` y `public/auth.js`.
- Punto de entrada backend: `src/server.js`.
- API base: `/api/v1`.
- Esquema de datos: `database/schema.sql`.
- Datos iniciales: `src/seed/data.sql` y `src/seed/seed.js`.
- Pruebas: la carpeta `tests/` está vacía actualmente. `npm test` termina con `No tests found`.
- Git: repositorio inicializado, rama `main`, remoto `origin` apuntando a `https://github.com/ecapdevilla/mooc-docente.git`.
- Swagger es opcional: el servidor solo monta `/api-docs` si existe `docs/swagger.yaml`.

## Auditoría de arquitectura (2026-09-10)

### Arquitectura real

El flujo actual es:

`Frontend -> Express -> rutas con SQL directo -> PostgreSQL`

- `src/server.js` configura Express, seguridad, rate limiting, rutas, `/health` y el arranque condicionado a una conexión válida.
- `src/config/database.js` usa `pg.Pool` y exige `DATABASE_URL`.
- Las consultas están directamente en `src/routes/`; `src/controllers/` y `src/models/` están vacíos.
- `public/api-client.js` y `public/auth.js` son el cliente de API y la gestión de sesión con `localStorage`.
- `app.js` es la lógica que intenta consumir la API.
- `indexInicial.html` es la SPA documentada, pero actualmente usa principalmente módulos y progreso locales; existe una segunda integración en `app.js`.

### Decisión de producto

`indexInicial.html` es la fuente principal de diseño, contenido y flujo de usuario: no es un archivo descartable, sino el prototipo más completo del producto. Los módulos, lecciones, quizzes, badges y pantallas que hoy funcionan con `localStorage` deben migrarse progresivamente a persistencia real.

`index.html` y `app.js` son una integración API provisional. No crear una tercera interfaz ni duplicar módulos. La dirección es conservar la experiencia de `indexInicial.html`, conectar sus acciones con la API y dejar una sola entrada frontend antes del despliegue.

### API registrada

- Pública: `GET /health`, `GET /api/v1/ping/health`, registro, login, listado y detalle de cursos.
- Autenticada: usuario actual, progreso, completar lección, perfil, actualización de perfil e inscripciones.
- Administrativa: listado de usuarios y actualización de usuarios bajo `/api/v1/admin`.

### Bloqueos verificados antes de conectar Supabase

Resolver estos puntos antes de usar datos reales o desplegar:

1. `npm run seed` apunta a `src/seed/seed.js`, pero ese archivo intenta importar `./src/seed/seed` desde su propia carpeta.
2. `src/seed/data.sql` inserta `lessons.descripcion`, columna que no existe en `database/schema.sql`.
3. El seed crea inscripciones y progreso inicial que pueden repetirse y violar las restricciones `UNIQUE`.
4. `src/routes/users.js` actualiza `users.actualizado_en`, columna que no existe en el esquema.
5. `src/routes/progress.js` lee `req.user.usuarioId`; `src/middleware/auth.js` entrega `req.user.id`.
6. La lógica de badges trata `existingBadge` como si fuera el resultado completo de `pool.query`, aunque ya desestructuró `rows`.
7. `validateProgress` está importado pero no se aplica a la ruta.
8. `GET /courses` y `GET /courses/:id` no exponen la misma forma de datos que espera `app.js`.
9. `app.js` envía un módulo a una ruta que espera `lessonId` y no establece de forma consistente `currentLessonId`.
10. `tests/` está vacío; `npm test` termina con `No tests found`.
11. `docs/swagger.yaml` no existe, por lo que `/api-docs` no se monta.
12. `index.html` carga `api-client.js` y `auth.js` desde la raíz, pero esos archivos están en `public/`; el frontend API necesita corregir esas rutas o su estructura de servido.

## Plan de conexión a Supabase

### Fase 1: Supabase como PostgreSQL administrado (recomendada)

Conservar Express, `pg`, JWT y bcryptjs. Crear el proyecto Supabase, ejecutar el esquema corregido en el SQL Editor, cargar un seed idempotente y poner la cadena PostgreSQL de Supabase en `DATABASE_URL`. Configurar SSL para producción y probar primero `/health`, registro, login, cursos y progreso.

Esta fase no requiere `@supabase/supabase-js`, Supabase Auth ni una reescritura de las consultas. El pooler de Supabase debe usarse según la cadena recomendada por el proyecto y las credenciales deben permanecer solo en `.env`.

### Fase 2: consolidación de aplicación

Elegir un único frontend oficial, alinear sus respuestas con la API y separar rutas, controladores y modelos solo cuando exista una necesidad concreta. Añadir pruebas mínimas para salud, autenticación, cursos y progreso.

### Fase 3: servicios nativos de Supabase (opcional)

Evaluar Supabase Auth, Storage y Row Level Security únicamente después de estabilizar la API actual. Es una migración mayor porque cambia identidad, autorización y acceso a datos.

## Punto actual y siguiente acción

Estado: arquitectura inventariada y documentada; `indexInicial.html` definido como fuente de producto; GitHub sincronizado; no hay conexión a Supabase todavía; no se han corregido los bloqueos funcionales listados arriba.

Siguiente acción concreta: corregir esquema/seed y contratos de autenticación, progreso y perfil; ejecutar validaciones locales; después crear el proyecto Supabase y probar la conexión con una `DATABASE_URL` de desarrollo. Luego migrar una vertical completa (login -> cursos -> una lección -> progreso) antes de convertir el resto de módulos.

## Comandos

```bash
npm install
npm run dev       # nodemon src/server.js
npm start         # node src/server.js
npm run seed      # requiere PostgreSQL y variables de entorno
npm test          # actualmente no hay tests; fallará por ausencia de archivos
```

Requisitos de ejecución: Node.js >= 18, PostgreSQL >= 14 y un `.env` basado en `.env.example`. El servidor verifica la conexión a la base de datos antes de escuchar en el puerto.

## Mapa rápido

- `src/routes/`: definición de endpoints y middleware asociado.
- `src/controllers/`: manejo de solicitudes y respuestas.
- `src/models/`: consultas y acceso a datos.
- `src/services/`: lógica de negocio reutilizable.
- `src/middleware/auth.js`: autenticación y autorización.
- `src/utils/validators.js`: validación de entradas.
- `public/`: cliente HTTP y autenticación del frontend.
- `database/schema.sql`: tablas, relaciones e índices.
- `docs/architecture.md`: descripción general de arquitectura.

## Contratos importantes

- Autenticación: `Authorization: Bearer <token>`.
- Rutas públicas y protegidas deben conservar el prefijo `/api/v1`.
- Las consultas SQL deben usar parámetros; no concatenar valores recibidos del cliente.
- No exponer secretos de `.env`, tokens ni contraseñas en código, logs o documentación.
- Los cambios de esquema deben incluir la actualización de `database/schema.sql` y del seed cuando aplique.
- Mantener compatibilidad con las respuestas que consume `indexInicial.html` y `public/api-client.js`.
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

1. Añadir pruebas mínimas para salud, autenticación, cursos y progreso.
2. Decidir si `app.js` y los HTML de la raíz seguirán siendo el frontend oficial o si se consolidarán en una sola entrada.
3. Añadir `docs/swagger.yaml` o corregir la referencia si la documentación OpenAPI no forma parte del alcance.
4. Inicializar Git y documentar una estrategia de ramas antes de trabajo colaborativo. (Git ya está inicializado; falta definir la estrategia.)
5. Revisar respuestas y nombres de campos del frontend contra las rutas reales.
