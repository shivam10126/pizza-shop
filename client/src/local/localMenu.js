// Local-mode handlers for staff menu management (pizzas and toppings).
import { fail, pizzaView, bySortOrder, byName } from './common.js';
import { round2 } from '../utils/pricing.js';
import { isNonEmptyString, isOptionalString, isPositiveInt, isMoney, clean } from './validation.js';

const VALIDATION = 'Please correct the highlighted fields';

export function menuRoutes(ctx) {
  const { store } = ctx;
  const db = () => store.get();
  const now = () => new Date().toISOString();

  const adminMenu = () => {
    const d = db();
    const categoryOrder = Object.fromEntries(d.categories.map((c) => [c.id, c.sortOrder]));
    return {
      categories: [...d.categories].sort(bySortOrder),
      sizes: [...d.sizes].sort(bySortOrder),
      pizzas: [...d.pizzas]
        .sort((a, b) => categoryOrder[a.categoryId] - categoryOrder[b.categoryId] || a.name.localeCompare(b.name))
        .map((p) => pizzaView(d, p)),
      toppings: [...d.toppings].sort(byName),
    };
  };

  function validatePizza(body, partial) {
    const d = db();
    const errors = [];
    const data = {};
    const add = (field, message) => errors.push({ field, message });
    if (!partial || body.name !== undefined) {
      if (!isNonEmptyString(body.name, 100)) add('name', 'Name is required (max 100 characters)');
      else data.name = clean(body.name);
    }
    if (body.description !== undefined) {
      if (!isOptionalString(body.description, 500)) add('description', 'Description is too long');
      else data.description = body.description ? clean(body.description) : null;
    }
    if (body.imageUrl !== undefined) {
      if (!isOptionalString(body.imageUrl, 500)) add('imageUrl', 'Image URL is too long');
      else data.imageUrl = body.imageUrl ? clean(body.imageUrl) : null;
    }
    if (!partial || body.categoryId !== undefined) {
      if (!isPositiveInt(body.categoryId)) add('categoryId', 'Choose a category');
      else if (!d.categories.some((c) => c.id === body.categoryId)) add('categoryId', 'Unknown category');
      else data.categoryId = body.categoryId;
    }
    if (body.isAvailable !== undefined) {
      if (typeof body.isAvailable !== 'boolean') add('isAvailable', 'Must be true or false');
      else data.isAvailable = body.isAvailable;
    }
    if (!partial || body.prices !== undefined) {
      const prices = Array.isArray(body.prices) ? body.prices : [];
      if (!prices.length) add('prices', 'At least one size price is required');
      const seen = new Set();
      for (const p of prices) {
        const size = p && d.sizes.find((s) => s.id === p.sizeId);
        if (!size || seen.has(p.sizeId)) {
          add('prices', 'Invalid or duplicate size');
          break;
        }
        if (!isMoney(p.price) || p.price <= 0) {
          add('prices', 'Prices must be positive numbers');
          break;
        }
        seen.add(p.sizeId);
      }
      data.sizes = prices
        .map((p) => ({ size: d.sizes.find((s) => s.id === p.sizeId), price: round2(p.price) }))
        .filter((x) => x.size)
        .sort((a, b) => a.size.sortOrder - b.size.sortOrder)
        .map((x) => ({ sizeId: x.size.id, sizeName: x.size.name, price: x.price }));
    }
    if (errors.length) fail(400, VALIDATION, errors);
    return data;
  }

  const createPizza = ({ body }) => {
    const data = validatePizza(body, false);
    const d = db();
    const stamp = now();
    const pizza = {
      id: store.nextId('pizza'),
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      isAvailable: data.isAvailable ?? true,
      sizes: data.sizes,
      createdAt: stamp,
      updatedAt: stamp,
    };
    d.pizzas.push(pizza);
    return { pizza: pizzaView(d, pizza) };
  };

  const updatePizza = ({ params: [id], body }) => {
    const d = db();
    const pizza = d.pizzas.find((p) => p.id === id);
    if (!pizza) fail(404, 'Pizza not found');
    const data = validatePizza(body, true);
    Object.assign(pizza, data, { updatedAt: now() });
    return { pizza: pizzaView(d, pizza) };
  };

  const deletePizza = ({ params: [id] }) => {
    const d = db();
    const index = d.pizzas.findIndex((p) => p.id === id);
    if (index < 0) fail(404, 'Pizza not found');
    d.pizzas.splice(index, 1);
    for (const o of d.orders) for (const item of o.items) if (item.pizzaId === id) item.pizzaId = null;
    return { message: 'Pizza deleted' };
  };

  function validateTopping(body, partial, selfId) {
    const errors = [];
    const data = {};
    if (!partial || body.name !== undefined) {
      if (!isNonEmptyString(body.name, 60)) errors.push({ field: 'name', message: 'Name is required (max 60 characters)' });
      else data.name = clean(body.name);
    }
    if (!partial || body.price !== undefined) {
      if (!isMoney(body.price)) errors.push({ field: 'price', message: 'Price must be a number of 0 or more' });
      else data.price = round2(body.price);
    }
    if (body.isAvailable !== undefined) {
      if (typeof body.isAvailable !== 'boolean') errors.push({ field: 'isAvailable', message: 'Must be true or false' });
      else data.isAvailable = body.isAvailable;
    }
    if (errors.length) fail(400, VALIDATION, errors);
    if (data.name && db().toppings.some((t) => t.id !== selfId && t.name.toLowerCase() === data.name.toLowerCase())) {
      fail(409, 'A topping with that name already exists');
    }
    return data;
  }

  const createTopping = ({ body }) => {
    const data = validateTopping(body, false, null);
    const topping = { id: store.nextId('topping'), name: data.name, price: data.price, isAvailable: data.isAvailable ?? true };
    db().toppings.push(topping);
    return { topping };
  };

  const updateTopping = ({ params: [id], body }) => {
    const topping = db().toppings.find((t) => t.id === id);
    if (!topping) fail(404, 'Topping not found');
    Object.assign(topping, validateTopping(body, true, id));
    return { topping };
  };

  const deleteTopping = ({ params: [id] }) => {
    const d = db();
    const index = d.toppings.findIndex((t) => t.id === id);
    if (index < 0) fail(404, 'Topping not found');
    d.toppings.splice(index, 1);
    for (const o of d.orders) for (const item of o.items) for (const t of item.toppings) if (t.toppingId === id) t.toppingId = null;
    return { message: 'Topping deleted' };
  };

  return [
    { method: 'GET', pattern: /^\/admin\/menu$/, auth: 'any', handler: adminMenu },
    { method: 'POST', pattern: /^\/admin\/pizzas$/, auth: 'admin', handler: createPizza },
    { method: 'PUT', pattern: /^\/admin\/pizzas\/(\d+)$/, auth: 'admin', handler: updatePizza },
    { method: 'DELETE', pattern: /^\/admin\/pizzas\/(\d+)$/, auth: 'admin', handler: deletePizza },
    { method: 'POST', pattern: /^\/admin\/toppings$/, auth: 'admin', handler: createTopping },
    { method: 'PUT', pattern: /^\/admin\/toppings\/(\d+)$/, auth: 'admin', handler: updateTopping },
    { method: 'DELETE', pattern: /^\/admin\/toppings\/(\d+)$/, auth: 'admin', handler: deleteTopping },
  ];
}
