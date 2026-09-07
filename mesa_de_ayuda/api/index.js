const { PrismaClient } = require('@prisma/client');
const path = require('path');

let buildApp = null;
const candidatePaths = [
  path.resolve(__dirname, '../backend/app'),
  path.resolve(__dirname, './backend/app'),
  path.resolve(__dirname, '../../backend/app'),
  path.resolve(process.cwd(), 'backend/app'),
  path.resolve(process.cwd(), 'mesa_de_ayuda/backend/app'),
  '../backend/app',
  '../../backend/app'
];

for (const p of candidatePaths) {
  try {
    const mod = require(p);
    if (mod && mod.buildApp) {
      buildApp = mod.buildApp;
      break;
    }
  } catch (e) {
    // Try next candidate
  }
}

if (!buildApp) {
  try {
    buildApp = require('../backend/app').buildApp;
  } catch (e1) {
    try {
      buildApp = require('../../backend/app').buildApp;
    } catch (e2) {
      console.error('Fatal: Could not load buildApp from candidate paths:', e1, e2);
    }
  }
}

let appInstance = null;

function getApp() {
  if (!appInstance) {
    if (!buildApp) {
      throw new Error('Backend application module could not be loaded.');
    }
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
  if (!req.socket) req.socket = {};
  if (!req.socket.remoteAddress) {
    const fwd = req.headers['x-forwarded-for'];
    req.socket.remoteAddress = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : null)
      || req.headers['x-real-ip']
      || '127.0.0.1';
  }
  try {
    const app = getApp();
    return app(req, res);
  } catch (error) {
    console.error('Vercel Serverless Function Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Internal Server Error',
        message: error.message || 'Internal Server Error'
      });
    }
  }
};
