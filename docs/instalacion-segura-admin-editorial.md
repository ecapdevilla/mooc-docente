# Preparación de despliegue: administrador editorial del diagnóstico

**Estado:** preparado localmente; no instalado ni publicado.
**Rama prevista:** `recovery/integracion-20261031`.
**Base conectada a Vercel:** considerada Production por instrucción del equipo, aunque el proyecto Supabase se denomine «pruebas».

## Alcance y límites

La fuente canónica del DDL es [`../database/migrations/20261031_pilot_editorial_drafts.sql`](../database/migrations/20261031_pilot_editorial_drafts.sql). Este procedimiento no duplica ni modifica esa migración. No crea o corrige preguntas publicadas, no modifica `md_pilot_attempts` ni sus respuestas, y no incluye publicación editorial.

El procedimiento es una guía para una futura ventana aprobada. **No se ha aplicado en Supabase ni en Vercel.** No ejecutar comandos de conexión mientras Production no esté autorizada expresamente.

## 1. Comprobaciones previas

1. Confirmar que se está en `recovery/integracion-20261031`, con el diff revisado y las pruebas locales aprobadas.
2. Confirmar que el destino es la base oficial de Production. No decidir por el nombre del proyecto Supabase.
3. En una sesión SQL de solo lectura contra el destino, comprobar que el `search_path` incluye `public` y que las tablas base están en ese esquema:

   ```sql
   SELECT current_schema(), current_schemas(true);

   SELECT to_regclass('public.users') AS users,
          to_regclass('public.md_pilot_exams') AS exams,
          to_regclass('public.md_pilot_questions') AS questions,
          to_regclass('public.md_pilot_options') AS options,
          to_regclass('public.md_pilot_attempts') AS attempts,
          to_regclass('public.md_pilot_attempt_answers') AS attempt_answers;
   ```

   Todos los objetos de la segunda consulta deben existir. No ejecutar la migración si el `search_path` no apunta al esquema previsto.

4. Confirmar tipos y columnas que requiere el DDL y la API:

   ```sql
   SELECT table_schema, table_name, column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND (
       (table_name = 'users' AND column_name = 'id') OR
       (table_name = 'md_pilot_exams' AND column_name IN ('codigo', 'version')) OR
       (table_name = 'md_pilot_questions' AND column_name IN
         ('id', 'codigo', 'orden', 'categoria', 'evidencia', 'enunciado', 'clave', 'justificacion')) OR
       (table_name = 'md_pilot_options' AND column_name IN
         ('question_id', 'codigo', 'texto', 'retroalimentacion'))
     )
   ORDER BY table_name, ordinal_position;
   ```

   Se esperan, como mínimo, `users.id INTEGER`, `md_pilot_exams.codigo TEXT`, `md_pilot_exams.version TEXT`, `md_pilot_questions.id/codigo TEXT`, y las columnas consumidas de preguntas y opciones. Los campos originales `evidencia` y `justificacion` pueden ser nulos: el administrador los reporta para revisión y no les inventa valores.

5. Confirmar que existen las claves únicas/primarias requeridas por las referencias:

   ```sql
   SELECT conrelid::regclass AS tabla, conname, contype,
          pg_get_constraintdef(oid) AS definicion
   FROM pg_constraint
   WHERE conrelid IN (
     'public.users'::regclass,
     'public.md_pilot_exams'::regclass,
     'public.md_pilot_questions'::regclass
   )
     AND contype IN ('p', 'u', 'f')
   ORDER BY tabla::text, conname;
   ```

   Deben existir claves primarias/únicas para `users(id)`, `md_pilot_exams(codigo)` y `md_pilot_questions(id)`.

6. Confirmar que `gen_random_uuid()` está disponible:

   ```sql
   SELECT to_regprocedure('gen_random_uuid()') IS NOT NULL AS uuid_function_available;
   ```

