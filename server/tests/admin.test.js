const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, api, loginAsAdmin, sampleOrder } = require('./helpers');

let token;

before(async () => {
  await startServer();
  token = await loginAsAdmin();
});
after(stopServer);

test('login rejects bad credentials and returns a token for good ones', async () => {
  const bad = await api('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'nope' } });
  assert.equal(bad.status, 401);
  const missing = await api('/api/auth/login', { method: 'POST', body: {} });
  assert.equal(missing.status, 400);

  const me = await api('/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, 'admin');
  assert.equal(me.body.user.role, 'ADMIN');
});

test('admin routes require a valid token', async () => {
  assert.equal((await api('/api/admin/orders')).status, 401);
  assert.equal((await api('/api/admin/orders', { token: 'garbage' })).status, 401);
  assert.equal((await api('/api/auth/me')).status, 401);
});

test('admin can list orders, move them through statuses and see stats', async () => {
  const created = await api('/api/orders', { method: 'POST', body: sampleOrder() });
  assert.equal(created.status, 201);
  const { id, total } = created.body.order;

  const list = await api('/api/admin/orders', { token });
  assert.equal(list.status, 200);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.orders[0].id, id);
  assert.equal(list.body.orders[0].items[0].toppings[0].name, 'Extra Cheese');

  assert.equal((await api('/api/admin/orders?status=COMPLETED', { token })).body.total, 0);
  assert.equal((await api('/api/admin/orders?status=BOGUS', { token })).status, 400);

  const setStatus = (status, note) =>
    api(`/api/admin/orders/${id}/status`, { method: 'PATCH', token, body: { status, note } });

  // PENDING -> PREPARING is not allowed (must be confirmed first)
  assert.equal((await setStatus('PREPARING')).status, 400);
  assert.equal((await setStatus('CONFIRMED', 'Called the customer')).body.order.status, 'CONFIRMED');
  assert.equal((await setStatus('PREPARING')).body.order.status, 'PREPARING');
  // a DELIVERY order can never be "ready for pickup"
  assert.equal((await setStatus('READY_FOR_PICKUP')).status, 400);
  assert.equal((await setStatus('OUT_FOR_DELIVERY')).body.order.status, 'OUT_FOR_DELIVERY');
  const done = await setStatus('COMPLETED');
  assert.equal(done.body.order.status, 'COMPLETED');
  assert.equal(done.body.order.paymentStatus, 'PAID');
  assert.deepEqual(done.body.order.allowedNextStatuses, []);
  assert.equal((await setStatus('CANCELLED')).status, 400);

  const detail = await api(`/api/admin/orders/${id}`, { token });
  assert.equal(detail.body.order.statusHistory.length, 5);
  assert.equal(detail.body.order.statusHistory[1].note, 'Called the customer');

  const payment = await api(`/api/admin/orders/${id}/payment`, { method: 'PATCH', token, body: { paymentStatus: 'REFUNDED' } });
  assert.equal(payment.body.order.paymentStatus, 'REFUNDED');

  const stats = await api('/api/admin/stats', { token });
  assert.equal(stats.status, 200);
  assert.equal(stats.body.byStatus.COMPLETED, 1);
  assert.equal(stats.body.today.orders, 1);
  assert.equal(stats.body.today.revenue, total);

  assert.equal((await api('/api/admin/orders/999', { token })).status, 404);
  assert.equal((await api('/api/admin/orders/abc', { token })).status, 400);
});

test('admin can create, update, hide and delete pizzas', async () => {
  const payload = {
    name: 'Test Pizza',
    description: 'For the tests',
    categoryId: 1,
    prices: [{ sizeId: 1, price: 100 }, { sizeId: 2, price: 150.5 }],
  };
  const invalid = await api('/api/admin/pizzas', { method: 'POST', token, body: { ...payload, prices: [] } });
  assert.equal(invalid.status, 400);

  const created = await api('/api/admin/pizzas', { method: 'POST', token, body: payload });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const pizza = created.body.pizza;
  assert.equal(pizza.categoryName, 'Classic');
  assert.deepEqual(pizza.sizes.map((s) => s.price), [100, 150.5]);

  const inMenu = () =>
    api('/api/menu').then((r) => r.body.categories.flatMap((c) => c.pizzas).some((p) => p.id === pizza.id));
  assert.equal(await inMenu(), true);

  const hidden = await api(`/api/admin/pizzas/${pizza.id}`, {
    method: 'PUT',
    token,
    body: { isAvailable: false, prices: [{ sizeId: 3, price: 300 }] },
  });
  assert.equal(hidden.status, 200);
  assert.equal(hidden.body.pizza.isAvailable, false);
  assert.deepEqual(hidden.body.pizza.sizes.map((s) => s.sizeName), ['Large']);
  assert.equal(await inMenu(), false);

  const adminMenu = await api('/api/admin/menu', { token });
  assert.ok(adminMenu.body.pizzas.some((p) => p.id === pizza.id));

  // ordering a hidden pizza is refused
  const order = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ items: [{ pizzaId: pizza.id, sizeId: 3, quantity: 1 }] }),
  });
  assert.equal(order.status, 400);

  assert.equal((await api(`/api/admin/pizzas/${pizza.id}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await api(`/api/admin/pizzas/${pizza.id}`, { method: 'DELETE', token })).status, 404);
});

test('admin can manage toppings and duplicates are rejected', async () => {
  const created = await api('/api/admin/toppings', { method: 'POST', token, body: { name: 'Basil', price: 15 } });
  assert.equal(created.status, 201);
  const dup = await api('/api/admin/toppings', { method: 'POST', token, body: { name: 'Basil', price: 10 } });
  assert.equal(dup.status, 409);

  const updated = await api(`/api/admin/toppings/${created.body.topping.id}`, {
    method: 'PUT',
    token,
    body: { price: 20, isAvailable: false },
  });
  assert.equal(updated.body.topping.price, 20);
  assert.equal(updated.body.topping.isAvailable, false);
  assert.ok(!(await api('/api/menu')).body.toppings.some((t) => t.name === 'Basil'));

  assert.equal((await api(`/api/admin/toppings/${created.body.topping.id}`, { method: 'DELETE', token })).status, 200);
});

test('deleting a pizza keeps historical order lines intact', async () => {
  const created = await api('/api/admin/pizzas', {
    method: 'POST',
    token,
    body: { name: 'Temporary', categoryId: 2, prices: [{ sizeId: 1, price: 50 }] },
  });
  const order = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ items: [{ pizzaId: created.body.pizza.id, sizeId: 1, quantity: 1 }] }),
  });
  assert.equal(order.status, 201);
  await api(`/api/admin/pizzas/${created.body.pizza.id}`, { method: 'DELETE', token });

  const detail = await api(`/api/admin/orders/${order.body.order.id}`, { token });
  assert.equal(detail.body.order.items[0].pizzaName, 'Temporary');
  assert.equal(detail.body.order.items[0].pizzaId, null);
});
