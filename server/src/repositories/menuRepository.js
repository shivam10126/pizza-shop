const db = require('../db/knex');
const { toNumber, toBool, toIso } = require('./mappers');

const mapCategory = (r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order });
const mapSize = (r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order });
const mapTopping = (r) => ({
  id: r.id,
  name: r.name,
  price: toNumber(r.price),
  isAvailable: toBool(r.is_available),
});
const mapPizza = (r, sizes = []) => ({
  id: r.id,
  categoryId: r.category_id,
  categoryName: r.category_name,
  name: r.name,
  description: r.description,
  imageUrl: r.image_url,
  isAvailable: toBool(r.is_available),
  sizes,
  createdAt: toIso(r.created_at),
  updatedAt: toIso(r.updated_at),
});

async function getCategories() {
  const rows = await db('categories').orderBy('sort_order').orderBy('name');
  return rows.map(mapCategory);
}

async function getSizes() {
  const rows = await db('sizes').orderBy('sort_order').orderBy('name');
  return rows.map(mapSize);
}

// ---------- toppings ----------

async function getToppings({ includeUnavailable = false, ids } = {}) {
  const q = db('toppings').orderBy('name');
  if (!includeUnavailable) q.where('is_available', 1);
  if (ids) q.whereIn('id', ids);
  return (await q).map(mapTopping);
}

async function getToppingById(id) {
  const row = await db('toppings').where({ id }).first();
  return row ? mapTopping(row) : null;
}

async function createTopping({ name, price, isAvailable = true }) {
  const now = new Date();
  const [id] = await db('toppings').insert({
    name,
    price,
    is_available: isAvailable ? 1 : 0,
    created_at: now,
    updated_at: now,
  });
  return getToppingById(id);
}

async function updateTopping(id, data) {
  const patch = { updated_at: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.price !== undefined) patch.price = data.price;
  if (data.isAvailable !== undefined) patch.is_available = data.isAvailable ? 1 : 0;
  const count = await db('toppings').where({ id }).update(patch);
  return count ? getToppingById(id) : null;
}

async function deleteTopping(id) {
  return (await db('toppings').where({ id }).del()) > 0;
}

// ---------- pizzas ----------

async function loadPrices(pizzaIds) {
  const byPizza = {};
  if (!pizzaIds.length) return byPizza;
  const rows = await db('pizza_prices as pp')
    .join('sizes as s', 's.id', 'pp.size_id')
    .whereIn('pp.pizza_id', pizzaIds)
    .select('pp.pizza_id', 'pp.size_id', 's.name as size_name', 'pp.price', 's.sort_order')
    .orderBy('s.sort_order');
  for (const r of rows) {
    (byPizza[r.pizza_id] ||= []).push({
      sizeId: r.size_id,
      sizeName: r.size_name,
      price: toNumber(r.price),
    });
  }
  return byPizza;
}

function pizzaQuery() {
  return db('pizzas as p')
    .join('categories as c', 'c.id', 'p.category_id')
    .select('p.*', 'c.name as category_name');
}

async function getPizzas({ includeUnavailable = false, ids } = {}) {
  const q = pizzaQuery().orderBy('c.sort_order').orderBy('p.name');
  if (!includeUnavailable) q.where('p.is_available', 1);
  if (ids) q.whereIn('p.id', ids);
  const rows = await q;
  const prices = await loadPrices(rows.map((r) => r.id));
  return rows.map((r) => mapPizza(r, prices[r.id] || []));
}

async function getPizzaById(id) {
  const row = await pizzaQuery().where('p.id', id).first();
  if (!row) return null;
  const prices = await loadPrices([row.id]);
  return mapPizza(row, prices[row.id] || []);
}

/** prices: [{ sizeId, price }] */
async function createPizza({ name, description = null, categoryId, imageUrl = null, isAvailable = true, prices }) {
  const now = new Date();
  const id = await db.transaction(async (trx) => {
    const [pizzaId] = await trx('pizzas').insert({
      name,
      description,
      category_id: categoryId,
      image_url: imageUrl,
      is_available: isAvailable ? 1 : 0,
      created_at: now,
      updated_at: now,
    });
    await trx('pizza_prices').insert(
      prices.map((p) => ({ pizza_id: pizzaId, size_id: p.sizeId, price: p.price }))
    );
    return pizzaId;
  });
  return getPizzaById(id);
}

async function updatePizza(id, data) {
  const patch = { updated_at: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.categoryId !== undefined) patch.category_id = data.categoryId;
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
  if (data.isAvailable !== undefined) patch.is_available = data.isAvailable ? 1 : 0;

  const found = await db.transaction(async (trx) => {
    const count = await trx('pizzas').where({ id }).update(patch);
    if (!count) return false;
    if (data.prices) {
      await trx('pizza_prices').where({ pizza_id: id }).del();
      await trx('pizza_prices').insert(
        data.prices.map((p) => ({ pizza_id: id, size_id: p.sizeId, price: p.price }))
      );
    }
    return true;
  });
  return found ? getPizzaById(id) : null;
}

async function deletePizza(id) {
  return (await db('pizzas').where({ id }).del()) > 0;
}

module.exports = {
  getCategories,
  getSizes,
  getToppings,
  getToppingById,
  createTopping,
  updateTopping,
  deleteTopping,
  getPizzas,
  getPizzaById,
  createPizza,
  updatePizza,
  deletePizza,
};
