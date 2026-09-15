# MéritoDocente — Documentación del Proyecto

## ¿Qué es?

MéritoDocente es una plataforma MOOC (en línea) para la preparación de concursos de méritos docentes en Colombia. Permite a docentes estudiar por áreas del examen, tomar evaluaciones tipo prueba, seguir su progreso y desbloquear insignias al completar módulos.

## Estado actual (2026-09-15)

- **Backend**: Node.js 18+, Express 4, PostgreSQL (Supabase), JWT + bcryptjs.
- **Base de datos**: Supabase PostgreSQL, pooler `aws-0-ca-central-1.pooler.supabase.com:6543` con `?sslmode=require&pgbouncer=true`.
- **Frontend**: SPA vanilla HTML/CSS/JS en `indexInicial.html`, con `public/api-client.js` y `public/auth.js`.
- **Servidor**: `npm run dev` activo en `http://localhost:3000/`.
- **Seed**: `npm run seed` ejecutado correctamente (`✅ Seed completed successfully`).
- **API base**: `/api/v1`.

### Endpoints verificados (todos responden 200)

| Ruta | Estado |
|------|--------|
| `GET /health` | ✅ |
| `GET /api/v1/ping/health` | ✅ |
| `GET /api/v1/courses` | ✅ (modulos/lecciones/quizzes anidados) |
| `GET /api/v1/courses/:id` | ✅ |
| `POST /api/v1/auth/register` | ✅ |
| `POST /api/v1/auth/login` | ✅ |
| `GET /api/v1/auth/me` | ✅ |
| `GET /api/v1/progress` | ✅ |
| `GET /api/v1/users/profile` | ✅ |

### Pendiente menor

`src/routes/progress.js` usa `staff_id` donde el esquema tiene `staff_id` (verificar columna real en Supabase). Error actual al completar lección: `function avg(numeric, integer) does not exist` en la consulta de actualización de `enrollments.progreso_total`.

## Módulos actuales

### 1. Fundamentos de Pedagogía y Didáctica (Pedagogía y Didáctica · Básico)
- **Módulo 1**: Fundamentos de Pedagogía
  - Lección 1: ¿Qué es la Pedagogía? (quiz)
  - Lección 2: Corrientes pedagógicas contemporáneas (quiz)
  - Insignia: Pedagogo Inicial (gold)
- **Módulo 2**: Corrientes Pedagógicas
  - Lección 3: Estrategias didácticas para el aula (quiz)
  - Insignia: Pensador (green)

### 2. Legislación Educativa Colombiana (Legislación Educativa · Básico)
- **Módulo 3**: Marco Normativo Colombiano
  - Lección 4: Ley General de Educación (Ley 115 de 1994) (quiz)
  - Insignia: Conocedor Normativo (blue)
- **Módulo 4**: Constitución y Legislación
  - Lección 5: Decreto 1278 de 2002: Estatuto Docente (quiz)
  - Insignia: Legislador (purple)

### Estructura de datos
- `courses` → `modules` (por curso) → `lessons` (por módulo) → `quizzes` (por lección) → `quiz_options` (por quiz)
- `user_progress` (-Lección completada por usuario)
- `user_badges` (Insignia obtenida por usuario)
- `enrollments` (Inscripción por usuario y curso, con `progreso_total`)

### Flujo de usuario
1. Registro / login (JWT, localStorage).
2. Dashboard: ver módulos disponibles, progreso global, insignias.
3. Lección: contenido + quiz. Al responder correctamente → lección completada → actualiza `user_progress`, `enrollments.progreso_total` y, si el módulo queda al 100%, otorga badge.

## Próximos pasos
1. Corregir `progress.js` (`staff_id` → `staff_id`) y probar `POST /api/v1/progress/lesson/:id`.
2. Migrar progreso de `indexInicial.html` (localStorage) a la API.
3. Añadir pruebas mínimas (Jest) para salud, autenticación, cursos y progreso.
4. Implementar simulacro gratuito sin registro.
5. Editor y publicar 50 preguntas desde Word.
6. Desplegar en Vercel.