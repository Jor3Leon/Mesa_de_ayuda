const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getSystemConfigDir, saveConfig } = require('./config');
const logger = require('./logger');

function getAgentBinaryPath() {
  // If running as compiled pkg binary, use process.execPath
  // If running as node script, use the script path
  return process.pkg ? process.execPath : process.argv[1];
}

function getInstallBinaryPath() {
  const platform = os.platform();
  if (platform === 'win32') return path.join(getSystemConfigDir(), 'stic-agent.exe');
  return '/usr/local/bin/stic-agent';
}

// ==================== WINDOWS ====================
function installWindows(config) {
  const configDir = getSystemConfigDir();
  const binaryDest = getInstallBinaryPath();
  const binarySrc = getAgentBinaryPath();
  const intervalMinutes = config.syncIntervalMinutes || 30;
  const taskName = 'STIC-Agent-Sync';

  logger.info(`[Windows] Instalando en ${configDir}...`);

  // Create directory
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Copy binary
  if (binarySrc !== binaryDest) {
    fs.copyFileSync(binarySrc, binaryDest);
    logger.info(`Binario copiado a ${binaryDest}`);
  }

  // Save config
  saveConfig(config);

  // Remove existing task if any
  try { execSync(`schtasks /Delete /TN "${taskName}" /F 2>nul`, { windowsHide: true }); } catch (e) { /* ok */ }

  // Create scheduled task
  execSync(
    `schtasks /Create /TN "${taskName}" /TR "\\"${binaryDest}\\" sync" /SC MINUTE /MO ${intervalMinutes} /RU SYSTEM /RL HIGHEST /F`,
    { windowsHide: true }
  );

  logger.info(`✅ Tarea programada "${taskName}" creada (cada ${intervalMinutes} min)`);
}

function uninstallWindows() {
  const configDir = getSystemConfigDir();
  const taskName = 'STIC-Agent-Sync';

  logger.info('[Windows] Desinstalando...');

  // Remove scheduled task
  try { execSync(`schtasks /Delete /TN "${taskName}" /F 2>nul`, { windowsHide: true }); } catch (e) { /* ok */ }
  logger.info('Tarea programada eliminada.');

  // Remove files
  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true, force: true });
    logger.info(`Directorio ${configDir} eliminado.`);
  }
}

// ==================== LINUX ====================
function installLinux(config) {
  const configDir = getSystemConfigDir();
  const binaryDest = getInstallBinaryPath();
  const binarySrc = getAgentBinaryPath();
  const intervalMinutes = config.syncIntervalMinutes || 30;

  logger.info(`[Linux] Instalando en ${configDir}...`);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Copy binary
  if (binarySrc !== binaryDest) {
    fs.copyFileSync(binarySrc, binaryDest);
    fs.chmodSync(binaryDest, '755');
    logger.info(`Binario copiado a ${binaryDest}`);
  }

  saveConfig(config);

  // Create systemd service
  const serviceContent = `[Unit]
Description=STIC Agent - Inventory Sync
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${binaryDest} sync
StandardOutput=journal
StandardError=journal
`;

  const timerContent = `[Unit]
Description=STIC Agent Sync Timer

[Timer]
OnBootSec=2min
OnUnitActiveSec=${intervalMinutes}min
Persistent=true

[Install]
WantedBy=timers.target
`;

  fs.writeFileSync('/etc/systemd/system/stic-agent.service', serviceContent);
  fs.writeFileSync('/etc/systemd/system/stic-agent.timer', timerContent);

  execSync('systemctl daemon-reload');
  execSync('systemctl enable stic-agent.timer');
  execSync('systemctl start stic-agent.timer');

  logger.info(`✅ Servicio systemd instalado (cada ${intervalMinutes} min)`);
}

function uninstallLinux() {
  const configDir = getSystemConfigDir();
  const binaryDest = getInstallBinaryPath();

  logger.info('[Linux] Desinstalando...');

  try { execSync('systemctl stop stic-agent.timer 2>/dev/null'); } catch (e) { /* ok */ }
  try { execSync('systemctl disable stic-agent.timer 2>/dev/null'); } catch (e) { /* ok */ }

  const files = [
    '/etc/systemd/system/stic-agent.service',
    '/etc/systemd/system/stic-agent.timer',
  ];
  files.forEach(f => { try { fs.unlinkSync(f); } catch (e) { /* ok */ } });
  try { execSync('systemctl daemon-reload'); } catch (e) { /* ok */ }

  if (fs.existsSync(binaryDest)) fs.unlinkSync(binaryDest);
  if (fs.existsSync(configDir)) fs.rmSync(configDir, { recursive: true, force: true });

  logger.info('✅ Desinstalación completa.');
}

