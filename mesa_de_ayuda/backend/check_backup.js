const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Temporarily copy backup to test it
const backupFile = 'c:/Users/jherson.rivera/.gemini/antigravity/Mesa_de_ayuda/mesa_de_ayuda/backend/backups/dev-backup-2026-04-07_11-21.db';
const testFile = 'c:/Users/jherson.rivera/.gemini/antigravity/Mesa_de_ayuda/mesa_de_ayuda/backend/prisma/test_backup.db';

if (!fs.existsSync(backupFile)) { console.error('No backup found'); process.exit(1); }
fs.copyFileSync(backupFile, testFile);

// Change env var to use test DB
process.env.DATABASE_URL = 'file:./test_backup.db';
const prisma = new PrismaClient();

async function run() {
  try {
    const assetCount = await prisma.asset.count();
    const assets = await prisma.asset.findMany();
    console.log(`ASSETS IN BACKUP (11:21): ${assetCount}`);
    assets.forEach(a => console.log(`- ${a.hostname}`));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  }
}
run();
