#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== VERCEL UNIFIED BUILD SCRIPT ===');
const cwd = process.cwd();
console.log('[build] Current working directory:', cwd);

// 1. Locate schema.prisma
const possibleSchemas = [
  path.resolve(cwd, 'mesa_de_ayuda/backend/prisma/schema.prisma'),
  path.resolve(cwd, 'backend/prisma/schema.prisma'),
  path.resolve(cwd, '../backend/prisma/schema.prisma'),
  path.resolve(cwd, 'prisma/schema.prisma'),
  path.resolve(cwd, '../prisma/schema.prisma'),
  path.resolve(cwd, 'mesa_de_ayuda/prisma/schema.prisma'),
  path.resolve(cwd, 'mesa_de_ayuda/frontend/prisma/schema.prisma'),
  path.resolve(cwd, 'frontend/prisma/schema.prisma'),
  path.resolve(__dirname, '../mesa_de_ayuda/backend/prisma/schema.prisma'),
  path.resolve(__dirname, '../backend/prisma/schema.prisma'),
  path.resolve(__dirname, '../../backend/prisma/schema.prisma'),
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
const possibleFrontends = [
  path.resolve(cwd, 'mesa_de_ayuda/frontend'),
  path.resolve(cwd, 'frontend'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, '../mesa_de_ayuda/frontend'),
  cwd
];

let frontendDir = possibleFrontends.find(d => 
  fs.existsSync(path.join(d, 'package.json')) && 
  (fs.existsSync(path.join(d, 'vite.config.js')) || fs.existsSync(path.join(d, 'src')))
);

if (!frontendDir) {
  console.error('[build] ERROR: Could not find frontend directory in:');
  possibleFrontends.forEach(d => console.error('  -', d));
  process.exit(1);
}

console.log('[build] Found frontend directory at:', frontendDir);

// 4. Install dependencies if node_modules is missing, then build frontend
try {
  const nodeModulesDir = path.join(frontendDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('[build] Installing frontend dependencies...');
    execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  }
  console.log('[build] Compiling frontend with vite build...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  console.log('[build] Frontend build completed successfully.');
} catch (err) {
  console.error('[build] ERROR during frontend build:', err.message);
  process.exit(1);
}

// 5. Ensure output directory is populated for Vercel
const sourceDist = path.join(frontendDir, 'dist');
if (fs.existsSync(sourceDist)) {
  const targetDirs = [];
  if (fs.existsSync(path.join(cwd, 'mesa_de_ayuda/frontend'))) {
    targetDirs.push(path.resolve(cwd, 'mesa_de_ayuda/frontend/dist'));
  }
  if (fs.existsSync(path.join(cwd, 'frontend'))) {
    targetDirs.push(path.resolve(cwd, 'frontend/dist'));
  }
  targetDirs.push(path.resolve(cwd, 'dist'));

  for (const target of targetDirs) {
    if (sourceDist !== target) {
      try {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.cpSync(sourceDist, target, { recursive: true });
        console.log('[build] Output verified at:', target);
      } catch (err) {
        // Ignore copy errors to optional paths
      }
    }
  }
}

console.log('=== VERCEL BUILD SUCCESSFUL ===');
