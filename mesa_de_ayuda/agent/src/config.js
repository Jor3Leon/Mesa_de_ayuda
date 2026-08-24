const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULTS = {
  serverUrl: '',
  organizationSlug: '',
  syncIntervalMinutes: 30,
  apiKey: '',
  proxy: '',
  logLevel: 'info',
  logPath: '',
  network: {
    timeout: 15000,
    retries: 3,
    retryDelay: 5000,
    rejectUnauthorized: true,
  },
};

function getSystemConfigDir() {
  const platform = os.platform();
  if (platform === 'win32') return path.join('C:\\ProgramData', 'STIC-Agent');
  if (platform === 'darwin') return path.join('/Library/Application Support', 'STIC-Agent');
  return '/etc/stic-agent';
}

function getSystemConfigPath() {
  return path.join(getSystemConfigDir(), 'config.json');
}

function findConfigFile(cliConfigPath) {
  // Priority 1: CLI argument
  if (cliConfigPath && fs.existsSync(cliConfigPath)) {
    return cliConfigPath;
  }

  // Priority 2: Current directory
  const localConfig = path.join(process.cwd(), 'stic-agent.config.json');
  if (fs.existsSync(localConfig)) {
    return localConfig;
  }

  // Priority 3: Next to the executable
  const exeDir = path.dirname(process.execPath || process.argv[0]);
  const exeConfig = path.join(exeDir, 'stic-agent.config.json');
  if (fs.existsSync(exeConfig)) {
    return exeConfig;
  }

  // Priority 4: System config directory
  const sysConfig = getSystemConfigPath();
  if (fs.existsSync(sysConfig)) {
    return sysConfig;
  }

  return null;
}

function loadFileConfig(configPath) {
  if (!configPath) return {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function loadEnvConfig() {
  const env = {};
  if (process.env.STIC_SERVER_URL) env.serverUrl = process.env.STIC_SERVER_URL;
  if (process.env.STIC_ORG_SLUG) env.organizationSlug = process.env.STIC_ORG_SLUG;
  if (process.env.STIC_SYNC_INTERVAL) env.syncIntervalMinutes = parseInt(process.env.STIC_SYNC_INTERVAL, 10);
  if (process.env.STIC_API_KEY) env.apiKey = process.env.STIC_API_KEY;
  if (process.env.STIC_PROXY) env.proxy = process.env.STIC_PROXY;
  if (process.env.STIC_LOG_LEVEL) env.logLevel = process.env.STIC_LOG_LEVEL;
  if (process.env.STIC_LOG_PATH) env.logPath = process.env.STIC_LOG_PATH;
  return env;
}

function parseCliArgs(args) {
  const cli = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--server': case '-s': cli.serverUrl = next; i++; break;
      case '--org': case '-o': cli.organizationSlug = next; i++; break;
      case '--interval': case '-i': cli.syncIntervalMinutes = parseInt(next, 10); i++; break;
      case '--api-key': case '-k': cli.apiKey = next; i++; break;
      case '--proxy': cli.proxy = next; i++; break;
      case '--config': case '-c': cli._configPath = next; i++; break;
      case '--log-level': cli.logLevel = next; i++; break;
      case '--log-path': cli.logPath = next; i++; break;
      case '--no-tls-verify': cli.network = { ...(cli.network || {}), rejectUnauthorized: false }; break;
      case '--silent': cli._silent = true; break;
    }
  }
  return cli;
}

function deepMerge(target, ...sources) {
  for (const source of sources) {
    for (const key in source) {
      if (source[key] === undefined || source[key] === null) continue;
      if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

function loadConfig(processArgs) {
  const args = processArgs || process.argv.slice(2);
  const cliConfig = parseCliArgs(args);
  const envConfig = loadEnvConfig();
  const configFilePath = findConfigFile(cliConfig._configPath);
  const fileConfig = loadFileConfig(configFilePath);

  // Merge: DEFAULTS < FILE < ENV < CLI (CLI wins)
  const config = deepMerge({}, DEFAULTS, fileConfig, envConfig, cliConfig);

  // Extract command (first non-flag argument)
  config._command = args.find(a => !a.startsWith('-') && !Object.values(cliConfig).includes(a)) || 'sync';
  config._configFilePath = configFilePath;

  return config;
}

function saveConfig(config, filePath) {
  const savePath = filePath || getSystemConfigPath();
  const dir = path.dirname(savePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const toSave = {
    serverUrl: config.serverUrl,
    organizationSlug: config.organizationSlug,
    syncIntervalMinutes: config.syncIntervalMinutes,
    apiKey: config.apiKey || '',
    proxy: config.proxy || '',
    logLevel: config.logLevel || 'info',
    logPath: config.logPath || '',
    network: config.network || DEFAULTS.network,
  };

  fs.writeFileSync(savePath, JSON.stringify(toSave, null, 2), 'utf-8');
  return savePath;
}

function isConfigured(config) {
  return !!(config.serverUrl && config.organizationSlug);
}

module.exports = {
  loadConfig,
  saveConfig,
  isConfigured,
  getSystemConfigDir,
  getSystemConfigPath,
  DEFAULTS,
};
