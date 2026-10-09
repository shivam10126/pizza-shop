import { createStore, memoryStorage } from './local/store.js';
import { createLocalApi } from './local/localApi.js';
import { LocalError, LOCAL_SETTINGS } from './local/common.js';
import menuSeed from '../../shared/menu-seed.json';

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

// ---------------------------------------------------------------------------
// Mode detection: "server" when the API reports a connected database,
// otherwise "local" (API running without a database, or no API at all).
// In local mode every request is answered in the browser from localStorage.
// ---------------------------------------------------------------------------
let modePromise = null;
let serverSettings = null;
let localApi = null;

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
  return res.json();
}

async function detectMode() {
  try {
    const health = await fetchJson('/health');
    if (health && health.database && health.database.connected) return 'server';
  } catch {
    return 'local'; // no server at all
  }
  // Server is up but has no database: borrow its shop settings for local mode.
  try {
    serverSettings = await fetchJson('/settings');
  } catch {
    serverSettings = null;
  }
  return 'local';
}

/** Resolves to "server" or "local" (detected once per page load). */
export function getMode() {
  if (!modePromise) modePromise = detectMode();
  return modePromise;
}

function browserStorage() {
  try {
    const s = window.localStorage;
    s.setItem('__pizza_shop_probe', '1');
    s.removeItem('__pizza_shop_probe');
    return s;
  } catch {
    return memoryStorage();
  }
}

function getLocalApi() {
  if (!localApi) {
    const settings = { ...LOCAL_SETTINGS, ...(serverSettings || {}) };
    const store = createStore({ seed: menuSeed, storage: browserStorage(), settings });
    localApi = createLocalApi(store, { settings });
  }
  return localApi;
}

/** JSON in, JSON out; throws ApiError on failure. Works in both modes. */
export async function api(path, { method = 'GET', body, token } = {}) {
  if ((await getMode()) === 'local') {
    try {
      return await getLocalApi().request(path, { method, body, token });
    } catch (err) {
      if (err instanceof LocalError) throw new ApiError(err.message, err.status, err.data);
      throw err;
    }
  }

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