7. Comprobar que no hay objetos editoriales con esos nombres. La migración no es un instalador idempotente: ante cualquier colisión se debe detener y revisar el objeto; no renombrar ni borrar objetos para “hacerla pasar”.

   ```sql
   SELECT object_name, to_regclass('public.' || object_name) AS relation
   FROM unnest(ARRAY[
     'md_pilot_editorial_versions',
     'md_pilot_editorial_questions',
     'md_pilot_editorial_options',
     'md_pilot_editorial_audit',
     'md_pilot_editorial_audit_id_seq',
     'md_pilot_editorial_versions_exam_idx',
     'md_pilot_editorial_questions_version_category_idx',
     'md_pilot_editorial_questions_source_idx',
     'md_pilot_editorial_audit_question_created_idx'
   ]) AS names(object_name)
   WHERE to_regclass('public.' || object_name) IS NOT NULL;

   SELECT p.proname
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'md_pilot_editorial_guard_version',
       'md_pilot_editorial_guard_child',
       'md_pilot_editorial_audit_immutable',
       'md_pilot_editorial_validate_question_shape'
     );

   SELECT tgname, tgrelid::regclass
   FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgname IN (
       'md_pilot_editorial_versions_immutable',
       'md_pilot_editorial_questions_immutable',
       'md_pilot_editorial_options_immutable',
       'md_pilot_editorial_audit_append_only',
       'md_pilot_editorial_audit_no_truncate',
       'md_pilot_editorial_question_shape_check',
       'md_pilot_editorial_option_shape_check'
     );
   ```

   Las tres consultas de colisiones deben devolver cero filas.

   Como control automático adicional, ejecutar este bloque de solo lectura antes de la migración. Falla antes de crear objetos si el esquema, los tipos, las claves o los nombres no son los esperados:

   ```sql
   DO $preflight$
   DECLARE
     required_column RECORD;
     actual_type TEXT;
     required_key RECORD;
     required_object TEXT;
   BEGIN
     IF current_schema() <> 'public' THEN
       RAISE EXCEPTION 'El search_path debe resolver public como esquema actual';
     END IF;
     IF current_setting('server_version_num')::INTEGER < 130000 THEN
       RAISE EXCEPTION 'Se requiere PostgreSQL 13 o posterior';
     END IF;
     IF to_regprocedure('gen_random_uuid()') IS NULL THEN
       RAISE EXCEPTION 'No está disponible gen_random_uuid()';
     END IF;

     FOR required_column IN
       SELECT * FROM (VALUES
         ('users', 'id', 'integer'),
         ('md_pilot_exams', 'codigo', 'text'),
         ('md_pilot_exams', 'version', 'text'),
         ('md_pilot_questions', 'id', 'text'),
         ('md_pilot_questions', 'codigo', 'text'),
         ('md_pilot_questions', 'orden', 'integer'),
         ('md_pilot_questions', 'categoria', 'text'),
         ('md_pilot_questions', 'evidencia', 'text'),
         ('md_pilot_questions', 'enunciado', 'text'),
         ('md_pilot_questions', 'clave', 'text'),
         ('md_pilot_questions', 'justificacion', 'text'),
         ('md_pilot_options', 'question_id', 'text'),
         ('md_pilot_options', 'codigo', 'text'),
         ('md_pilot_options', 'texto', 'text'),
         ('md_pilot_options', 'retroalimentacion', 'text')
       ) AS required(table_name, column_name, data_type)
     LOOP
       actual_type := NULL;
       SELECT c.data_type INTO actual_type
       FROM information_schema.columns c
       WHERE c.table_schema = 'public'
         AND c.table_name = required_column.table_name
         AND c.column_name = required_column.column_name;

       IF actual_type IS DISTINCT FROM required_column.data_type THEN
         RAISE EXCEPTION 'Columna incompatible o ausente: public.%.% (esperado %, encontrado %)',
           required_column.table_name, required_column.column_name,
           required_column.data_type, coalesce(actual_type, '<ausente>');
       END IF;
     END LOOP;

     FOR required_key IN
       SELECT * FROM (VALUES
         ('users', 'id'),
         ('md_pilot_exams', 'codigo'),
         ('md_pilot_questions', 'id')
       ) AS required(table_name, column_name)
     LOOP
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         JOIN pg_attribute a ON a.attrelid = t.oid AND a.attname = required_key.column_name
         WHERE n.nspname = 'public'
           AND t.relname = required_key.table_name
           AND c.contype IN ('p', 'u')
           AND c.conkey = ARRAY[a.attnum]::SMALLINT[]
       ) THEN
         RAISE EXCEPTION 'Falta clave primaria/única compatible: public.%(%)',
           required_key.table_name, required_key.column_name;
       END IF;
     END LOOP;

     FOREACH required_object IN ARRAY ARRAY[
       'md_pilot_editorial_versions',
       'md_pilot_editorial_questions',
       'md_pilot_editorial_options',
       'md_pilot_editorial_audit',
       'md_pilot_editorial_audit_id_seq',
       'md_pilot_editorial_versions_exam_idx',
       'md_pilot_editorial_questions_version_category_idx',
       'md_pilot_editorial_questions_source_idx',
       'md_pilot_editorial_audit_question_created_idx'
     ]
     LOOP
       IF to_regclass('public.' || required_object) IS NOT NULL THEN
         RAISE EXCEPTION 'Ya existe un objeto relacional con nombre reservado: public.%', required_object;
       END IF;
     END LOOP;

     IF EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname LIKE 'md_pilot_editorial_%'
     ) OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE NOT tgisinternal AND tgname LIKE 'md_pilot_editorial_%'
     ) THEN
       RAISE EXCEPTION 'Ya existen funciones o triggers editoriales; detener instalación';
     END IF;
   END;
   $preflight$;
   ```

   Un resultado `DO` sin error permite continuar. No elimina ni cambia objetos y no reemplaza la revisión del esquema ni el respaldo.

