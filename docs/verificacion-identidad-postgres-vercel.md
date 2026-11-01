# Verificación temporal de identidad PostgreSQL en Vercel

## Resultado registrado

El equipo informó que la ruta temporal `GET /api/v1/admin/database-identity`, publicada en el commit `0cc5d12`, se consultó con la cuenta administrativa usando el pool PostgreSQL del backend. El resultado comunicado fue `current_user = postgres` y `rolbypassrls = true`. Este documento registra el resultado informado; no contiene credenciales ni la URL de conexión.

La ruta temporal se elimina del próximo despliegue del administrador. En el candidato local, la retirada se limita a ese handler; las rutas administrativas existentes siguen protegidas por `authenticate` y `authorize('admin')`. La prueba `tests/admin-routes.test.js` verifica que la ruta de usuarios continúa operativa y que la ruta temporal responde `404`.

Si la configuración de base de datos de Vercel cambia, esta verificación deja de ser evidencia del nuevo destino. En ese caso debe aprobarse una consulta de runtime protegida y de solo lectura antes de instalar cambios que dependan de `BYPASSRLS`. No usar SQL dinámico, no exponer credenciales y no asumir que SQL Editor utiliza la identidad del pool de Vercel.

## Retirada al publicar el administrador

1. Revisar que `src/routes/admin.js` no contenga el handler `/database-identity`.
2. Ejecutar `node --check src/routes/admin.js` y `npm test -- --runInBand tests/admin-routes.test.js`.
3. Confirmar que `git diff -- src/routes/admin.js` elimina únicamente el endpoint temporal y conserva `/users` y `/users/:id`.
4. Después de una publicación autorizada, comprobar que `/api/v1/admin/database-identity` responde `404` y que un administrador aún puede abrir las rutas administrativas vigentes.
