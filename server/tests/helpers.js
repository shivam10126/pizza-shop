// Shared test setup: runs the real migrations + seeds against an in-memory
// SQLite database, then starts the Express app on a random port.
process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.TAX_RATE = '0.05';
process.env.DELIVERY_FEE = '40';
process.env.FREE_DELIVERY_OVER = '500';
process.env.CURRENCY_SYMBOL = '₹';

const db = require('../src/db/knex');
const { createApp } = require('../src/app');

let server;
let baseUrl;

async function startServer() {
  await db.migrate.latest();
  await db.seed.run();
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function stopServer() {
  await new Promise((resolve) => server.close(resolve));
  await db.destroy();
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function loginAsAdmin() {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  });
  if (res.status !== 200) throw new Error(`admin login failed: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

/** Seed ids: pizza 1 = Margherita (S 199 / M 299 / L 399), topping 1 = Extra Cheese (40). */
function sampleOrder(overrides = {}) {
  return {
    customer: {
      name: 'Test Customer',
      phone: '+91 98765 43210',
      email: 'test@example.com',
      address: '12 Baker Street, Springfield',
    },
    orderType: 'DELIVERY',
    paymentMethod: 'CASH',
    notes: 'Ring the bell twice',
    items: [{ pizzaId: 1, sizeId: 2, quantity: 2, toppingIds: [1] }],
    ...overrides,
  };
}

module.exports = { db, startServer, stopServer, api, loginAsAdmin, sampleOrder, getBaseUrl: () => baseUrl };