8. **Identidad PostgreSQL del backend: confirmada según el equipo (2026-11-01).** La consulta temporal `GET /api/v1/admin/database-identity`, publicada en `0cc5d12`, fue ejecutada usando el pool del backend y el equipo confirmó `current_user = postgres` y `rolbypassrls = true`. No se registran secretos ni la URL de conexión. El endpoint temporal se retirará en el siguiente despliegue del administrador.

   Como las cuatro tablas usarán `FORCE ROW LEVEL SECURITY` y no tendrán políticas, el usuario efectivo de la API debe tener `BYPASSRLS` (o ser superusuario) y privilegios efectivos sobre las tablas y la secuencia de auditoría. Sin ello, la API puede ver cero versiones o fallar al insertar. Si el usuario de Vercel no cumple estos requisitos, detener el despliegue y acordar un modelo de privilegios/RLS antes de publicar; no añadir políticas amplias como arreglo rápido.

   Si la configuración de Production cambia antes de instalar, repetir primero la verificación de identidad por un mecanismo de runtime aprobado. No inferir que la sesión SQL Editor equivale al pool de Vercel. No crear un endpoint SQL genérico ni exponer credenciales.

   ```sql
   SELECT current_user,
          r.rolbypassrls,
          r.rolsuper,
          has_table_privilege(current_user, 'public.md_pilot_editorial_versions', 'SELECT') AS versions_select,
          has_table_privilege(current_user, 'public.md_pilot_editorial_versions', 'INSERT') AS versions_insert,
          has_table_privilege(current_user, 'public.md_pilot_editorial_questions', 'SELECT') AS questions_select,
          has_table_privilege(current_user, 'public.md_pilot_editorial_questions', 'INSERT') AS questions_insert,
          has_table_privilege(current_user, 'public.md_pilot_editorial_questions', 'UPDATE') AS questions_update,
          has_table_privilege(current_user, 'public.md_pilot_editorial_options', 'SELECT') AS options_select,
          has_table_privilege(current_user, 'public.md_pilot_editorial_options', 'INSERT') AS options_insert,
          has_table_privilege(current_user, 'public.md_pilot_editorial_options', 'DELETE') AS options_delete,
          has_table_privilege(current_user, 'public.md_pilot_editorial_audit', 'SELECT') AS audit_select,
          has_table_privilege(current_user, 'public.md_pilot_editorial_audit', 'INSERT') AS audit_insert,
          has_sequence_privilege(
            current_user,
            pg_get_serial_sequence('public.md_pilot_editorial_audit', 'id'),
            'USAGE'
          ) AS audit_sequence_usage
   FROM pg_roles r
   WHERE r.rolname = current_user;
   ```

   Esta consulta no muestra credenciales. Aprobación: `rolbypassrls` o `rolsuper` debe ser `true`; todas las columnas de privilegios y `audit_sequence_usage` deben ser `true`. Si alguna condición falla, detener la instalación y resolver el modelo de acceso antes de desplegar.

## 2. Respaldo de Production

1. Antes de abrir una ventana, confirmar y documentar un punto de recuperación válido para el proyecto correcto: backup/PITR de Supabase con retención suficiente, o un respaldo lógico autorizado.
2. Para respaldo lógico, usar una herramienta y una credencial provista por un canal seguro; no escribir la cadena de conexión o contraseña en comandos, archivos del repositorio, capturas ni logs. Guardar y restringir el respaldo conforme a la política de datos del equipo.
3. Registrar fecha, proyecto, método y responsable. Confirmar que el equipo sabe restaurar o crear un proyecto de recuperación antes de continuar.
4. Esta migración solo crea objetos editoriales. Aun así, el respaldo debe cubrir también el esquema y los datos actuales porque la base es Production.

## 3. Instalación controlada de las tablas editoriales

