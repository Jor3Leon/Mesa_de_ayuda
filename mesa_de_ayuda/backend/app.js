const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('./lib/utils');
const { rateLimit } = require('./lib/rate-limit');

// Import modular routes
const getAuthRoutes = require('./routes/auth');
const getTicketRoutes = require('./routes/tickets');
const getAssetRoutes = require('./routes/assets');
const getUserRoutes = require('./routes/users');
const getCommonRoutes = require('./routes/common');
const getCannedResponseRoutes = require('./routes/canned-responses');
const getAnalyticsRoutes = require('./routes/analytics');
const getCategoryRoutes = require('./routes/categories');
const getActivityRoutes = require('./routes/activities');
const getDiscoveryRoutes = require('./routes/discovery');
const getOrgStructureRoutes = require('./routes/organization-structure');

function getAllowedOrigins() {
  const configuredOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configuredOrigins;
}

function buildApp(prisma = new PrismaClient()) {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  // 1. Security Headers Middleware (Anti-Clickjacking, Anti-MIME sniffing, HSTS)
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // 2. CORS Policy
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(createHttpError(403, `Origin ${origin} not allowed by CORS.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Organization-Slug']
  }));
  
  // 3. Body Parser with Anti-DoS Payload Limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // 4. Anti-DoS Rate Limiting (General API: 120 req/min per IP)
  app.use('/api', rateLimit({ windowMs: 60000, max: 120, message: 'Límite de solicitudes excedido. Intente más tarde.' }));

  // 5. Anti-Brute-Force Rate Limiting for Authentication (10 attempts/min per IP)
  app.use('/api/auth/login', rateLimit({ windowMs: 60000, max: 10, message: 'Demasiados intentos de inicio de sesión. Por favor espere 1 minuto.' }));

  // Health check
  app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.1.0-secure' }));

  // Register routes
  app.use('/api/auth', getAuthRoutes(prisma));
  app.use('/api/tickets', getTicketRoutes(prisma));
  app.use('/api/assets', getAssetRoutes(prisma));
  app.use('/api/users', getUserRoutes(prisma));
  app.use('/api/canned-responses', getCannedResponseRoutes(prisma));
  app.use('/api/categories', getCategoryRoutes(prisma));
  app.use('/api/analytics', getAnalyticsRoutes(prisma));
  app.use('/api/activities', getActivityRoutes(prisma));
  app.use('/api/discovery', getDiscoveryRoutes(prisma));
  app.use('/discovery', getDiscoveryRoutes(prisma));
  app.use('/api/organization-structure', getOrgStructureRoutes(prisma));
  app.use('/organization-structure', getOrgStructureRoutes(prisma));
  app.use('/api', getCommonRoutes(prisma));

  // 404 handler
  app.use((req, res, next) => {
    next(createHttpError(404, `Recurso ${req.method} ${req.url} no encontrado.`));
  });

  // Global error handler
  app.use((error, req, res, next) => {
    const statusCode = typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;
    
    console.error(`[API ERROR ${statusCode}] ${req.method} ${req.url}:`, error);

    // Only expose messages for explicit client errors (4xx with statusCode).
    // Hide internal 500 errors, database crashes, and Prisma exceptions from client responses.
    const isClientError = typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500;
    const message = isClientError 
      ? (error.message || 'Solicitud inválida.')
      : 'Ocurrió un error interno en el servidor. Por favor, intente nuevamente.';

    res.status(statusCode).json({
      error: message,
    });
  });

  return app;
}

module.exports = { buildApp };
