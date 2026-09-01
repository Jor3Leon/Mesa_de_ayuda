require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { buildApp } = require('./app');
const fs = require('fs');
const path = require('path');
const { autoCloseResolvedTickets } = require('./lib/business-hours');

const prisma = new PrismaClient();
const app = buildApp(prisma);
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Mesa de Ayuda API running on http://localhost:${PORT}`);
  
  // Iniciar ciclo de respaldos cada 24 horas
  runBackup();
  setInterval(runBackup, 24 * 60 * 60 * 1000);

  // Iniciar ciclo de cierre automático de tickets resueltos (>8 horas hábiles) cada 2 minutos
  autoCloseResolvedTickets(prisma).catch(console.error);
  setInterval(() => {
    autoCloseResolvedTickets(prisma).catch(console.error);
  }, 2 * 60 * 1000);
});

function runBackup() {
  try {
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
    const backupPath = path.join(backupDir, `dev-backup-${timestamp}.db`);

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Respaldo] Base de datos copiada exitosamente a: ${backupPath}`);
      
      // Limpiar respaldos antiguos (mantener solo los últimos 10)
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('dev-backup-'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 10) {
        files.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f.name)));
      }
    }
  } catch (error) {
    console.error('[Respaldo] Error al realizar la copia de seguridad:', error);
  }
}

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
