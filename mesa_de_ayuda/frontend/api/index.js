const { PrismaClient } = require('@prisma/client');
let buildApp;
try {
  buildApp = require('../../backend/app').buildApp;
} catch {
  buildApp = require('../server/app').buildApp;
}

let appInstance = null;

function getApp() {
  if (!appInstance) {
    let prisma;
    if (!global.__prisma) {
      global.__prisma = new PrismaClient();
    }
    prisma = global.__prisma;
    appInstance = buildApp(prisma);
  }
  return appInstance;
}

module.exports = (req, res) => {
  try {
    const app = getApp();
    return app(req, res);
  } catch (error) {
    console.error('Vercel Serverless Function Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  }
};
