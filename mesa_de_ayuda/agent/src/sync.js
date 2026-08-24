const http = require('http');
const https = require('https');
const { URL } = require('url');
const logger = require('./logger');

function buildRequestOptions(serverUrl, config) {
  const url = new URL('/api/assets/sync', serverUrl);
  const isHttps = url.protocol === 'https:';

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `STIC-Agent/${config.agentVersion || '1.0.0'}`,
    },
    timeout: (config.network && config.network.timeout) || 15000,
  };

  if (config.organizationSlug) {
    options.headers['X-Organization-Slug'] = config.organizationSlug;
  }
  if (config.apiKey) {
    options.headers['X-Agent-Key'] = config.apiKey;
  }

  // Handle self-signed certificates
  if (isHttps && config.network && config.network.rejectUnauthorized === false) {
    options.rejectUnauthorized = false;
  }

  return { options, isHttps };
}

function makeRequest(options, isHttps, body) {
  return new Promise((resolve, reject) => {
    const transport = isHttps ? https : http;
    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: json });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${json.error || json.message || data}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function syncWithServer(collectedData, config) {
  const serverUrl = config.serverUrl;
  if (!serverUrl) {
    throw new Error('No se ha configurado la URL del servidor (serverUrl). Use --server <url> o configure stic-agent.config.json');
  }

  const payload = { ...collectedData };
  if (config.organizationSlug) {
    payload.organizationSlug = config.organizationSlug;
  }

  const retries = (config.network && config.network.retries) || 3;
  const retryDelay = (config.network && config.network.retryDelay) || 5000;

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Sincronizando con ${serverUrl} (intento ${attempt}/${retries})...`);
      const { options, isHttps } = buildRequestOptions(serverUrl, config);
      const result = await makeRequest(options, isHttps, payload);

      logger.info(`✅ Sincronización exitosa.`, {
        assetId: result.body.assetId || result.body.id,
        statusCode: result.statusCode,
      });
      return result;
    } catch (err) {
      lastError = err;
      logger.warn(`⚠️ Intento ${attempt}/${retries} falló: ${err.message}`);

      if (attempt < retries) {
        const delay = retryDelay * attempt;
        logger.info(`Reintentando en ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  logger.error(`❌ Sincronización falló tras ${retries} intentos: ${lastError.message}`);
  throw lastError;
}

module.exports = { syncWithServer };
