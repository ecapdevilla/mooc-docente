-- Columna `lessons.descripcion` para bases creadas antes del esquema actual.
--
-- El esquema canónico (`database/schema.sql`, línea 52) ya incluye
-- `descripcion TEXT` en `lessons`; las bases nuevas la crean directamente. Esta
-- migración cierra el desfase para bases existentes nacidas de una versión
-- anterior del esquema (como Supabase antes del 2026-11-03), donde
-- `npm run db:preparar` no añadía la columna y la carga del catálogo fallaba con:
--   ERROR: column "descripcion" of relation "lessons" does not exist.
--
-- Es aditiva e idempotente: si la columna ya existe, no cambia nada.
BEGIN;

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

COMMENT ON COLUMN lessons.descripcion IS
    'Descripción breve de la lección, visible en el mapa del curso del SPA.';

COMMIT;
