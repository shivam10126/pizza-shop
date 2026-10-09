import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, expectStatus, sampleOrder, login } from './helpers.js';

test('login, authorization and the status workflow', async () => {
  const { api } = setup();
  await expectStatus(api.request('/auth/login', { method: 'POST', body: { username: 'manager', password: 'wrong' } }), 401);
  await expectStatus(api.request('/admin/orders'), 401);
  await expectStatus(api.request('/admin/orders', { token: 'bogus' }), 401);
  const { token, user } = await login(api);
  assert.equal(user.role, 'ADMIN');
  assert.equal((await api.request('/auth/me', { token })).user.username, 'manager');

  const { order } = await api.request('/orders', { method: 'POST', body: sampleOrder() });
  const set = (status, note) =>
    api.request(`/admin/orders/${order.id}/status`, { method: 'PATCH', token, body: { status, note } });
  await expectStatus(set('PREPARING'), 400);
  assert.equal((await set('CONFIRMED', 'ok')).order.status, 'CONFIRMED');
  assert.equal((await set('PREPARING')).order.status, 'PREPARING');
  await expectStatus(set('READY_FOR_PICKUP'), 400);
  assert.equal((await set('OUT_FOR_DELIVERY')).order.status, 'OUT_FOR_DELIVERY');
  const done = await set('COMPLETED');
  assert.equal(done.order.paymentStatus, 'PAID');
  assert.deepEqual(done.order.allowedNextStatuses, []);

  const detail = await api.request(`/admin/orders/${order.id}`, { token });
  assert.equal(detail.order.statusHistory.length, 5);
  assert.equal(detail.order.statusHistory[1].note, 'ok');
  const paid = await api.request(`/admin/orders/${order.id}/payment`, { method: 'PATCH', token, body: { paymentStatus: 'REFUNDED' } });
  assert.equal(paid.order.paymentStatus, 'REFUNDED');
  await expectStatus(api.request('/admin/orders?status=BOGUS', { token }), 400);
});

test('menu management', async () => {
  const { api } = setup();
  const { token } = await login(api);
  const created = await api.request('/admin/pizzas', {
    method: 'POST',
    token,
    body: { name: 'Test Pizza', categoryId: 1, prices: [{ sizeId: 2, price: 150.5 }, { sizeId: 1, price: 100 }] },
  });
  assert.deepEqual(created.pizza.sizes.map((s) => [s.sizeName, s.price]), [['Small', 100], ['Medium', 150.5]]);
  assert.equal(created.pizza.categoryName, 'Classic');
  await expectStatus(api.request('/admin/pizzas', { method: 'POST', token, body: { name: 'X', categoryId: 1, prices: [] } }), 400);

  const hidden = await api.request(`/admin/pizzas/${created.pizza.id}`, { method: 'PUT', token, body: { isAvailable: false } });
  assert.equal(hidden.pizza.isAvailable, false);
  const menu = await api.request('/menu');
  assert.ok(!menu.categories.flatMap((c) => c.pizzas).some((p) => p.id === created.pizza.id));
  const adminMenu = await api.request('/admin/menu', { token });
  assert.ok(adminMenu.pizzas.some((p) => p.id === created.pizza.id));
  await expectStatus(
    api.request('/orders', { method: 'POST', body: sampleOrder({ items: [{ pizzaId: created.pizza.id, sizeId: 1, quantity: 1 }] }) }),
    400
  );
  await api.request(`/admin/pizzas/${created.pizza.id}`, { method: 'DELETE', token });
  await expectStatus(api.request(`/admin/pizzas/${created.pizza.id}`, { method: 'DELETE', token }), 404);

  const topping = await api.request('/admin/toppings', { method: 'POST', token, body: { name: 'Basil', price: 15 } });
  await expectStatus(api.request('/admin/toppings', { method: 'POST', token, body: { name: 'basil', price: 1 } }), 409);
  const updated = await api.request(`/admin/toppings/${topping.topping.id}`, { method: 'PUT', token, body: { price: 20, isAvailable: false } });
  assert.equal(updated.topping.price, 20);
  assert.ok(!(await api.request('/menu')).toppings.some((t) => t.name === 'Basil'));
  await api.request(`/admin/toppings/${topping.topping.id}`, { method: 'DELETE', token });
});

test('deleting a pizza keeps historical order lines', async () => {
  const { api } = setup();
  const { token } = await login(api);
  const detail = await api.request('/admin/orders/7', { token });
  const pizzaId = detail.order.items[0].pizzaId;
  await api.request(`/admin/pizzas/${pizzaId}`, { method: 'DELETE', token });
  const after = await api.request('/admin/orders/7', { token });
  assert.equal(after.order.items[0].pizzaId, null);
  assert.equal(after.order.items[0].pizzaName, detail.order.items[0].pizzaName);
});