// ==================== macOS ====================
function installMacOS(config) {
  const configDir = getSystemConfigDir();
  const binaryDest = getInstallBinaryPath();
  const binarySrc = getAgentBinaryPath();
  const intervalSeconds = (config.syncIntervalMinutes || 30) * 60;
  const plistPath = '/Library/LaunchDaemons/com.stic.agent.plist';

  logger.info(`[macOS] Instalando en ${configDir}...`);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (binarySrc !== binaryDest) {
    fs.copyFileSync(binarySrc, binaryDest);
    fs.chmodSync(binaryDest, '755');
    logger.info(`Binario copiado a ${binaryDest}`);
  }

  saveConfig(config);

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.stic.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>${binaryDest}</string>
    <string>sync</string>
  </array>
  <key>StartInterval</key>
  <integer>${intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/var/log/stic-agent.log</string>
  <key>StandardErrorPath</key>
  <string>/var/log/stic-agent.err.log</string>
</dict>
</plist>`;

  fs.writeFileSync(plistPath, plistContent);
  execSync(`launchctl load ${plistPath}`);

  logger.info(`✅ LaunchDaemon instalado (cada ${config.syncIntervalMinutes || 30} min)`);
}

function uninstallMacOS() {
  const configDir = getSystemConfigDir();
  const binaryDest = getInstallBinaryPath();
  const plistPath = '/Library/LaunchDaemons/com.stic.agent.plist';

  logger.info('[macOS] Desinstalando...');

  try { execSync(`launchctl unload ${plistPath} 2>/dev/null`); } catch (e) { /* ok */ }
  try { fs.unlinkSync(plistPath); } catch (e) { /* ok */ }

  if (fs.existsSync(binaryDest)) fs.unlinkSync(binaryDest);
  if (fs.existsSync(configDir)) fs.rmSync(configDir, { recursive: true, force: true });

  logger.info('✅ Desinstalación completa.');
}

// ==================== DISPATCHER ====================
function install(config) {
  const platform = os.platform();
  if (platform === 'win32') return installWindows(config);
  if (platform === 'linux') return installLinux(config);
  if (platform === 'darwin') return installMacOS(config);
  throw new Error(`Plataforma no soportada: ${platform}`);
}

function uninstall() {
  const platform = os.platform();
  if (platform === 'win32') return uninstallWindows();
  if (platform === 'linux') return uninstallLinux();
  if (platform === 'darwin') return uninstallMacOS();
  throw new Error(`Plataforma no soportada: ${platform}`);
}

function getStatus() {
  const platform = os.platform();
  const configDir = getSystemConfigDir();
  const configExists = fs.existsSync(path.join(configDir, 'config.json'));
  const logPath = path.join(configDir, 'agent.log');
  let lastSync = 'Nunca';

  if (fs.existsSync(logPath)) {
    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n').reverse();
      const syncLine = lines.find(l => l.includes('Sincronización exitosa'));
      if (syncLine) {
        const match = syncLine.match(/\[([\d\-T:.Z]+)\]/);
        if (match) lastSync = match[1];
      }
    } catch (e) { /* ok */ }
  }

  let serviceStatus = 'Desconocido';
  try {
    if (platform === 'win32') {
      execSync('schtasks /Query /TN "STIC-Agent-Sync" 2>nul', { windowsHide: true });
      serviceStatus = 'Activo (Tarea Programada)';
    } else if (platform === 'linux') {
      const out = execSync('systemctl is-active stic-agent.timer 2>/dev/null', { encoding: 'utf-8' }).trim();
      serviceStatus = out === 'active' ? 'Activo (systemd timer)' : 'Inactivo';
    } else if (platform === 'darwin') {
      execSync('launchctl list com.stic.agent 2>/dev/null');
      serviceStatus = 'Activo (LaunchDaemon)';
    }
  } catch (e) {
    serviceStatus = 'No instalado';
  }

  return {
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    configDir,
    configExists,
    serviceStatus,
    lastSync,
    logPath: fs.existsSync(logPath) ? logPath : 'N/A',
  };
}

module.exports = { install, uninstall, getStatus };
