#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== VERCEL UNIFIED BUILD SCRIPT ===');
const cwd = process.cwd();
console.log('[build] Current working directory:', cwd);
console.log('[build] Script directory (__dirname):', __dirname);

// 0. Auto-sync backend into frontend/backend for serverless bundle
const candidateBackendDirs = [
  path.resolve(cwd, 'mesa_de_ayuda/backend'),
  path.resolve(cwd, 'backend'),
  path.resolve(cwd, '../backend'),
  path.resolve(__dirname, '../mesa_de_ayuda/backend'),
  path.resolve(__dirname, '../backend'),
  path.resolve(__dirname, '../../backend')
];
const sourceBackend = candidateBackendDirs.find(d => fs.existsSync(path.join(d, 'app.js')) && !d.includes('frontend'));

const candidateFrontendDirs = [
  cwd,
  path.resolve(cwd, 'mesa_de_ayuda/frontend'),
  path.resolve(cwd, 'frontend'),
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, '../mesa_de_ayuda/frontend')
];
const targetFrontend = candidateFrontendDirs.find(d => 
  fs.existsSync(path.join(d, 'package.json')) && 
  (fs.existsSync(path.join(d, 'vite.config.js')) || fs.existsSync(path.join(d, 'src')))
);

if (sourceBackend && targetFrontend) {
  const destBackend = path.resolve(targetFrontend, 'backend');
  if (sourceBackend !== destBackend) {
    try {
      console.log(`[build] Syncing backend from ${sourceBackend} to ${destBackend}...`);
      fs.mkdirSync(destBackend, { recursive: true });
      ['app.js', 'auth.js'].forEach(file => {
        const src = path.join(sourceBackend, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destBackend, file));
      });
      ['lib', 'routes', 'prisma'].forEach(dir => {
        const src = path.join(sourceBackend, dir);
        if (fs.existsSync(src)) fs.cpSync(src, path.join(destBackend, dir), { recursive: true });
      });
      console.log('[build] Backend synced successfully.');
    } catch (err) {
      console.warn('[build] Warning during backend sync:', err.message);
    }
  }
}

// 1. Locate schema.prisma
const possibleSchemas = [
  path.resolve(cwd, 'prisma/schema.prisma'),
  path.resolve(cwd, 'backend/prisma/schema.prisma'),
  path.resolve(cwd, '../backend/prisma/schema.prisma'),
  path.resolve(cwd, '../../backend/prisma/schema.prisma'),
  path.resolve(cwd, 'mesa_de_ayuda/backend/prisma/schema.prisma'),
  path.resolve(cwd, 'mesa_de_ayuda/frontend/prisma/schema.prisma'),
  path.resolve(cwd, 'mesa_de_ayuda/prisma/schema.prisma'),
  path.resolve(__dirname, '../prisma/schema.prisma'),
  path.resolve(__dirname, '../backend/prisma/schema.prisma'),
  path.resolve(__dirname, '../../backend/prisma/schema.prisma'),
  path.resolve(__dirname, '../../../backend/prisma/schema.prisma'),
  path.resolve(__dirname, '../mesa_de_ayuda/backend/prisma/schema.prisma'),
  path.resolve(__dirname, '../../mesa_de_ayuda/backend/prisma/schema.prisma')
];

let schemaPath = possibleSchemas.find(p => fs.existsSync(p));

if (!schemaPath) {
  console.error('[build] ERROR: Could not find schema.prisma in candidate paths:');
  possibleSchemas.forEach(p => console.error('  -', p));
  process.exit(1);
}

console.log('[build] Found Prisma schema at:', schemaPath);

// 2. Generate Prisma client
console.log('[build] Running: npx prisma generate...');
try {
  execSync(`npx prisma generate --schema="${schemaPath}"`, {
    stdio: 'inherit',
    cwd
  });
  console.log('[build] Prisma Client generated successfully.');
} catch (err) {
  console.error('[build] ERROR during prisma generate:', err.message);
  process.exit(1);
}

// 3. Locate frontend directory
let frontendDir = targetFrontend || possibleFrontendDirs.find(d => 
  fs.existsSync(path.join(d, 'package.json')) && 
  (fs.existsSync(path.join(d, 'vite.config.js')) || fs.existsSync(path.join(d, 'src')))
);

if (!frontendDir) {
  console.error('[build] ERROR: Could not find frontend directory in:');
  candidateFrontendDirs.forEach(d => console.error('  -', d));
  process.exit(1);
}

console.log('[build] Found frontend directory at:', frontendDir);

// 4. Build frontend with vite
try {
  console.log('[build] Compiling frontend with npx vite build...');
  execSync('npx vite build', { cwd: frontendDir, stdio: 'inherit' });
  console.log('[build] Frontend build completed successfully.');
} catch (err) {
  console.error('[build] ERROR during frontend build:', err.message);
  process.exit(1);
}

// 5. Ensure output directory is populated for Vercel
const sourceDist = path.join(frontendDir, 'dist');
if (fs.existsSync(sourceDist)) {
  const candidateOutputs = [
    path.resolve(frontendDir, 'dist'),
    path.resolve(cwd, 'dist')
  ];

  if (fs.existsSync(path.join(cwd, 'mesa_de_ayuda/frontend'))) {
    candidateOutputs.push(path.resolve(cwd, 'mesa_de_ayuda/frontend/dist'));
  }
  if (fs.existsSync(path.join(cwd, 'frontend')) && !fs.existsSync(path.join(cwd, 'mesa_de_ayuda'))) {
    candidateOutputs.push(path.resolve(cwd, 'frontend/dist'));
  }

  for (const target of candidateOutputs) {
    if (sourceDist !== target) {
      try {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.cpSync(sourceDist, target, { recursive: true });
        console.log('[build] Output mirrored to:', target);
      } catch (err) {
        // Ignore copy errors
      }
    }
  }
}

console.log('=== VERCEL BUILD SUCCESSFUL ===');