1. Ejecutar otra vez las comprobaciones previas en la sesión/destino correcto.
2. Abrir la migración canónica indicada arriba, revisar que la versión aprobada coincide con la revisada y ejecutarla completa en el SQL Editor de Production dentro de la ventana autorizada.
3. El archivo incluye `BEGIN`/`COMMIT`. Ejecutarlo como una unidad con error ante la primera sentencia fallida. No ejecutar solo fragmentos ni usar una versión copiada/alterada.
4. Si aparece cualquier error antes del `COMMIT`, detenerse, confirmar que la transacción revirtió, y no reintentar hasta entender la causa. No eliminar objetos para limpiar una instalación parcial sin diagnóstico.
5. No insertar datos de preguntas ni crear borradores de prueba en Production como parte de la migración.

## 4. Verificación de migración y permisos

Ejecutar estas consultas de solo lectura y conservar los resultados sin datos personales:

```sql
SELECT c.relname AS tabla, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'md_pilot_editorial_versions',
    'md_pilot_editorial_questions',
    'md_pilot_editorial_options',
    'md_pilot_editorial_audit'
  )
ORDER BY c.relname;

SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'md_pilot_editorial_%';

SELECT c.relname AS tabla, con.conname, con.contype,
       pg_get_constraintdef(con.oid) AS definicion
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'md_pilot_editorial_%'
ORDER BY c.relname, con.conname;

SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'md_pilot_editorial_%'
ORDER BY tablename, indexname;

SELECT t.tgname, t.tgrelid::regclass AS tabla,
       t.tgenabled, t.tgdeferrable, t.tginitdeferred
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND t.tgname LIKE 'md_pilot_editorial_%'
ORDER BY tabla::text, t.tgname;

SELECT roles.role_name, tables.table_name, privileges.privilege,
       has_table_privilege(
         roles.role_name,
         format('public.%I', tables.table_name),
         privileges.privilege
       ) AS granted
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name)
CROSS JOIN (VALUES
  ('md_pilot_editorial_versions'),
  ('md_pilot_editorial_questions'),
  ('md_pilot_editorial_options'),
  ('md_pilot_editorial_audit')
) AS tables(table_name)
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS privileges(privilege)
ORDER BY roles.role_name, tables.table_name, privileges.privilege;

SELECT has_sequence_privilege('anon', 'public.md_pilot_editorial_audit_id_seq', 'USAGE') AS anon_can_use_audit_sequence,
       has_sequence_privilege('authenticated', 'public.md_pilot_editorial_audit_id_seq', 'USAGE') AS authenticated_can_use_audit_sequence;
```

Esperado: cuatro tablas; `rls_enabled = true` y `rls_forced = true` en todas; cero políticas; restricciones, índices y triggers definidos; triggers de forma de pregunta con `tgdeferrable = true` y `tginitdeferred = true`; todas las filas de privilegios para `anon` y `authenticated`, y ambas comprobaciones de secuencia, en `false`. Revisar también el rol efectivo del backend según la sección 1. Cada llamada a `has_table_privilege` comprueba un único privilegio, dado que una cadena de privilegios separada por comas devuelve `true` si se cumple cualquiera de ellos.

En esta etapa, una versión puede avanzar de `borrador` a `revision`, pero sus preguntas solo se pueden cambiar mientras permanezca en `borrador`. No existe una operación para volverla a borrador ni para publicar/archivar; cualquier flujo editorial posterior debe diseñarse y aprobarse aparte.

Guardar conteos antes/después y confirmar que no cambiaron:

```sql
SELECT
  (SELECT count(*) FROM public.md_pilot_questions) AS preguntas_publicadas,
  (SELECT count(*) FROM public.md_pilot_options) AS opciones_publicadas,
  (SELECT count(*) FROM public.md_pilot_attempts) AS intentos_historicos,
  (SELECT count(*) FROM public.md_pilot_attempt_answers) AS respuestas_historicas;
```

La migración no contiene DML contra esas tablas; estos conteos son una comprobación adicional, no reemplazan el respaldo.

## 5. Commit y push (solo después de autorización)

No ejecutar hasta que el equipo apruebe los resultados de base de datos y autorice la publicación. Confirmar de nuevo la rama y agregar únicamente los archivos del administrador:

