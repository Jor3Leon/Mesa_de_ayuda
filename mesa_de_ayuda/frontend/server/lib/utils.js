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
};
