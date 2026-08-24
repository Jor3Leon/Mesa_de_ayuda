const { execSync } = require('child_process');
const fs = require('fs');

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   🔨 STIC Agent - Compilación Multiplataforma   ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

console.log('  📦 Generando bundle Javascript ejecutable standalone (dist/stic-agent.js)...');
try {
  execSync(
    'npx esbuild src/index.js --bundle --platform=node --target=node16 --outfile=dist/stic-agent.js --banner:js="#!/usr/bin/env node"',
    { stdio: 'inherit' }
  );
  console.log('  ✅ dist/stic-agent.js creado con éxito (compatible Node.js 16+)');
} catch (e) {
  console.error(`  ❌ Error al generar bundle JS: ${e.message}`);
}

console.log('');
console.log('  🎉 Proceso de build finalizado.');
console.log('');
