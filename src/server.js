/**
 * Core server setup for MéritoDocente MOOC platform
 * Express server with API routes, middleware, and error handling
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

const { pool } = require('./config/database');
const { esCuerpoJsonInvalido } = require('./utils/httpErrors');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const progressRoutes = require('./routes/progress');
const quizRoutes = require('./routes/quizzes');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const adminPilotDiagnosticRoutes = require('./routes/admin-pilot-diagnostic');
const pilotDiagnosticRoutes = require('./routes/diagnostico-piloto');

// Security headers
const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      // Contrato de la Etapa 2: el marcado no ejecuta JavaScript desde
      // atributos `on*`. Todas las acciones viajan como `data-action` y las
      // resuelve un único oyente delegado (public/js/nucleo/acciones.js), así
      // que `script-src-attr 'none'` (valor por defecto de Helmet) se declara
      // explícito y no admite atajos.
      scriptSrcAttr: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

/**
 * `express.json()` envuelto para marcar en la petición cualquier fallo de
 * análisis del cuerpo. El manejador global no puede depender de la forma del
 * error: en local llega como `SyntaxError` con `entity.parse.failed`, pero el
 * runtime serverless de Vercel lo entrega con otra forma (sin `type` y con un
 * `SyntaxError` creado en otro contexto). Si el middleware falla, el cuerpo no
 * es un JSON válido por definición.
 */
const analizarJson = express.json({ limit: '10kb' });

app.use((req, res, next) => {
  analizarJson(req, res, (error) => {
    if (error) {
      req.cuerpoJsonInvalido = true;
    }

    next(error);
  });
});

app.use(express.urlencoded({ extended: true }));

// Trust proxy para Vercel serverless (resolución correcta de IP en rate limiter)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta nuevamente en 15 minutos.' },
});
app.use('/api/', limiter);

// Dev logging vs production
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin/pilot-diagnostic', adminPilotDiagnosticRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/ping', require('./routes/ping'));
app.use('/api/v1/diagnostico-piloto', pilotDiagnosticRoutes);

// Verificación rápida de que la API (o la función serverless) está en línea.
// `commit` es el marcador de despliegue: el runtime de Vercel expone el SHA de
// la compilación y permite comprobar qué versión está en línea sin abrir el
// panel. Se publica aquí y en /health.
const commitDesplegado = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'local').slice(0, 7);

app.get('/api/v1', (req, res) => {
  res.json({ status: 'ok', api: 'MéritoDocente', version: 'v1', commit: commitDesplegado });
});

// Health check
// `commit` permite verificar qué versión está desplegada sin abrir el panel de
// Vercel: el runtime serverless expone el SHA de la compilación en esa variable.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    commit: commitDesplegado,
  });
});

// Frontend estático
// La SPA principal es indexInicial.html (ver docs/roadmap.md).
// public/ expone /api-client.js y /auth.js en la raíz para la integración provisional.
const publicDir = path.join(__dirname, '..', 'public');
const rootDir = path.join(__dirname, '..');

app.use(express.static(publicDir));

app.get('/diagnostico-piloto', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(rootDir, 'diagnosticoPiloto.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'indexInicial.html'));
});

app.get('/indexInicial.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'indexInicial.html'));
});

// Integración provisional: se retira cuando la SPA principal esté conectada a la API.
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/app.js', (req, res) => {
  res.sendFile(path.join(rootDir, 'app.js'));
});

// API documentation (if swagger exists)
const swaggerPath = path.join(__dirname, '../docs/swagger.yaml');
if (fs.existsSync(swaggerPath)) {
  const swaggerDoc = YAML.parse(fs.readFileSync(swaggerPath, 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  app.get('/api-docs', (req, res) => res.redirect('/api-docs'));
}

// Serve the official SPA as entry point
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../indexInicial.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Global error handler
app.use((err, req, res, next) => {
  // Un cuerpo JSON malformado lo reporta body-parser como SyntaxError con
  // type 'entity.parse.failed'. Ese caso es un 400 del cliente, nunca un 500,
  // y aplica a cualquier ruta (por eso no se diagnostica como fallo de login).
  // El marcador lo pone el middleware `analizarJson` cuando `express.json()`
  // rechaza el cuerpo. El clasificador cubre el caso en que el error llega sin
  // pasar por ese middleware (por ejemplo, desde otra capa de análisis).
  const esCuerpoInvalido =
    req.cuerpoJsonInvalido === true ||
    esCuerpoJsonInvalido(err, typeof req.is === 'function' && Boolean(req.is('application/json')));

  const status = esCuerpoInvalido ? 400 : err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (status >= 500) {
    console.error('❌ Server error:', err);
  } else if (esCuerpoInvalido) {
    // El mensaje de V8 puede incluir un fragmento literal del cuerpo recibido
    // (`Unexpected token 'C', ..."password":"Clave"... is not valid JSON`), por
    // eso aquí no se imprime: solo el contexto de la petición y el tamaño.
    const bytes = Buffer.byteLength(String((err && err.body) || ''));

    console.warn(
      `⚠️  ${req.method} ${req.originalUrl} -> ${status}: cuerpo JSON inválido (${bytes} bytes)`
    );
  } else {
    // Se registra el contexto mínimo: imprimir `err` volcaría el cuerpo
    // recibido, que puede contener credenciales.
    console.warn(`⚠️  ${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  }

  res.status(status).json({
    error: esCuerpoInvalido
      ? 'JSON inválido en el cuerpo de la solicitud'
      : isDevelopment
        ? err.message
        : 'Error interno del servidor',
    ...(isDevelopment && !esCuerpoInvalido && { stack: err.stack }),
  });
});

// Sync database and start server
const startServer = async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection verified');

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📚 API: http://localhost:${port}/api/v1`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`📖 Docs: http://localhost:${port}/api-docs`);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Escucha solo cuando el archivo se ejecuta directamente (npm start / npm run dev).
// Al importarse como función serverless (por ejemplo en Vercel) no abre puerto.
if (require.main === module) {
  startServer();
}

module.exports = app;