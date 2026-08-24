const readline = require('readline');
const { saveConfig, DEFAULTS } = require('./config');
const logger = require('./logger');

function ask(rl, question, defaultValue) {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(`  ${prompt}`, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function runWizard(existingConfig = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');
  console.log('\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║\x1b[0m   🖥️  \x1b[35mSTIC Agent - Configuración Inicial\x1b[0m          \x1b[36m║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m');
  console.log('');

  const config = { ...DEFAULTS, ...existingConfig };

  config.serverUrl = await ask(rl,
    '1. URL del servidor Mesa de Ayuda',
    config.serverUrl || 'https://tu-mesa-de-ayuda.vercel.app'
  );

  config.organizationSlug = await ask(rl,
    '2. Slug de la organización',
    config.organizationSlug || 'stic'
  );

  config.apiKey = await ask(rl,
    '3. API Key (dejar vacío si no aplica)',
    config.apiKey || ''
  );

  const intervalStr = await ask(rl,
    '4. Intervalo de sincronización (minutos)',
    String(config.syncIntervalMinutes || 30)
  );
  config.syncIntervalMinutes = parseInt(intervalStr, 10) || 30;

  config.proxy = await ask(rl,
    '5. Proxy HTTP (dejar vacío si no aplica)',
    config.proxy || ''
  );

  rl.close();

  // Normalize URL
  config.serverUrl = config.serverUrl.replace(/\/$/, '');

  // Save configuration
  const savedPath = saveConfig(config);
  console.log('');
  console.log(`  \x1b[32m✅ Configuración guardada en ${savedPath}\x1b[0m`);
  console.log('');

  return config;
}

module.exports = { runWizard };
