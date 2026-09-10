# MéritoDocente - MOOC Platform

Plataforma MOOC para preparación de concursos de méritos docentes con cursos, evaluaciones tipo prueba y seguimiento de progreso.

## Requisitos previos

- Node.js >= 18.x
- PostgreSQL >= 14
- npm (incluido con Node.js)

## Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de la base de datos

# 4. Crear base de datos e importar schema
createdb meritodocente
psql -d meritodocente -f database/schema.sql

# 5. Poblar datos iniciales
npm run seed

# 6. Iniciar servidor
npm run dev

# 7. (Opcional) Iniciar servidor de pruebas
npm run seed && npm run dev
```

## Configuración (.env)

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `NODE_ENV` | `development` | Entorno de ejecución |
| `DATABASE_URL` | - | URL de conexión PostgreSQL |
| `JWT_SECRET` | - | Secret para firmar tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración del token |

## API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registro
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Usuario actual

### Cursos
- `GET /api/v1/courses` - Lista de cursos
- `GET /api/v1/courses/:id` - Detalle de curso con módulos y lecciones

### Progreso
- `GET /api/v1/progress` - Progreso del usuario
- `POST /api/v1/progress/lesson/:lessonId` - Completar lección

### Usuario
- `GET /api/v1/users/profile` - Perfil
- `PUT /api/v1/users/profile` - Actualizar perfil
- `GET /api/v1/users/enrollments` - Inscripciones

## Modelos de datos

Ver `database/schema.sql` para la definición completa.

## Frontend

El frontend SPA está en `indexInicial.html` y consume la API en `http://localhost:3000/api/v1`.

## Testing

```bash
npm test
```

## Estructura del proyecto

```
src/
├── config/          # Configuración de base de datos
├── controllers/     # Controladores
├── middleware/       # Middleware (auth)
├── models/          # Modelos de datos
├── routes/          # Rutas API
├── seed/            # Seed de datos
├── services/        # Lógica de negocio
├── utils/           # Utilidades (validadores)
└── server.js        # Punto de entrada
```