const crypto = require('crypto');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const DEFAULT_SECRET = 'mesa-de-ayuda-yopal-dev-secret';

function getAuthSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
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

function signValue(value) {
  return crypto.createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
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

module.exports = {
  createToken,
  hashPassword,
  verifyPassword,
  verifyToken,
};
