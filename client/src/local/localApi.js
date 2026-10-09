// Local (no database) mode: an in-browser implementation of the same REST API
// the Express server exposes, backed by localStorage. Used automatically when
// the server reports no database connection or cannot be reached at all.
import { fail, LOCAL_SETTINGS } from './common.js';
import { orderRoutes } from './localOrders.js';
import { adminOrderRoutes } from './localAdminOrders.js';
import { menuRoutes } from './localMenu.js';

const SESSION_HOURS = 12;

function randomToken() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return `local-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName, role: u.role });

function authRoutes(ctx) {
  const { store } = ctx;
  return [
    {
      method: 'GET',
      pattern: /^\/health$/,
      handler: () => ({ status: 'ok', mode: 'local', database: { client: 'browser-localstorage', connected: false } }),
    },
    { method: 'GET', pattern: /^\/settings$/, handler: () => ({ ...ctx.settings }) },
    {
      method: 'POST',
      pattern: /^\/auth\/login$/,
      handler: ({ body }) => {
        const { username, password } = body;
        if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
          fail(400, 'Username and password are required');
        }
        const db = store.get();
        const user = db.users.find((u) => u.username === username.trim() && u.isActive);
        if (!user || user.password !== password) fail(401, 'Invalid username or password');
        const token = randomToken();
        db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
        db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + SESSION_HOURS * 3600000 });
        return { token, user: publicUser(user) };
      },
    },
    { method: 'GET', pattern: /^\/auth\/me$/, auth: 'any', handler: ({ user }) => ({ user: publicUser(user) }) },
    {
      method: 'POST',
      pattern: /^\/auth\/change-password$/,
      auth: 'any',
      handler: ({ body, user }) => {
        if (typeof body.newPassword !== 'string' || body.newPassword.length < 6) {
          fail(400, 'New password must be at least 6 characters');
        }
        if (String(body.currentPassword || '') !== user.password) fail(400, 'Current password is incorrect');
        user.password = body.newPassword;
        return { message: 'Password updated' };
      },
    },
  ];
}

function authenticate(store, token, level) {
  if (!token) fail(401, 'Authentication required');
  const db = store.get();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  const user = session && db.users.find((u) => u.id === session.userId && u.isActive);
  if (!user) fail(401, 'Your session has expired, please log in again');
  if (level === 'admin' && user.role !== 'ADMIN') fail(403, 'You do not have permission to do that');
  return user;
}

export function createLocalApi(store, { settings } = {}) {
  const ctx = { store, settings: { ...LOCAL_SETTINGS, ...(settings || {}) } };
  const routes = [...authRoutes(ctx), ...orderRoutes(ctx), ...adminOrderRoutes(ctx), ...menuRoutes(ctx)];

  /** Same signature as api(path, { method, body, token }); resolves with the JSON the server would send. */
  async function request(path, { method = 'GET', body, token } = {}) {
    const [pathname, search = ''] = String(path).split('?');
    const query = Object.fromEntries(new URLSearchParams(search));
    const route = routes.find((r) => r.method === method && r.pattern.test(pathname));
    if (!route) fail(404, `Route ${method} ${pathname} not found`);
    const params = route.pattern.exec(pathname).slice(1).map(Number);
    const user = route.auth ? authenticate(store, token, route.auth) : null;
    const result = route.handler({ params, query, body: body && typeof body === 'object' ? body : {}, token, user });
    store.save();
    // Detach the result from the store, like a real HTTP response would be.
    return JSON.parse(JSON.stringify(result));
  }

  return { request, settings: ctx.settings };
}
