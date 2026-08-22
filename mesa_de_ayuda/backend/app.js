const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const { createHttpError } = require('./lib/utils');
const { requireAuth } = require('./lib/middleware');

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

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(createHttpError(403, `Origin ${origin} not allowed by CORS.`));
    },
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('dev'));
  
  console.log('\x1b[36m%s\x1b[0m', '------------------------------------------------');
  console.log('\x1b[35m%s\x1b[0m', '  🚀 MESA DE AYUDA PRO - BACKEND MODULAR');
  console.log('\x1b[36m%s\x1b[0m', '------------------------------------------------');

  // Health check
  app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.0.0' }));

  // Register routes
  app.use('/api/auth', getAuthRoutes(prisma));
  
  // Routes are handled by modular routers below

  app.use('/api/tickets', getTicketRoutes(prisma));
  app.use('/api/assets', getAssetRoutes(prisma));
  app.use('/api/users', getUserRoutes(prisma));
  app.use('/api/canned-responses', getCannedResponseRoutes(prisma));
  app.use('/api/categories', getCategoryRoutes(prisma));
  app.use('/api/analytics', getAnalyticsRoutes(prisma));
  app.use('/api/activities', getActivityRoutes(prisma));
  app.use('/api', getCommonRoutes(prisma));

  // 404 handler
  app.use((req, res, next) => {
    next(createHttpError(404, `Route ${req.method} ${req.url} not found.`));
  });

  // Global error handler
  app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    
    if (statusCode === 500) {
      console.error('\x1b[31m[ERROR]\x1b[0m', error);
    }

    res.status(statusCode).json({
      error: message,
      status: statusCode,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

module.exports = { buildApp };
