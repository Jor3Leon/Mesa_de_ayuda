/**
 * Utility functions for data validation and normalization.
 */

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createValidationError(`${fieldName} is required.`);
  }
  return value.trim();
}

function requirePositiveInt(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createValidationError(`${fieldName} debe ser un número entero positivo.`);
  }
  return parsed;
}

function normalizeOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === '' || value === 'null') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function normalizeAvatarDataUrl(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw createValidationError('avatarUrl must be a valid image.');
  }
  const normalized = value.trim();
  if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(normalized)) {
    throw createValidationError('avatarUrl must be a supported base64 image.');
  }
  if (normalized.length > 2_800_000) {
    throw createValidationError('avatarUrl exceeds the maximum allowed size.');
  }
  return normalized;
}

function normalizeOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError(`${fieldName} must be a valid date.`);
  }
  return parsed;
}

function normalizeUsername(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function isValidIpv4(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number.parseInt(part, 10);
    return num >= 0 && num <= 255 && String(num) === part;
  });
}

function isAllowedPrivateIpv4(ip) {
  if (!isValidIpv4(ip)) return false;
  const [a, b] = ip.trim().split('.').map(Number);

  // Reject 0.0.0.0/8
  if (a === 0) return false;

  // Reject 169.254.0.0/16 (Link-Local / Cloud Instance Metadata)
  if (a === 169 && b === 254) return false;

  // Reject multicast/reserved (224.0.0.0+)
  if (a >= 224) return false;

  // RFC 1918 & Loopback
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;

  return false;
}

function sanitizeHtmlServer(input) {
  if (typeof input !== 'string') return '';
  
  let clean = input;
  // 1. Remove dangerous tags and their content: script, iframe, object, embed, style, svg, canvas, applet, form, input, button, meta, link
  clean = clean.replace(/<\s*(script|iframe|object|embed|style|svg|canvas|applet|form|input|button|meta|link)[\s\S]*?(?:<\s*\/\s*\1\s*>|\/?>)/gi, '');

  // 2. Remove any remaining dangerous self-closing/broken tags
  clean = clean.replace(/<\s*\/?\s*(script|iframe|object|embed|style|svg|canvas|applet|form|input|button|meta|link)[\s\S]*?>/gi, '');

  // 3. Remove inline event handlers (on* attributes like onerror=, onload=, onclick=, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 4. Remove javascript:, vbscript: URIs in attributes
  clean = clean.replace(/(href|src|action)\s*=\s*(['"]?)\s*(?:javascript|vbscript):/gi, '$1=$2#');

  // 5. Remove expression(...) or -moz-binding in style attributes if any remain
  clean = clean.replace(/style\s*=\s*(['"]?)[^'"]*(?:expression|behavior|-moz-binding)[^'"]*\1/gi, '');

  return clean.trim();
}

module.exports = {
  createValidationError,
  createHttpError,
  requireNonEmptyString,
  requirePositiveInt,
  normalizeOptionalPositiveInt,
  normalizeOptionalString,
  normalizeAvatarDataUrl,
  normalizeOptionalDate,
  normalizeUsername,
  isValidIpv4,
  isAllowedPrivateIpv4,
  sanitizeHtmlServer,
};

