# Hoja de ruta del producto - MéritoDocente

## Objetivo del producto

Construir una plataforma web para preparar concursos de méritos docentes. La primera experiencia debe permitir que una persona pruebe el producto sin registrarse mediante un simulacro gratuito. Después podrá crear una cuenta para conservar su progreso, continuar cursos y consultar resultados.

## Decisiones base

- `indexInicial.html` es la fuente de diseño, contenido y flujo de usuario. Se conservará y se convertirá progresivamente en la interfaz funcional.
- No se crearán nuevas interfaces paralelas. `index.html` y `app.js` son código provisional que se integrará o retirará cuando la SPA principal esté conectada.
- Supabase será primero la base de datos PostgreSQL administrada. Se conservarán Express, `pg`, JWT y bcryptjs en la primera fase.
- Vercel se usará después para desplegar el frontend y, si conviene, el backend como funciones o un servicio separado. No se despliega antes de tener una prueba completa local.
- Las preguntas serán contenido administrable, no texto fijo dentro de HTML o JavaScript.

## MVP 1: simulacro gratuito sin registro

### Experiencia del visitante

1. Entra a la página principal.
2. Selecciona `Simulacro gratuito` sin crear cuenta.
3. Ve instrucciones, cantidad de preguntas, tiempo y reglas.
4. Responde una selección inicial de hasta 50 preguntas.
5. Puede avanzar, retroceder, marcar preguntas y finalizar.
6. Recibe puntaje, porcentaje, aciertos, errores y resumen por área.
7. Puede ver una invitación para registrarse y guardar el resultado, sin bloquear el resultado gratuito.

### Reglas recomendadas para la primera versión

- 50 preguntas iniciales cargadas desde el banco publicado.
- Una respuesta correcta por pregunta.
- Orden aleatorio de preguntas y opciones por intento.
- El visitante puede finalizar antes de responder todo.
- El resultado anónimo no debe almacenar nombre, correo, contraseña ni datos sensibles.
- No mostrar la respuesta correcta antes de finalizar.
- Definir el tiempo del simulacro en configuración, no en código de la interfaz.
- El registro posterior no debe alterar retroactivamente la autoría del intento salvo que el usuario elija asociarlo.

### API propuesta

- `GET /api/v1/simulators/free`: devuelve configuración y preguntas públicas sin respuestas correctas.
- `POST /api/v1/simulators/free/attempts`: crea un intento anónimo y devuelve un identificador temporal.
- `POST /api/v1/simulators/free/attempts/:id/finish`: recibe respuestas, valida el intento y devuelve el resultado.
- `GET /api/v1/simulators/free/attempts/:id`: opcional, permite recuperar un intento temporal mientras no expire.

La calificación debe ejecutarse en el backend. La respuesta correcta nunca debe enviarse al navegador antes de finalizar.

## Modelo de datos objetivo

Conservar las tablas actuales de usuarios, cursos, módulos, lecciones, quizzes, opciones, progreso, badges e inscripciones, corrigiendo primero sus inconsistencias.

Añadir o adaptar estas entidades para el simulacro:

- `simulators`: nombre, slug, descripción, activo, duración, cantidad de preguntas y fecha de publicación.
- `simulator_questions`: relación entre simulacro y preguntas publicadas, con orden y peso opcional.
- `simulator_attempts`: identificador, simulador, usuario opcional, estado, iniciado, finalizado, puntaje, aciertos, errores y expiración.
- `simulator_answers`: intento, pregunta, opción seleccionada, correcta y fecha de respuesta.

Alternativa mínima: reutilizar `quizzes` y añadir solo tablas de simulador/intent/respuestas. Elegir esta alternativa si las preguntas de simulacro y de lecciones comparten el mismo formato.

## Flujo de preguntas desde Word hasta la aplicación

1. Recibir el documento Word original.
2. Extraer las preguntas a un formato intermedio estructurado; no copiar HTML manualmente sin validación.
3. Crear un editor administrativo para pegar o importar el contenido.
4. Mostrar una previsualización de cada pregunta y sus opciones.
5. Validar que cada pregunta tenga enunciado, mínimo dos opciones, exactamente una respuesta correcta y explicación opcional.
6. Permitir clasificar por área, tema, dificultad y fuente.
7. Guardar como borrador en Supabase.
8. Revisar y corregir preguntas desde el editor.
9. Publicar una versión del banco para el simulacro.
10. Probar una muestra y luego las 50 preguntas completas.

El editor debe conservar el contenido original y registrar quién creó, editó o publicó cada pregunta. Las preguntas publicadas no deben cambiar silenciosamente un intento ya finalizado; usar versiones o guardar una copia de la pregunta en la respuesta del intento.

## Fases de implementación

### Fase 0 - saneamiento actual

