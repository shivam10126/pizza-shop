const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, api, sampleOrder, getBaseUrl } = require('./helpers');

before(startServer);
after(stopServer);

test('GET /api/health reports a connected database', async () => {
  const res = await api('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database.connected, true);
});

test('GET /api/settings returns shop settings', async () => {
  const res = await api('/api/settings');
  assert.equal(res.status, 200);
  assert.equal(res.body.taxRate, 0.05);
  assert.equal(res.body.deliveryFee, 40);
  assert.equal(res.body.currencySymbol, '₹');
});

test('GET /api/menu lists categories, pizzas with sizes and toppings', async () => {
  const res = await api('/api/menu');
  assert.equal(res.status, 200);
  assert.equal(res.body.categories.length, 4);
  const pizzas = res.body.categories.flatMap((c) => c.pizzas);
  assert.equal(pizzas.length, 10);
  for (const p of pizzas) assert.equal(p.sizes.length, 3);
  const margherita = pizzas.find((p) => p.name === 'Margherita');
  assert.deepEqual(
    margherita.sizes.map((s) => [s.sizeName, s.price]),
    [['Small', 199], ['Medium', 299], ['Large', 399]]
  );
  assert.equal(res.body.toppings.length, 9);
  assert.equal(res.body.sizes.length, 3);
});

test('POST /api/orders prices the order on the server and stores it', async () => {
  const res = await api('/api/orders', { method: 'POST', body: sampleOrder() });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const { order } = res.body;
  assert.match(order.orderNumber, /^PZ-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(order.status, 'PENDING');
  assert.equal(order.paymentStatus, 'PENDING');
  assert.equal(order.customer.phone, '+919876543210');
  assert.equal(order.customer.name, 'Test Customer');
  // (299 + 40 topping) * 2 = 678; tax 5% = 33.9; subtotal >= 500 so delivery is free
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].pizzaName, 'Margherita');
  assert.equal(order.items[0].sizeName, 'Medium');
  assert.equal(order.items[0].unitPrice, 339);
  assert.equal(order.items[0].lineTotal, 678);
  assert.deepEqual(order.items[0].toppings.map((t) => t.name), ['Extra Cheese']);
  assert.equal(order.subtotal, 678);
  assert.equal(order.tax, 33.9);
  assert.equal(order.deliveryFee, 0);
  assert.equal(order.total, 711.9);
  assert.equal(order.statusHistory.length, 1);
  assert.ok(order.createdAt);
});

test('delivery fee applies under the free-delivery threshold, never for pickup', async () => {
  const small = { items: [{ pizzaId: 1, sizeId: 1, quantity: 1 }] };
  const delivery = await api('/api/orders', { method: 'POST', body: sampleOrder(small) });
  assert.equal(delivery.status, 201);
  assert.equal(delivery.body.order.subtotal, 199);
  assert.equal(delivery.body.order.tax, 9.95);
  assert.equal(delivery.body.order.deliveryFee, 40);
  assert.equal(delivery.body.order.total, 248.95);

  const pickup = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ ...small, orderType: 'PICKUP' }),
  });
  assert.equal(pickup.status, 201);
  assert.equal(pickup.body.order.deliveryFee, 0);
  assert.equal(pickup.body.order.deliveryAddress, null);
  assert.equal(pickup.body.order.total, 208.95);
});

test('POST /api/orders validates the payload', async () => {
  const empty = await api('/api/orders', { method: 'POST', body: sampleOrder({ items: [] }) });
  assert.equal(empty.status, 400);
  assert.ok(empty.body.errors.some((e) => e.field === 'items'));

  const noAddress = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ customer: { name: 'A', phone: '9876543210' } }),
  });
  assert.equal(noAddress.status, 400);
  assert.ok(noAddress.body.errors.some((e) => e.field === 'customer.address'));

  const badPhone = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ customer: { name: 'A', phone: 'abc', address: 'x' } }),
  });
  assert.equal(badPhone.status, 400);

  const unknownPizza = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ items: [{ pizzaId: 999, sizeId: 1, quantity: 1 }] }),
  });
  assert.equal(unknownPizza.status, 400);
  assert.match(unknownPizza.body.message, /not available/);

  const badJson = await fetch(`${getBaseUrl()}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(badJson.status, 400);
});

test('POST /api/orders/track finds an order by number + phone', async () => {
  const created = await api('/api/orders', { method: 'POST', body: sampleOrder() });
  const { orderNumber } = created.body.order;

  const track = (body) => api('/api/orders/track', { method: 'POST', body });
  const ok = await track({ orderNumber: orderNumber.toLowerCase(), phone: '+91-98765-43210' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.order.orderNumber, orderNumber);
  assert.deepEqual(ok.body.order.allowedNextStatuses, ['CONFIRMED', 'CANCELLED']);

  const wrongPhone = await track({ orderNumber, phone: '1111111111' });
  assert.equal(wrongPhone.status, 404);

  const missing = await track({});
  assert.equal(missing.status, 400);
});

test('repeat orders from the same phone reuse the customer record', async () => {
  const first = await api('/api/orders', { method: 'POST', body: sampleOrder() });
  const second = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ customer: { name: 'Renamed Customer', phone: '98765 43210', address: 'New address' } }),
  });
  assert.equal(second.status, 201);
  assert.notEqual(first.body.order.customer.id, second.body.order.customer.id);
  assert.equal(second.body.order.customer.name, 'Renamed Customer');

  const third = await api('/api/orders', {
    method: 'POST',
    body: sampleOrder({ customer: { name: 'Again', phone: '+91 98765 43210', address: 'Addr' } }),
  });
  assert.equal(third.body.order.customer.id, first.body.order.customer.id);
  assert.equal(third.body.order.customer.name, 'Again');
});

test('unknown API routes return JSON 404', async () => {
  const res = await api('/api/nope');
  assert.equal(res.status, 404);
  assert.match(res.body.message, /not found/);
});