```powershell
git branch --show-current
git diff --check
git add -- database/migrations/20261031_pilot_editorial_drafts.sql src/routes/admin-pilot-diagnostic.js src/routes/admin.js src/server.js indexInicial.html tests/admin-pilot-diagnostic.test.js tests/admin-pilot-diagnostic-ui.test.js tests/admin-routes.test.js tests/pilot-diagnostic-isolation.test.js docs/instalacion-segura-admin-editorial.md docs/verificacion-identidad-postgres-vercel.md docs/revision-academica-diagnostico-piloto.md docs/demo-areandina-impulsa.md
git diff --cached --check
git diff --cached --stat
```

Revisar el diff staged para excluir documentos y artefactos ajenos. Después de autorización:

```powershell
git commit -m "Add secure editorial drafts for pilot questions"
git push origin recovery/integracion-20261031
```

La rama publica Production automáticamente según la configuración reportada por el equipo. No hacer push a `main`.

## 6. Verificación de Vercel

1. Confirmar que el deployment corresponde a `recovery/integracion-20261031` y que el build terminó correctamente.
2. Revisar logs sin copiar valores de entorno ni cadenas de conexión.
3. No cambiar variables de Vercel como parte de esta instalación.
4. Si la identidad de base de datos efectiva no se ha verificado o las tablas editoriales no son accesibles, detener las pruebas de escritura y revertir el deployment de código; conservar las tablas aditivas para análisis.

## 7. Prueba administrativa

1. Iniciar sesión con la cuenta admin ya existente.
2. Confirmar que aparece «Gestión de preguntas» y que el endpoint `/api/v1/admin/pilot-diagnostic/versions` responde autenticado.
3. El listado de un borrador de trabajo debe mostrar 50 preguntas; validar búsqueda/filtro, apertura de detalle, edición de enunciado/opciones/clave/justificación/retroalimentaciones, guardado y consulta del historial.
4. No editar preguntas activas. Crear o modificar un borrador en Production solo cuando el responsable académico autorice expresamente esa escritura y haya definido qué versión será el borrador editorial inicial.
5. No intentar publicar/archivar. Esas transiciones están bloqueadas por diseño.

## 8. Verificación del estudiante y del diagnóstico

1. Iniciar sesión con la cuenta de estudiante de prueba y confirmar que no aparece la gestión administrativa.
2. Confirmar que las solicitudes a endpoints administrativos devuelven `401` sin token y `403` con una sesión de estudiante.
3. Comprobar la página pública del diagnóstico y la información de disponibilidad sin iniciar ni enviar un intento en Production.
4. No llamar a `/start` ni `/submit` para esta comprobación: pueden crear intentos y resultados históricos. La prueba completa del examen debe ejecutarse en una base aislada.

## 9. Recuperación ante fallos

- **Preflight fallido:** no ejecutar la migración; corregir el esquema/destino mediante un cambio aprobado separado.
- **Migración falla antes de commit:** la transacción debe revertirse. Confirmar los objetos y constraints antes de reintentar; no borrarlos a mano.
- **Migración confirma, aplicación falla:** detener pruebas de escritura y revertir el deployment de código al deployment previo. Las tablas editoriales vacías pueden permanecer; no afectan los endpoints del diagnóstico actual.
- **RLS/permisos fallan:** no relajar RLS ni conceder permisos a `PUBLIC`, `anon` o `authenticated`. Bloquear el módulo hasta aprobar un rol backend compatible o un modelo RLS explícito.
- **Se requiere restauración de datos:** usar el procedimiento de recuperación del respaldo aprobado por el responsable de Production. No existe una migración inversa destructiva; no ejecutar `DROP`, `TRUNCATE` ni borrar auditoría como mecanismo de rollback.

## Estado comprobado de esta preparación

- La ruta editorial se monta antes de `/api/v1/admin` en [`../src/server.js`](../src/server.js).
- La API protege el router completo con `authenticate` y `authorize('admin')` en [`../src/routes/admin-pilot-diagnostic.js`](../src/routes/admin-pilot-diagnostic.js).
- La visibilidad del enlace y el acceso a la vista se condicionan al rol de administrador en [`../indexInicial.html`](../indexInicial.html); esto es solo UX, la autorización efectiva permanece en backend.
- Pruebas API/UI locales y pruebas PostgreSQL aisladas están descritas en el informe de entrega. No se ejecutó el conjunto de pruebas de autenticación que crea y elimina usuarios mediante `.env`, porque el destino local de esa configuración no se debe asumir aislado de Production.
- El equipo confirmó que el pool de Vercel usa `postgres` con `BYPASSRLS`; la ruta temporal se elimina del próximo despliegue del administrador.
- No se modificaron Vercel, variables de entorno ni la rama; no se hizo commit/push y no se ejecutó DDL en Supabase.
