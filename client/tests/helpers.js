// Shared setup for local (no database) mode tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createStore, memoryStorage } from '../src/local/store.js';
import { createLocalApi } from '../src/local/localApi.js';
import { LocalError } from '../src/local/common.js';

export const seed = createRequire(import.meta.url)('../../shared/menu-seed.json');
export const settings = { taxRate: 0.05, deliveryFee: 40, freeDeliveryOver: 500 };

export function setup(storage = memoryStorage()) {
  const api = createLocalApi(createStore({ seed, storage, settings }), { settings });
  return { storage, api };
}

export async function expectStatus(promise, status) {
  try {
    await promise;
  } catch (err) {
    assert.ok(err instanceof LocalError, err.message);
    assert.equal(err.status, status, err.message);
    return err;
  }
  return assert.fail(`expected a ${status} error`);
}

export const sampleOrder = (overrides = {}) => ({
  customer: { name: 'Test Customer', phone: '+91 98765 43210', email: 'test@example.com', address: '12 Baker Street' },
  orderType: 'DELIVERY',
  paymentMethod: 'CASH',
  items: [{ pizzaId: 1, sizeId: 2, quantity: 2, toppingIds: [1] }],
  ...overrides,
});

export const login = (api) =>
  api.request('/auth/login', { method: 'POST', body: { username: 'manager', password: '1234' } });
