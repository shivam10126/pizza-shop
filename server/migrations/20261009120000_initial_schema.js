/**
 * Initial database schema for the pizza shop.
 * Runs on MySQL (production) and on SQLite (local demo / tests).
 */
const {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
} = require('../src/constants');

exports.up = async function up(knex) {
  const isMysql = knex.client.config.client === 'mysql2';
  const mysqlTable = (table) => {
    if (isMysql) {
      table.engine('InnoDB');
      table.charset('utf8mb4');
      table.collate('utf8mb4_unicode_ci');
    }
  };
  const timestamps = (table) => {
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  };

  await knex.schema.createTable('categories', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.string('name', 60).notNullable().unique();
    t.integer('sort_order').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('sizes', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.string('name', 30).notNullable().unique();
    t.integer('sort_order').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('pizzas', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.integer('category_id').unsigned().notNullable()
      .references('id').inTable('categories').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.string('description', 500).nullable();
    t.string('image_url', 500).nullable();
    t.boolean('is_available').notNullable().defaultTo(true);
    timestamps(t);
    t.index(['category_id'], 'idx_pizzas_category');
  });

  // One row per pizza + size with its price.
  await knex.schema.createTable('pizza_prices', (t) => {
    mysqlTable(t);
    t.integer('pizza_id').unsigned().notNullable()
      .references('id').inTable('pizzas').onDelete('CASCADE');
    t.integer('size_id').unsigned().notNullable()
      .references('id').inTable('sizes').onDelete('RESTRICT');
    t.decimal('price', 10, 2).notNullable();
    t.primary(['pizza_id', 'size_id']);
  });

  await knex.schema.createTable('toppings', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.string('name', 60).notNullable().unique();
    t.decimal('price', 10, 2).notNullable().defaultTo(0);
    t.boolean('is_available').notNullable().defaultTo(true);
    timestamps(t);
  });

  await knex.schema.createTable('customers', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.string('name', 100).notNullable();
    t.string('phone', 20).notNullable().unique();
    t.string('email', 150).nullable();
    t.string('address', 500).nullable();
    timestamps(t);
  });

  await knex.schema.createTable('orders', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.string('order_number', 20).notNullable().unique();
    t.integer('customer_id').unsigned().notNullable()
      .references('id').inTable('customers').onDelete('RESTRICT');
    t.enu('status', ORDER_STATUSES).notNullable().defaultTo('PENDING');
    t.enu('order_type', ORDER_TYPES).notNullable();
    t.string('delivery_address', 500).nullable();
    t.enu('payment_method', PAYMENT_METHODS).notNullable();
    t.enu('payment_status', PAYMENT_STATUSES).notNullable().defaultTo('PENDING');
    t.decimal('subtotal', 10, 2).notNullable();
    t.decimal('tax', 10, 2).notNullable().defaultTo(0);
    t.decimal('delivery_fee', 10, 2).notNullable().defaultTo(0);
    t.decimal('total', 10, 2).notNullable();
    t.string('notes', 500).nullable();
    timestamps(t);
    t.index(['status'], 'idx_orders_status');
    t.index(['created_at'], 'idx_orders_created_at');
    t.index(['customer_id'], 'idx_orders_customer');
  });

  // Snapshot of what was ordered (names/prices copied so later menu edits
  // never change historical orders).
  await knex.schema.createTable('order_items', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.integer('pizza_id').unsigned().nullable()
      .references('id').inTable('pizzas').onDelete('SET NULL');
    t.integer('size_id').unsigned().nullable()
      .references('id').inTable('sizes').onDelete('SET NULL');
    t.string('pizza_name', 100).notNullable();
    t.string('size_name', 30).notNullable();
    t.decimal('unit_price', 10, 2).notNullable();
    t.integer('quantity').unsigned().notNullable();
    t.decimal('line_total', 10, 2).notNullable();
    t.index(['order_id'], 'idx_order_items_order');
  });

  await knex.schema.createTable('order_item_toppings', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.integer('order_item_id').unsigned().notNullable()
      .references('id').inTable('order_items').onDelete('CASCADE');
    t.integer('topping_id').unsigned().nullable()
      .references('id').inTable('toppings').onDelete('SET NULL');
    t.string('topping_name', 60).notNullable();
    t.decimal('price', 10, 2).notNullable();
    t.index(['order_item_id'], 'idx_order_item_toppings_item');
  });

  await knex.schema.createTable('order_status_history', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.enu('status', ORDER_STATUSES).notNullable();
    t.string('note', 255).nullable();
    t.datetime('changed_at').notNullable().defaultTo(knex.fn.now());
    t.index(['order_id'], 'idx_order_status_history_order');
  });

  await knex.schema.createTable('users', (t) => {
    mysqlTable(t);
    t.increments('id');
    t.string('username', 50).notNullable().unique();
    t.string('password_hash', 100).notNullable();
    t.string('display_name', 100).nullable();
    t.enu('role', USER_ROLES).notNullable().defaultTo('STAFF');
    t.boolean('is_active').notNullable().defaultTo(true);
    timestamps(t);
  });
};

exports.down = async function down(knex) {
  const tables = [
    'users',
    'order_status_history',
    'order_item_toppings',
    'order_items',
    'orders',
    'customers',
    'toppings',
    'pizza_prices',
    'pizzas',
    'sizes',
    'categories',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
