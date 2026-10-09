const menuRepo = require('../repositories/menuRepository');
const { isUniqueViolation } = require('../repositories/mappers');
const { ApiError } = require('../utils/errors');
const v = require('../utils/validation');
const { round2 } = require('./pricing');

/** Menu for customers: only available pizzas that have at least one price. */
async function getPublicMenu() {
  const [categories, sizes, pizzas, toppings] = await Promise.all([
    menuRepo.getCategories(),
    menuRepo.getSizes(),
    menuRepo.getPizzas(),
    menuRepo.getToppings(),
  ]);
  const grouped = categories
    .map((c) => ({ ...c, pizzas: pizzas.filter((p) => p.categoryId === c.id && p.sizes.length) }))
    .filter((c) => c.pizzas.length);
  return { categories: grouped, sizes, toppings };
}

/** Everything, including unavailable items, for the admin screens. */
async function getAdminMenu() {
  const [categories, sizes, pizzas, toppings] = await Promise.all([
    menuRepo.getCategories(),
    menuRepo.getSizes(),
    menuRepo.getPizzas({ includeUnavailable: true }),
    menuRepo.getToppings({ includeUnavailable: true }),
  ]);
  return { categories, sizes, pizzas, toppings };
}

const fail = (errors) => {
  throw ApiError.badRequest('Please correct the highlighted fields', errors);
};

async function validatePizza(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const add = (field, message) => errors.push({ field, message });

  if (!partial || body.name !== undefined) {
    if (!v.isNonEmptyString(body.name, 100)) add('name', 'Name is required (max 100 characters)');
    else data.name = v.clean(body.name);
  }
  if (body.description !== undefined) {
    if (!v.isOptionalString(body.description, 500)) add('description', 'Description is too long');
    else data.description = body.description ? v.clean(body.description) : null;
  }
  if (body.imageUrl !== undefined) {
    if (!v.isOptionalString(body.imageUrl, 500)) add('imageUrl', 'Image URL is too long');
    else data.imageUrl = body.imageUrl ? v.clean(body.imageUrl) : null;
  }
  if (!partial || body.categoryId !== undefined) {
    if (!v.isPositiveInt(body.categoryId)) add('categoryId', 'Choose a category');
    else data.categoryId = body.categoryId;
  }
  if (body.isAvailable !== undefined) {
    if (typeof body.isAvailable !== 'boolean') add('isAvailable', 'Must be true or false');
    else data.isAvailable = body.isAvailable;
  }
  if (!partial || body.prices !== undefined) {
    const prices = Array.isArray(body.prices) ? body.prices : [];
    if (!prices.length) add('prices', 'At least one size price is required');
    const sizeIds = new Set((await menuRepo.getSizes()).map((s) => s.id));
    const seen = new Set();
    for (const p of prices) {
      if (!p || !sizeIds.has(p.sizeId) || seen.has(p.sizeId)) {
        add('prices', 'Invalid or duplicate size');
        break;
      }
      if (!v.isMoney(p.price) || p.price <= 0) {
        add('prices', 'Prices must be positive numbers');
        break;
      }
      seen.add(p.sizeId);
    }
    data.prices = prices.map((p) => ({ sizeId: p.sizeId, price: round2(p.price) }));
  }
  if (data.categoryId !== undefined) {
    const categories = await menuRepo.getCategories();
    if (!categories.some((c) => c.id === data.categoryId)) add('categoryId', 'Unknown category');
  }
  if (errors.length) fail(errors);
  return data;
}

function validateTopping(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};
  if (!partial || body.name !== undefined) {
    if (!v.isNonEmptyString(body.name, 60)) errors.push({ field: 'name', message: 'Name is required (max 60 characters)' });
    else data.name = v.clean(body.name);
  }
  if (!partial || body.price !== undefined) {
    if (!v.isMoney(body.price)) errors.push({ field: 'price', message: 'Price must be a number of 0 or more' });
    else data.price = round2(body.price);
  }
  if (body.isAvailable !== undefined) {
    if (typeof body.isAvailable !== 'boolean') errors.push({ field: 'isAvailable', message: 'Must be true or false' });
    else data.isAvailable = body.isAvailable;
  }
  if (errors.length) fail(errors);
  return data;
}

const duplicateGuard = async (fn, what) => {
  try {
    return await fn();
  } catch (err) {
    if (isUniqueViolation(err)) throw ApiError.conflict(`A ${what} with that name already exists`);
    throw err;
  }
};

async function createPizza(body) {
  return menuRepo.createPizza(await validatePizza(body));
}

async function updatePizza(id, body) {
  const pizza = await menuRepo.updatePizza(id, await validatePizza(body, { partial: true }));
  if (!pizza) throw ApiError.notFound('Pizza not found');
  return pizza;
}

async function deletePizza(id) {
  if (!(await menuRepo.deletePizza(id))) throw ApiError.notFound('Pizza not found');
}

async function createTopping(body) {
  return duplicateGuard(() => menuRepo.createTopping(validateTopping(body)), 'topping');
}

async function updateTopping(id, body) {
  const topping = await duplicateGuard(
    () => menuRepo.updateTopping(id, validateTopping(body, { partial: true })),
    'topping'
  );
  if (!topping) throw ApiError.notFound('Topping not found');
  return topping;
}

async function deleteTopping(id) {
  if (!(await menuRepo.deleteTopping(id))) throw ApiError.notFound('Topping not found');
}

module.exports = {
  getPublicMenu,
  getAdminMenu,
  createPizza,
  updatePizza,
  deletePizza,
  createTopping,
  updateTopping,
  deleteTopping,
};
