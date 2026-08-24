const si = require('systeminformation');
const os = require('os');
const { execSync } = require('child_process');
const logger = require('./logger');

const AGENT_VERSION = '1.0.0';

function detectDeviceType(systemInfo) {
  const model = (systemInfo.model || '').toLowerCase();
  const manufacturer = (systemInfo.manufacturer || '').toLowerCase();

  if (systemInfo.virtual) return 'Máquina Virtual';
  if (/laptop|notebook|portable|thinkpad|latitude|elitebook|pavilion|inspiron|macbook/i.test(model)) return 'Laptop';
  if (/server/i.test(model) || /proliant|poweredge/i.test(model)) return 'Servidor';
  if (/mini|nuc|nano|tiny|micro/i.test(model)) return 'Mini PC';
  if (/all.in.one|aio/i.test(model)) return 'All in One';
  return 'Desktop';
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${Math.round(gb)} GB` : `${Math.round(gb * 1024)} MB`;
}

function formatRam(memLayout) {
  if (!memLayout || memLayout.length === 0) return 'Desconocida';
  const totalGB = memLayout.reduce((sum, m) => sum + (m.size || 0), 0) / (1024 * 1024 * 1024);
  const sticks = memLayout.filter(m => m.size > 0);
  const types = [...new Set(sticks.map(m => m.type).filter(Boolean))];
  const speeds = [...new Set(sticks.map(m => m.clockSpeed).filter(Boolean))];

  let summary = `${Math.round(totalGB)} GB`;
  if (sticks.length > 0) summary += ` (${sticks.length}x${formatBytes(sticks[0].size)})`;
  if (types.length > 0) summary += ` ${types.join('/')}`;
  if (speeds.length > 0) summary += ` ${speeds[0]}MHz`;
  return summary;
}

function formatStorage(diskLayout) {
  if (!diskLayout || diskLayout.length === 0) return 'Desconocido';
  return diskLayout.map(d => {
    const size = formatBytes(d.size);
    const type = d.type || (d.interfaceType === 'NVMe' ? 'NVMe' : 'HDD');
    const name = d.name || d.vendor || '';
    return `${type} ${size} ${name}`.trim();
  }).join(' + ');
}

function formatNetwork(interfaces) {
  if (!interfaces || interfaces.length === 0) return 'Sin red';
  const active = interfaces.filter(i => !i.internal && i.ip4 && i.ip4 !== '127.0.0.1');
  if (active.length === 0) return 'Sin red activa';

  return active.map(i => {
    const parts = [i.iface || 'NIC'];
    if (i.ip4) parts.push(i.ip4);
    if (i.mac && i.mac !== '00:00:00:00:00:00') parts.push(`MAC:${i.mac}`);
    if (i.speed) parts.push(`${i.speed}Mbps`);
    return parts.join(' | ');
  }).join(' ; ');
}

function formatGraphics(controllers) {
  if (!controllers || controllers.length === 0) return 'Desconocida';
  return controllers.map(c => {
    const name = c.model || c.vendor || 'GPU';
    const vram = c.vram ? `${c.vram}MB` : '';
    return `${name} ${vram}`.trim();
  }).join(' + ');
}

function formatDisplays(displays) {
  if (!displays || displays.length === 0) return 'Sin monitor';
  return displays.map(d => {
    const parts = [];
    if (d.model && d.model !== 'Default Monitor') parts.push(d.model);
    if (d.vendor) parts.push(d.vendor);
    if (d.resolutionX && d.resolutionY) parts.push(`${d.resolutionX}x${d.resolutionY}`);
    if (d.currentRefreshRate) parts.push(`${d.currentRefreshRate}Hz`);
    if (d.sizex && d.sizey) {
      const diag = Math.sqrt(d.sizex * d.sizex + d.sizey * d.sizey) / 25.4;
      if (diag > 5) parts.push(`${Math.round(diag)}"`);
    }
    return parts.length > 0 ? parts.join(' ') : 'Monitor';
  }).join(' + ');
}

function getPrimaryIp(interfaces) {
  if (!interfaces || interfaces.length === 0) return '0.0.0.0';
  const active = interfaces.filter(i => !i.internal && i.ip4 && i.ip4 !== '127.0.0.1');
  if (active.length === 0) return '0.0.0.0';

  // Prefer wired over wireless
  const wired = active.find(i => /eth|en[0-9]|local/i.test(i.iface));
  return (wired || active[0]).ip4;
}