- Corregir `database/schema.sql` y `src/seed/data.sql`.
- Corregir `src/seed/seed.js`.
- Corregir identificación de usuario en progreso, actualización de perfil y badges.
- Alinear respuestas de cursos con el frontend.
- Corregir rutas de scripts y elegir la SPA principal.
- Añadir pruebas de `/health`, autenticación, cursos y progreso.

Criterio de salida: el backend arranca localmente, el esquema se crea sin errores y las pruebas básicas pasan.

### Fase 1 - Supabase

- Crear proyecto Supabase.
- Ejecutar el esquema corregido en el SQL Editor.
- Crear `.env` local desde `.env.example` y configurar `DATABASE_URL` de Supabase.
- Configurar SSL y límites del pool para el entorno de ejecución.
- Cargar datos base de forma idempotente.
- Verificar conexión y operaciones CRUD con la API Express.
- Mantener secretos solo en variables de entorno.

Criterio de salida: el backend local lee y escribe en Supabase mediante la API, sin depender de una base local.

### Fase 2 - simulacro gratuito

- Añadir tablas y migración del simulador.
- Añadir endpoints públicos y validación de respuestas.
- Conectar el flujo de `indexInicial.html`.
- Implementar resultado, temporizador, navegación y manejo de abandono.
- Añadir pruebas para intento anónimo, calificación, repetición y preguntas no publicadas.

Criterio de salida: una persona puede completar un simulacro sin registro y recibe un resultado correcto sin exposición de respuestas.

### Fase 3 - banco y editor de preguntas

- Definir el formato de importación desde Word.
- Implementar editor de borradores y previsualización.
- Importar, revisar y publicar las primeras 50 preguntas.
- Añadir roles y permisos de editor/administrador.
- Versionar preguntas publicadas.

Criterio de salida: las 50 preguntas están en Supabase, revisadas y disponibles para el simulacro sin editar código.

### Fase 4 - cuenta y aprendizaje

- Conectar registro/login con el flujo principal.
- Guardar progreso de cursos, lecciones y badges en Supabase.
- Asociar resultados a una cuenta solo con consentimiento del usuario.
- Convertir los módulos restantes de `localStorage` a API.
- Retirar duplicados y dejar una sola SPA.

Criterio de salida: el usuario registrado continúa cursos y consulta su progreso desde cualquier dispositivo.

### Fase 5 - despliegue

- Separar frontend y API si Vercel no ejecuta el servidor Express completo como está.
- Configurar variables de entorno en Vercel, nunca subir `.env`.
- Configurar CORS con el dominio real.
- Probar rutas públicas, autenticadas y administrativas en producción.
- Añadir dominio, logs, límites y copias de seguridad de Supabase.

Criterio de salida: frontend y API desplegados, con simulacro anónimo y cuenta funcionando en una prueba externa.

## Orden de trabajo inmediato

1. Corregir los bloqueos documentados en `AGENTS.md`.
2. Ejecutar validaciones locales y crear pruebas mínimas.
3. Crear Supabase y conectar PostgreSQL.
4. Definir y cargar el formato de las 50 preguntas.
5. Implementar el simulacro gratuito de extremo a extremo.
6. Implementar el editor de preguntas.
7. Migrar cursos/progreso y consolidar la SPA.
8. Desplegar en Vercel.

## Estado de avance (2026-09-12)

- Fase 0 (saneamiento): completada. Esquema, seed y contratos corregidos; `npm test` pasa 4 suites y 19 pruebas.
- Fase 1 (Supabase): completada. La API opera contra Supabase con `pg`, JWT y bcryptjs.
- Fase 2 (simulacro gratuito): pendiente.
- Fase 3 (banco y editor de preguntas): pendiente. El seed ya carga 4 lecciones y 4 quizzes con 4 opciones y 1 respuesta correcta cada uno.
- Fase 4 (cuenta y aprendizaje): en progreso. `indexInicial.html` registra, inicia sesión y persiste progreso e insignias en la API. Falta reconciliar el contenido de lecciones entre el SPA y la base de datos y retirar `index.html`/`app.js`.
- Fase 5 (despliegue): preparada y no ejecutada. `vercel.json` + `api/index.js` definen frontend estático y API serverless; en Vercel deben configurarse `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production` y `CORS_ORIGIN`.

## Criterios permanentes para agentes

- Antes de editar, leer `AGENTS.md` y solo el archivo dueño del comportamiento.
- No duplicar datos de preguntas en HTML, JavaScript y SQL.
- No exponer respuestas correctas al cliente antes de calificar.
- No usar credenciales de Supabase en archivos versionados.
- Cada cambio debe incluir una validación enfocada y actualizar este documento si cambia la arquitectura.
- Cada entrega debe indicar archivos revisados, cambio, validación, bloqueos y siguiente acción.
