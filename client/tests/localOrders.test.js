import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DB_KEY } from '../src/local/store.js';
import { setup, expectStatus, sampleOrder, login } from './helpers.js';

test('menu comes from the shared seed and ships with demo orders', async () => {
  const { api } = setup();
  const menu = await api.request('/menu');
  assert.equal(menu.categories.length, 4);
  assert.equal(menu.categories.flatMap((c) => c.pizzas).length, 10);
  assert.equal(menu.toppings.length, 9);
  assert.equal((await api.request('/health')).database.connected, false);

  const { token } = await login(api);
  const stats = await api.request('/admin/stats', { token });
  assert.deepEqual(stats.byStatus, {
    PENDING: 1, CONFIRMED: 1, PREPARING: 1, OUT_FOR_DELIVERY: 1, COMPLETED: 2, CANCELLED: 1,
  });
  const list = await api.request('/admin/orders?pageSize=50', { token });
  assert.equal(list.total, 7);
  assert.equal(list.orders[0].orderNumber, 'PZ-DEMO2A'); // newest first
  const tracked = await api.request('/orders/track', { method: 'POST', body: { orderNumber: 'pz-demo2a', phone: '98765 01234' } });
  assert.equal(tracked.order.customer.name, 'Priya Sharma');
  assert.equal(tracked.order.statusHistory.length, 1);
});

test('orders are priced like the server and persist in storage', async () => {
  const { api, storage } = setup();
  const { order } = await api.request('/orders', { method: 'POST', body: sampleOrder() });
  assert.match(order.orderNumber, /^PZ-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(order.items[0].unitPrice, 339);
  assert.equal(order.subtotal, 678);
  assert.equal(order.tax, 33.9);
  assert.equal(order.deliveryFee, 0);
  assert.equal(order.total, 711.9);
  assert.equal(order.customer.phone, '+919876543210');

  const small = await api.request('/orders', { method: 'POST', body: sampleOrder({ items: [{ pizzaId: 1, sizeId: 1, quantity: 1 }] }) });
  assert.equal(small.order.deliveryFee, 40);
  assert.equal(small.order.total, 248.95);
  assert.equal(small.order.customer.id, order.customer.id); // same phone -> same customer

  // a second store over the same storage sees the saved data
  const again = setup(storage);
  const tracked = await again.api.request('/orders/track', { method: 'POST', body: { orderNumber: order.orderNumber, phone: '+91-98765-43210' } });
  assert.equal(tracked.order.total, 711.9);
  assert.equal(JSON.parse(storage.getItem(DB_KEY)).orders.length, 9);
});

test('validation and lookups fail like the server', async () => {
  const { api } = setup();
  const err = await expectStatus(api.request('/orders', { method: 'POST', body: sampleOrder({ items: [] }) }), 400);
  assert.ok(err.data.errors.some((e) => e.field === 'items'));
  await expectStatus(api.request('/orders', { method: 'POST', body: sampleOrder({ items: [{ pizzaId: 999, sizeId: 1, quantity: 1 }] }) }), 400);
  await expectStatus(api.request('/orders/track', { method: 'POST', body: { orderNumber: 'PZ-DEMO2A', phone: '1111111111' } }), 404);
  await expectStatus(api.request('/nope'), 404);
});
