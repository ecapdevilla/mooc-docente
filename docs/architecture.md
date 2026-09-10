# Arquitectura MéritoDocente - MOOC Platform

## Resumen de arquitectura

Sistema fullstack para plataforma de preparación docente con cursos MOOC, lecciones interactivas, evaluaciones y seguimiento de progreso.

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| **Backend** | Node.js + Express |
| **Base de datos** | PostgreSQL |
| **Auth** | JWT + bcryptjs |
| **Frontend** | HTML5 + CSS3 + Vanilla JS (SPA) |
| **Estado** | localStorage para sesión cliente |
| **Lint/Test** | Jest + Supertest |

---

## Estructura de directorios

```
Mooc-Docente/
├── src/
│   ├── config/          # Database connection
│   ├── controllers/     # Request handlers
│   ├── middleware/       # Auth middleware
│   ├── models/          # Database models
│   ├── routes/          # Express routes
│   ├── seed/            # Database seeding
│   ├── services/        # Business logic
│   ├── utils/           # Validators, helpers
│   └── server.js        # Entry point
├── public/              # Frontend assets
│   ├── api-client.js
│   └── auth.js
├── docs/
│   └── architecture.md
├── database/
│   └── schema.sql
├── tests/
├── indexInicial.html    # Frontend SPA
├── package.json
└── .env
```

---

## Flujo de datos

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (indexInicial.html)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │  Landing     │→│  Dashboard   │←│  Lesson View │            │
│  │  + Register  │  │  + Progress  │  │  + Quiz      │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
└──────────────────────────┬───────────────────────────────────────┘
                           │ fetch (HTTP)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend (src/server.js + routes)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │  /auth       │  │  /courses   │  │  /progress   │            │
│  │  /users      │  │  /progress  │  │  /users      │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
└──────────────────────────┬───────────────────────────────────────┘
                           │ SQL queries
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Database (PostgreSQL)                                          │
│  users | courses | modules | lessons | quizzes | quiz_options    │
│  user_progress | badges | user_badges | enrollments              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Modelo de datos clave

### Usuarios y autenticación
- **users**: id, nombre, email, password_hash, telefono, departamento, rol, fecha_registro, activo
- JWT token en header: `Authorization: Bearer <token>`
- Roles: admin, teacher, estudiante

### Cursos y contenido
- **courses** → **modules** → **lessons** → **quizzes** → **quiz_options**
- Relación 1:N a cada nivel

### Progreso y evaluación
- **enrollments**: usuario → curso
- **user_progress**: usuario → lección (completada, puntaje, fecha)
- **badges**: módulo completado → insignia
- **user_badges**: usuario → badge

---

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Registro de usuario |
| POST | /api/v1/auth/login | Inicio de sesión |
| GET | /api/v1/auth/me | Usuario actual |
| GET | /api/v1/courses | Listar cursos activos |
| GET | /api/v1/courses/:id | Detalle curso |
| GET | /api/v1/progress | Progreso del usuario |
| POST | /api/v1/progress/lesson/:id | Completar lección |
| GET | /api/v1/users/profile | Perfil usuario |
| PUT | /api/v1/users/profile | Actualizar perfil |
| GET | /api/v1/users/enrollments | Inscripciones |

---

## Escalabilidad y seguridad

- **JWT** con expiración configurables (7 días default)
- **bcrypt** con 12 salt rounds
- **Rate limiting** en rutas API (100 req/15min)
- **Helmet** para headers de seguridad
- **CORS** configurable por dominio
- **Validación** con Joi en entrada de datos
- **Índices** en columnas de búsqueda frecuente
- **Prepared statements** para SQL injection prevention

---

## Flujo de inicio de sesión (frontend)

1. Usuario registra → `POST /auth/register`
2. Backend crea usuario hashed + devuelve JWT
3. Frontend almacena `auth_token` y `user` en localStorage
4. Requests posteriores incluyen header `Authorization: Bearer <token>`
5. Middleware autentica token contra base de datos
6. Frontend renderiza dashboard con datos del usuario

## Flujo de progreso

1. Usuario completa lección → `POST /progress/lesson/:id`
2. Backend registra `user_progress` y calcula módulo progreso
3. Si módulo 100%, genera badge automático en `user_badges`
4. Frontend recibe estado actualizado y refresca dashboard