require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { buildApp } = require('./app');
const fs = require('fs');
const path = require('path');
const { autoCloseResolvedTickets } = require('./lib/business-hours');

const { runPostgresBackup } = require('./scripts/backup-postgres');

const prisma = new PrismaClient();
const app = buildApp(prisma);
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Mesa de Ayuda API running on http://localhost:${PORT}`);
  
  // Iniciar ciclo de respaldos PostgreSQL cada 24 horas
  runPostgresBackup().catch(console.error);
  setInterval(() => {
    runPostgresBackup().catch(console.error);
  }, 24 * 60 * 60 * 1000);

  // Iniciar ciclo de cierre automático de tickets resueltos (>8 horas hábiles) cada 2 minutos
  autoCloseResolvedTickets(prisma).catch(console.error);
  setInterval(() => {
    autoCloseResolvedTickets(prisma).catch(console.error);
  }, 2 * 60 * 1000);
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    console.error(error);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    console.error(error);
    process.exit(1);
  });
});
