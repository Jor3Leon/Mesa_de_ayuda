#!/usr/bin/env node

const { loadConfig, isConfigured } = require('./config');
const logger = require('./logger');
const { collectAll, AGENT_VERSION } = require('./collector');
const { syncWithServer } = require('./sync');
const { runWizard } = require('./wizard');
const { install, uninstall, getStatus } = require('./installer');

const BANNER = `
\x1b[36m╔══════════════════════════════════════════════════╗
║\x1b[0m   🖥️  \x1b[35mSTIC Agent v${AGENT_VERSION}\x1b[0m - Mesa de Ayuda          \x1b[36m║
╚══════════════════════════════════════════════════╝\x1b[0m
`;

function printHelp() {
  console.log(BANNER);
  console.log('Uso: stic-agent <comando> [opciones]');
  console.log('');
  console.log('Comandos:');
  console.log('  sync         Recolectar datos y sincronizar con el servidor');
  console.log('  install      Instalar el agente como servicio del sistema');
  console.log('  uninstall    Desinstalar el agente y limpiar archivos');
  console.log('  status       Mostrar estado del agente');
  console.log('  config       Ejecutar wizard de configuración');
  console.log('  help         Mostrar esta ayuda');
  console.log('');
  console.log('Opciones:');
  console.log('  --server, -s <url>     URL del servidor Mesa de Ayuda');
  console.log('  --org, -o <slug>       Slug de la organización');
  console.log('  --api-key, -k <key>    API Key para autenticación');
  console.log('  --interval, -i <min>   Intervalo de sincronización (minutos)');
  console.log('  --proxy <url>          Proxy HTTP/HTTPS');
  console.log('  --config, -c <path>    Ruta al archivo de configuración');
  console.log('  --no-tls-verify        Deshabilitar verificación TLS (cert autofirmados)');
  console.log('  --silent               Instalación sin interacción');
  console.log('  --log-level <level>    Nivel de log: debug, info, warn, error');
  console.log('');
  console.log('Ejemplos:');
  console.log('  stic-agent sync --server https://mesa.vercel.app --org stic');
  console.log('  stic-agent install --server https://soporte.yopal.gov.co --org stic --silent');
  console.log('  stic-agent install --server http://192.168.1.50:5000 --org stic --no-tls-verify');
  console.log('  stic-agent status');
  console.log('');
}

async function cmdSync(config) {
  const data = await collectAll();
  await syncWithServer(data, config);
}

async function cmdInstall(config) {
  // If not configured and not silent, run wizard
  if (!isConfigured(config) && !config._silent) {
    config = await runWizard(config);
  } else if (!isConfigured(config) && config._silent) {
    logger.error('Instalación silenciosa requiere --server y --org.');
    process.exit(1);
  }

  install(config);

  // Run first sync
  console.log('\n  🔄 Ejecutando primera sincronización...');
  try {
    await cmdSync(config);
    console.log('  \x1b[32m✅ Primera sincronización completada exitosamente.\x1b[0m\n');
  } catch (err) {
    console.log(`  \x1b[33m⚠️ Primera sincronización falló: ${err.message}\x1b[0m`);
    console.log('  El agente reintentará automáticamente en el próximo ciclo.\n');
  }
}

function cmdUninstall() {
  uninstall();
  console.log('\n  \x1b[32m✅ STIC Agent desinstalado correctamente.\x1b[0m\n');
}

function cmdStatus() {
  const status = getStatus();
  console.log(BANNER);
  console.log('  \x1b[36mEstado del Agente:\x1b[0m');
  console.log(`    Plataforma:       ${status.platform}`);
  console.log(`    Directorio:       ${status.configDir}`);
  console.log(`    Configurado:      ${status.configExists ? '\x1b[32mSí\x1b[0m' : '\x1b[31mNo\x1b[0m'}`);
  console.log(`    Servicio:         ${status.serviceStatus}`);
  console.log(`    Última sync:      ${status.lastSync}`);
  console.log(`    Log:              ${status.logPath}`);
  console.log('');
}

async function cmdConfig(config) {
  await runWizard(config);
}

async function main() {
  const config = loadConfig();

  // Initialize logger
  logger.init({ logLevel: config.logLevel, logPath: config.logPath });

  const command = config._command;

  try {
    switch (command) {
      case 'sync':
        if (!isConfigured(config)) {
          logger.error('El agente no está configurado. Ejecute: stic-agent config');
          process.exit(1);
        }
        await cmdSync(config);
        break;

      case 'install':
        console.log(BANNER);
        await cmdInstall(config);
        break;

      case 'uninstall':
        console.log(BANNER);
        cmdUninstall();
        break;

      case 'status':
        cmdStatus();
        break;

      case 'config':
        await cmdConfig(config);
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        printHelp();
        break;
    }
  } catch (err) {
    logger.error(`Error fatal: ${err.message}`);
    logger.debug('Stack:', err.stack);
    process.exit(1);
  }
}

main();
