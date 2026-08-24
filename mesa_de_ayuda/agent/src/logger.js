const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LABELS = { 0: 'DEBUG', 1: 'INFO', 2: 'WARN', 3: 'ERROR' };
const LOG_COLORS = { 0: '\x1b[90m', 1: '\x1b[36m', 2: '\x1b[33m', 3: '\x1b[31m' };
const RESET = '\x1b[0m';

let currentLevel = LOG_LEVELS.info;
let logFilePath = null;
let maxLogSizeMB = 5;

function getDefaultLogPath() {
  const platform = os.platform();
  if (platform === 'win32') return path.join('C:\\ProgramData\\STIC-Agent', 'agent.log');
  if (platform === 'darwin') return path.join('/Library/Application Support/STIC-Agent', 'agent.log');
  return path.join('/var/log', 'stic-agent.log');
}

function init(options = {}) {
  if (options.logLevel && LOG_LEVELS[options.logLevel] !== undefined) {
    currentLevel = LOG_LEVELS[options.logLevel];
  }
  logFilePath = options.logPath || getDefaultLogPath();
  
  try {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // If we can't create log directory, we'll just log to console
    logFilePath = null;
  }
}

function rotateIfNeeded() {
  if (!logFilePath) return;
  try {
    const stats = fs.statSync(logFilePath);
    if (stats.size > maxLogSizeMB * 1024 * 1024) {
      const backup = logFilePath + '.old';
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(logFilePath, backup);
    }
  } catch (e) {
    // File doesn't exist yet, that's fine
  }
}

function formatMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  const label = LOG_LABELS[level] || 'INFO';
  let line = `[${timestamp}] [${label}] ${message}`;
  if (data !== undefined) {
    line += ' ' + (typeof data === 'object' ? JSON.stringify(data) : String(data));
  }
  return line;
}

function log(level, message, data) {
  if (level < currentLevel) return;

  const formatted = formatMessage(level, message, data);
  const color = LOG_COLORS[level] || '';

  // Console output
  if (level >= LOG_LEVELS.error) {
    console.error(`${color}${formatted}${RESET}`);
  } else {
    console.log(`${color}${formatted}${RESET}`);
  }

  // File output
  if (logFilePath) {
    try {
      rotateIfNeeded();
      fs.appendFileSync(logFilePath, formatted + '\n');
    } catch (e) {
      // Silently fail file logging
    }
  }
}

module.exports = {
  init,
  debug: (msg, data) => log(LOG_LEVELS.debug, msg, data),
  info: (msg, data) => log(LOG_LEVELS.info, msg, data),
  warn: (msg, data) => log(LOG_LEVELS.warn, msg, data),
  error: (msg, data) => log(LOG_LEVELS.error, msg, data),
  getLogPath: () => logFilePath,
};
