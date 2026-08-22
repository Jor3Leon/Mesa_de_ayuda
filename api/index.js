const { PrismaClient } = require('@prisma/client');
const { buildApp } = require('../mesa_de_ayuda/backend/app');

let prisma;
if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}
prisma = global.__prisma;

const app = buildApp(prisma);

module.exports = app;
