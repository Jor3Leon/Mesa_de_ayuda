function getDefaultApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000/api`;
  }

  return '/api';
}

const API_BASE_URL = getDefaultApiBaseUrl();

const AUTH_STORAGE_KEY = 'mesa_de_ayuda_auth';

export function getStoredSession() {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload.error || 'Request failed.';

    throw new Error(message);
  }

  return payload;
}

export async function apiRequest(path, options = {}) {
  const session = getStoredSession();
  const { headers, body, ...restOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isObjectBody = body !== undefined && body !== null && typeof body === 'object' && !isFormData;
  const finalBody = isObjectBody ? JSON.stringify(body) : body;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    body: finalBody,
    headers: {
      ...(finalBody !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(headers || {}),
    },
  });

  return parseResponse(response);
}

export const apiFetch = apiRequest;

export function getApiBaseUrl() {
  return API_BASE_URL;
}
