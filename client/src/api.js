const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errors = (data && data.errors) || [];
  }
}

/** Small fetch wrapper: JSON in, JSON out, throws ApiError on non-2xx. */
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is it running?', 0, null);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError((data && data.message) || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

/** Turns the API's [{ field, message }] list into { field: message }. */
export function fieldErrors(err) {
  const map = {};
  for (const e of (err && err.errors) || []) map[e.field] = e.message;
  return map;
}
