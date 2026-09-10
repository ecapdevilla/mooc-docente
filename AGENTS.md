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
- Git: esta carpeta no tiene `.git` en el momento de documentar este estado.
- Swagger es opcional: el servidor solo monta `/api-docs` si existe `docs/swagger.yaml`.

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
4. Inicializar Git y documentar una estrategia de ramas antes de trabajo colaborativo.
5. Revisar respuestas y nombres de campos del frontend contra los controladores reales.
