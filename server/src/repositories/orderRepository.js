const db = require('../db/knex');
const { toNumber, toIso } = require('./mappers');

const ORDER_COLUMNS = [
  'o.*',
  'c.name as customer_name',
  'c.phone as customer_phone',
  'c.email as customer_email',
  'c.address as customer_address',
];

function mapOrderRow(r) {
  return {
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    orderType: r.order_type,
    deliveryAddress: r.delivery_address,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    subtotal: toNumber(r.subtotal),
    tax: toNumber(r.tax),
    deliveryFee: toNumber(r.delivery_fee),
    total: toNumber(r.total),
    notes: r.notes,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    customer: {
      id: r.customer_id,
      name: r.customer_name,
      phone: r.customer_phone,
      email: r.customer_email,
      address: r.customer_address,
    },
    items: [],
  };
}

async function attachItems(orders) {
  if (!orders.length) return orders;
  const byId = new Map(orders.map((o) => [o.id, o]));
  const itemRows = await db('order_items').whereIn('order_id', [...byId.keys()]).orderBy('id');
  const items = new Map();
  for (const r of itemRows) {
    const item = {
      id: r.id,
      pizzaId: r.pizza_id,
      pizzaName: r.pizza_name,
      sizeId: r.size_id,
      sizeName: r.size_name,
      unitPrice: toNumber(r.unit_price),
      quantity: r.quantity,
      lineTotal: toNumber(r.line_total),
      toppings: [],
    };
    items.set(r.id, item);
    byId.get(r.order_id).items.push(item);
  }
  if (items.size) {
    const toppingRows = await db('order_item_toppings')
      .whereIn('order_item_id', [...items.keys()])
      .orderBy('id');
    for (const t of toppingRows) {
      items.get(t.order_item_id).toppings.push({
        id: t.id,
        toppingId: t.topping_id,
        name: t.topping_name,
        price: toNumber(t.price),
      });
    }
  }
  return orders;
}

const baseQuery = () => db('orders as o').join('customers as c', 'c.id', 'o.customer_id');

async function getById(id) {
  const row = await baseQuery().where('o.id', id).select(ORDER_COLUMNS).first();
  if (!row) return null;
  const [order] = await attachItems([mapOrderRow(row)]);
  const history = await db('order_status_history').where({ order_id: id }).orderBy('id');
  order.statusHistory = history.map((h) => ({
    status: h.status,
    note: h.note,
    changedAt: toIso(h.changed_at),
  }));
  return order;
}

async function findByNumberAndPhone(orderNumber, phone) {
  const row = await baseQuery()
    .where('o.order_number', orderNumber)
    .andWhere('c.phone', phone)
    .select('o.id')
    .first();
  return row ? getById(row.id) : null;
}

async function list({ status, page = 1, pageSize = 20 } = {}) {
  const q = baseQuery();
  if (status) q.where('o.status', status);
  const [{ total }] = await q.clone().count({ total: 'o.id' });
  const rows = await q
    .clone()
    .select(ORDER_COLUMNS)
    .orderBy('o.id', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const orders = await attachItems(rows.map(mapOrderRow));
  return { orders, total: Number(total), page, pageSize };
}

async function upsertCustomer(trx, { name, phone, email, address }, now) {
  const existing = await trx('customers').where({ phone }).first();
  if (existing) {
    await trx('customers').where({ id: existing.id }).update({
      name,
      email: email ?? existing.email,
      address: address ?? existing.address,
      updated_at: now,
    });
    return existing.id;
  }
  const [id] = await trx('customers').insert({
    name,
    phone,
    email: email ?? null,
    address: address ?? null,
    created_at: now,
    updated_at: now,
  });
  return id;
}

/**
 * Inserts customer (find-or-create by phone), order, items, item toppings and
 * the first status-history row in one transaction. Returns the new order id.
 */
async function create({ customer, order, items }) {
  const now = new Date();
  return db.transaction(async (trx) => {
    const customerId = await upsertCustomer(trx, customer, now);
    const [orderId] = await trx('orders').insert({
      order_number: order.orderNumber,
      customer_id: customerId,
      status: 'PENDING',
      order_type: order.orderType,
      delivery_address: order.deliveryAddress ?? null,
      payment_method: order.paymentMethod,
      payment_status: 'PENDING',
      subtotal: order.subtotal,
      tax: order.tax,
      delivery_fee: order.deliveryFee,
      total: order.total,
      notes: order.notes ?? null,
      created_at: now,
      updated_at: now,
    });

    for (const item of items) {
      const [itemId] = await trx('order_items').insert({
        order_id: orderId,
        pizza_id: item.pizzaId,
        size_id: item.sizeId,
        pizza_name: item.pizzaName,
        size_name: item.sizeName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        line_total: item.lineTotal,
      });
      if (item.toppings.length) {
        await trx('order_item_toppings').insert(
          item.toppings.map((t) => ({
            order_item_id: itemId,
            topping_id: t.id,
            topping_name: t.name,
            price: t.price,
          }))
        );
      }
    }

    await trx('order_status_history').insert({
      order_id: orderId,
      status: 'PENDING',
      note: 'Order placed',
      changed_at: now,
    });
    return orderId;
  });
}

async function updateStatus(id, { status, note = null, paymentStatus }) {
  const now = new Date();
  await db.transaction(async (trx) => {
    const patch = { status, updated_at: now };
    if (paymentStatus) patch.payment_status = paymentStatus;
    await trx('orders').where({ id }).update(patch);
    await trx('order_status_history').insert({ order_id: id, status, note, changed_at: now });
  });
  return getById(id);
}

async function updatePaymentStatus(id, paymentStatus) {
  const count = await db('orders').where({ id }).update({ payment_status: paymentStatus, updated_at: new Date() });
  return count ? getById(id) : null;
}

async function getStats() {
  const statusRows = await db('orders').select('status').count({ count: '*' }).groupBy('status');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [today] = await db('orders')
    .where('created_at', '>=', startOfDay)
    .whereNot('status', 'CANCELLED')
    .count({ count: '*' })
    .sum({ revenue: 'total' });
  return {
    byStatus: Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)])),
    today: { orders: Number(today.count) || 0, revenue: Number(today.revenue) || 0 },
  };
}

module.exports = { getById, findByNumberAndPhone, list, create, updateStatus, updatePaymentStatus, getStats };
