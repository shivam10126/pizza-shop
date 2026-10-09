/**
 * Seeds categories, sizes, pizzas, prices and toppings.
 * Safe to re-run: it does nothing if the menu already has data.
 */
const seedData = require('../src/db/seedData');

exports.seed = async function seed(knex) {
  const [{ count }] = await knex('categories').count({ count: '*' });
  if (Number(count) > 0) {
    console.log('Menu already seeded - skipping (run "npm run db:reset" to start fresh).');
    return;
  }

  const now = new Date();

  await knex('categories').insert(
    seedData.categories.map((c) => ({ name: c.name, sort_order: c.sortOrder }))
  );
  await knex('sizes').insert(
    seedData.sizes.map((s) => ({ name: s.name, sort_order: s.sortOrder }))
  );

  const categoryRows = await knex('categories').select('id', 'name');
  const sizeRows = await knex('sizes').select('id', 'name');
  const categoryId = Object.fromEntries(categoryRows.map((r) => [r.name, r.id]));
  const sizeId = Object.fromEntries(sizeRows.map((r) => [r.name, r.id]));

  for (const pizza of seedData.pizzas) {
    const [id] = await knex('pizzas').insert({
      category_id: categoryId[pizza.category],
      name: pizza.name,
      description: pizza.description,
      image_url: pizza.imageUrl || null,
      is_available: 1,
      created_at: now,
      updated_at: now,
    });
    await knex('pizza_prices').insert(
      Object.entries(pizza.prices).map(([sizeName, price]) => ({
        pizza_id: id,
        size_id: sizeId[sizeName],
        price,
      }))
    );
  }

  await knex('toppings').insert(
    seedData.toppings.map((t) => ({
      name: t.name,
      price: t.price,
      is_available: 1,
      created_at: now,
      updated_at: now,
    }))
  );

  console.log(
    `Seeded ${seedData.categories.length} categories, ${seedData.sizes.length} sizes, ` +
      `${seedData.pizzas.length} pizzas and ${seedData.toppings.length} toppings.`
  );
};