function getInstalledSoftwareWindows() {
  try {
    const regPaths = [
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    ];

    const programs = [];
    for (const regPath of regPaths) {
      try {
        const output = execSync(
          `reg query "${regPath}" /s /v DisplayName 2>nul`,
          { encoding: 'utf-8', timeout: 30000, windowsHide: true }
        );

        let currentKey = '';
        const lines = output.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('HKEY_')) {
            currentKey = trimmed;
          } else if (trimmed.includes('DisplayName') && trimmed.includes('REG_SZ')) {
            const name = trimmed.split('REG_SZ').pop().trim();
            if (name && !name.startsWith('KB') && !name.startsWith('Update for')) {
              let version = '';
              let publisher = '';
              try {
                const vOut = execSync(`reg query "${currentKey}" /v DisplayVersion 2>nul`, { encoding: 'utf-8', timeout: 5000, windowsHide: true });
                const vMatch = vOut.match(/DisplayVersion\s+REG_SZ\s+(.+)/);
                if (vMatch) version = vMatch[1].trim();
              } catch (e) { /* no version */ }
              try {
                const pOut = execSync(`reg query "${currentKey}" /v Publisher 2>nul`, { encoding: 'utf-8', timeout: 5000, windowsHide: true });
                const pMatch = pOut.match(/Publisher\s+REG_SZ\s+(.+)/);
                if (pMatch) publisher = pMatch[1].trim();
              } catch (e) { /* no publisher */ }

              if (!programs.some(p => p.name === name)) {
                programs.push({ name, version, publisher });
              }
            }
          }
        }
      } catch (e) { /* registry path not accessible */ }
    }
    return programs.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    logger.warn('No se pudo obtener software instalado (Windows):', e.message);
    return [];
  }
}

function getInstalledSoftwareLinux() {
  try {
    // Try dpkg first (Debian/Ubuntu)
    try {
      const output = execSync("dpkg-query -W -f='${Package}|${Version}|${Maintainer}\\n' 2>/dev/null", { encoding: 'utf-8', timeout: 30000 });
      return output.trim().split('\n').filter(Boolean).map(line => {
        const [name, version, publisher] = line.split('|');
        return { name: name || '', version: version || '', publisher: publisher || '' };
      }).slice(0, 500);
    } catch (e) { /* not dpkg */ }

    // Try rpm (CentOS/RHEL/Fedora)
    try {
      const output = execSync("rpm -qa --queryformat '%{NAME}|%{VERSION}|%{VENDOR}\\n' 2>/dev/null", { encoding: 'utf-8', timeout: 30000 });
      return output.trim().split('\n').filter(Boolean).map(line => {
        const [name, version, publisher] = line.split('|');
        return { name: name || '', version: version || '', publisher: publisher || '' };
      }).slice(0, 500);
    } catch (e) { /* not rpm */ }

    return [];
  } catch (e) {
    logger.warn('No se pudo obtener software instalado (Linux):', e.message);
    return [];
  }
}

function getInstalledSoftwareMac() {
  try {
    const output = execSync("system_profiler SPApplicationsDataType -json 2>/dev/null", { encoding: 'utf-8', timeout: 60000 });
    const data = JSON.parse(output);
    const apps = data.SPApplicationsDataType || [];
    return apps.map(app => ({
      name: app._name || '',
      version: app.version || '',
      publisher: app.obtained_from || '',
    })).slice(0, 500);
  } catch (e) {
    logger.warn('No se pudo obtener software instalado (macOS):', e.message);
    return [];
  }
}

function getInstalledSoftware() {
  const platform = os.platform();
  if (platform === 'win32') return getInstalledSoftwareWindows();
  if (platform === 'linux') return getInstalledSoftwareLinux();
  if (platform === 'darwin') return getInstalledSoftwareMac();
  return [];
}

async function collectAll() {
  logger.info('Recolectando información del sistema...');

  const [
    systemInfo,
    osInfo,
    cpuInfo,
    memLayout,
    diskLayout,
    networkInterfaces,
    graphics,
    baseboard,
    users,
  ] = await Promise.all([
    si.system(),
    si.osInfo(),
    si.cpu(),
    si.memLayout(),
    si.diskLayout(),
    si.networkInterfaces(),
    si.graphics(),
    si.baseboard(),
    si.users(),
  ]);

  const installedSoftware = getInstalledSoftware();
  logger.info(`Software instalado detectado: ${installedSoftware.length} programas`);

  const activeUser = (users && users.length > 0) ? users[0].user : os.userInfo().username;

  const data = {
    hostname: os.hostname(),
    serialNumber: systemInfo.serial || '',
    ipAddress: getPrimaryIp(networkInterfaces),
    osType: osInfo.distro || osInfo.platform || os.type(),
    osVersion: `${osInfo.release || ''} (Build ${osInfo.build || osInfo.kernel || ''})`.trim(),
    brand: systemInfo.manufacturer || '',
    model: systemInfo.model || '',
    deviceType: detectDeviceType(systemInfo),
    cpuModel: `${cpuInfo.manufacturer || ''} ${cpuInfo.brand || ''} @ ${cpuInfo.speed || '?'}GHz (${cpuInfo.cores || '?'} cores)`.trim(),
    ramSummary: formatRam(memLayout),
    storageSummary: formatStorage(diskLayout),
    networkSummary: formatNetwork(networkInterfaces),
    motherboard: `${baseboard.manufacturer || ''} ${baseboard.model || ''}`.trim(),
    graphicsInfo: formatGraphics(graphics.controllers),
    displayInfo: formatDisplays(graphics.displays),
    assignedUser: activeUser,
    agentVersion: AGENT_VERSION,
    installedSoftware: JSON.stringify(installedSoftware),
  };

  logger.info(`Sistema recolectado: ${data.hostname} (${data.brand} ${data.model})`);
  logger.debug('Payload completo:', data);

  return data;
}

module.exports = { collectAll, AGENT_VERSION };
