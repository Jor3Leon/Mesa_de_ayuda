const crypto = require('crypto');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
const RESET_TTL_MS = 1000 * 60 * 15; // 15 minutes
let dynamicFallbackSecret = null;

function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La variable de entorno AUTH_SECRET es obligatoria en producción.');
  }
  if (!dynamicFallbackSecret) {
    console.warn('[SECURITY WARNING] AUTH_SECRET no está configurada. Usando clave efímera en memoria (las sesiones se invalidarán al reiniciar).');
    dynamicFallbackSecret = crypto.randomBytes(32).toString('hex');
  }
  return dynamicFallbackSecret;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  const [salt, storedHash] = String(storedValue || '').split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (hash.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hash, storedBuffer);
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(payload) {
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

function signValue(value, customSecret = null) {
  const secret = customSecret || getAuthSecret();
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createToken(user) {
  const payload = {
    sub: user.id,
    role: typeof user.role === 'string' ? user.role : user.role?.name,
    name: user.name,
    email: user.email,
    organizationId: user.organizationId || user.organization?.id || null,
    organizationSlug: user.organization?.slug || null,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encoded = encodePayload(payload);
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  const [encoded, signature] = String(token || '').split('.');

  if (!encoded || !signature) {
    throw new Error('Invalid token.');
  }

  const expected = signValue(encoded);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error('Invalid token.');
  }

  const payload = decodePayload(encoded);

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('Token expired.');
  }

  return payload;
}

function createPasswordResetToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    exp: Date.now() + RESET_TTL_MS,
  };

  const userSpecificSecret = `${getAuthSecret()}:${user.passwordHash}`;
  const encoded = encodePayload(payload);
  const signature = signValue(encoded, userSpecificSecret);
  return `${encoded}.${signature}`;
}

function verifyPasswordResetToken(token, user) {
  const [encoded, signature] = String(token || '').split('.');

  if (!encoded || !signature) {
    throw new Error('Token de recuperación inválido.');
  }

  const userSpecificSecret = `${getAuthSecret()}:${user.passwordHash}`;
  const expected = signValue(encoded, userSpecificSecret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error('Token de recuperación inválido o ya utilizado.');
  }

  const payload = decodePayload(encoded);

  if (payload.sub !== user.id || payload.email !== user.email) {
    throw new Error('El token no corresponde a este usuario.');
  }

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error('El token de recuperación ha expirado.');
  }

  return payload;
}

module.exports = {
  createToken,
  hashPassword,
  verifyPassword,
  verifyToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
};
