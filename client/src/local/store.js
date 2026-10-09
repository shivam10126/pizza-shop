// Browser-side "database" for local mode: everything lives in localStorage.
import { addDemoData } from './demoData.js';

export const DB_KEY = 'pizza-shop-local-db';
export const DB_VERSION = 1;
export const LOCAL_ADMIN = { username: 'manager', password: '1234' };

/** In-memory stand-in when localStorage is unavailable (private mode etc.). */
export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function freshDatabase(seed, settings, now) {
  const stamp = now.toISOString();
  const categories = seed.categories.map((c, i) => ({ id: i + 1, name: c.name, sortOrder: c.sortOrder }));
  const sizes = seed.sizes.map((s, i) => ({ id: i + 1, name: s.name, sortOrder: s.sortOrder }));
  const categoryId = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const pizzas = seed.pizzas.map((p, i) => ({
    id: i + 1,
    categoryId: categoryId[p.category],
    name: p.name,
    description: p.description || null,
    imageUrl: p.imageUrl || null,
    isAvailable: true,
    sizes: sizes
      .filter((s) => p.prices[s.name] !== undefined)
      .map((s) => ({ sizeId: s.id, sizeName: s.name, price: p.prices[s.name] })),
    createdAt: stamp,
    updatedAt: stamp,
  }));
  const toppings = seed.toppings.map((t, i) => ({ id: i + 1, name: t.name, price: t.price, isAvailable: true }));

  const db = {
    version: DB_VERSION,
    categories,
    sizes,
    pizzas,
    toppings,
    customers: [],
    orders: [],
    users: [
      { id: 1, username: LOCAL_ADMIN.username, password: LOCAL_ADMIN.password, displayName: 'Manager', role: 'ADMIN', isActive: true },
    ],
    sessions: [],
    seq: { pizza: pizzas.length, topping: toppings.length, customer: 0, order: 0, orderItem: 0, orderItemTopping: 0 },
  };
  return addDemoData(db, settings, now);
}

/**
 * createStore({ seed, storage, settings, now })
 *   seed     - shared/menu-seed.json
 *   storage  - window.localStorage (or memoryStorage())
 *   settings - tax / delivery settings used to price the demo orders
 */
export function createStore({ seed, storage, settings, now = () => new Date() }) {
  let db = null;

  const save = () => {
    try {
      storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* quota exceeded or private mode: keep working in memory */
    }
  };

  const get = () => {
    if (db) return db;
    try {
      const raw = storage.getItem(DB_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.version === DB_VERSION) {
        db = parsed;
        return db;
      }
    } catch {
      /* corrupt value: start fresh */
    }
    db = freshDatabase(seed, settings, now());
    save();
    return db;
  };

  const nextId = (name) => {
    const d = get();
    d.seq[name] = (d.seq[name] || 0) + 1;
    return d.seq[name];
  };

  const reset = () => {
    db = freshDatabase(seed, settings, now());
    save();
    return db;
  };

  return { get, save, nextId, reset };
}
