const menuRepo = require('../repositories/menuRepository');
const orderRepo = require('../repositories/orderRepository');
const { isUniqueViolation } = require('../repositories/mappers');
const { ApiError } = require('../utils/errors');
const v = require('../utils/validation');
const { generateOrderNumber } = require('../utils/orderNumber');
const { round2, calculateTotals } = require('./pricing');
const { validateOrderPayload } = require('./orderValidation');
const { PAYMENT_STATUSES, ORDER_STATUSES, allowedNextStatuses } = require('../constants');

const withTransitions = (order) => ({ ...order, allowedNextStatuses: allowedNextStatuses(order) });

/** Validates the request, prices every line from the database and stores the order. */
async function createOrder(body) {
  const errors = validateOrderPayload(body || {});
  if (errors.length) throw ApiError.badRequest('Please correct the highlighted fields', errors);

  const customer = {
    name: v.clean(body.customer.name),
    phone: v.normalizePhone(body.customer.phone),
    email: body.customer.email ? v.clean(body.customer.email) : null,
    address: body.customer.address ? v.clean(body.customer.address) : null,
  };

  const pizzaIds = [...new Set(body.items.map((i) => i.pizzaId))];
  const toppingIds = [...new Set(body.items.flatMap((i) => i.toppingIds || []))];
  const [pizzas, toppings] = await Promise.all([
    menuRepo.getPizzas({ ids: pizzaIds }),
    toppingIds.length ? menuRepo.getToppings({ ids: toppingIds }) : [],
  ]);
  const pizzaById = new Map(pizzas.map((p) => [p.id, p]));
  const toppingById = new Map(toppings.map((t) => [t.id, t]));

  const items = body.items.map((line, i) => {
    const pizza = pizzaById.get(line.pizzaId);
    if (!pizza) throw ApiError.badRequest(`Item ${i + 1}: that pizza is not available any more`);
    const size = pizza.sizes.find((s) => s.sizeId === line.sizeId);
    if (!size) throw ApiError.badRequest(`Item ${i + 1}: size not available for ${pizza.name}`);
    const lineToppings = (line.toppingIds || []).map((id) => {
      const t = toppingById.get(id);
      if (!t) throw ApiError.badRequest(`Item ${i + 1}: a selected topping is not available`);
      return { id: t.id, name: t.name, price: t.price };
    });
    const unitPrice = round2(size.price + lineToppings.reduce((s, t) => s + t.price, 0));
    return {
      pizzaId: pizza.id,
      pizzaName: pizza.name,
      sizeId: size.sizeId,
      sizeName: size.sizeName,
      unitPrice,
      quantity: line.quantity,
      lineTotal: round2(unitPrice * line.quantity),
      toppings: lineToppings,
    };
  });

  const totals = calculateTotals(items.map((i) => i.lineTotal), body.orderType);
  const order = {
    orderType: body.orderType,
    deliveryAddress: body.orderType === 'DELIVERY' ? customer.address : null,
    paymentMethod: body.paymentMethod,
    notes: body.notes ? v.clean(body.notes) : null,
    ...totals,
  };

  // Order numbers are random; retry on the (very unlikely) collision.
  for (let attempt = 0; ; attempt += 1) {
    order.orderNumber = generateOrderNumber();
    try {
      const id = await orderRepo.create({ customer, order, items });
      return withTransitions(await orderRepo.getById(id));
    } catch (err) {
      if (!isUniqueViolation(err) || attempt >= 4) throw err;
    }
  }
}

async function trackOrder(orderNumber, phone) {
  if (!v.isNonEmptyString(orderNumber, 20) || !v.isPhone(phone || '')) {
    throw ApiError.badRequest('Order number and phone number are required');
  }
  const order = await orderRepo.findByNumberAndPhone(orderNumber.trim().toUpperCase(), v.normalizePhone(phone));
  if (!order) throw ApiError.notFound('No order found for that order number and phone');
  return withTransitions(order);
}

async function listOrders({ status, page, pageSize }) {
  if (status && !ORDER_STATUSES.includes(status)) throw ApiError.badRequest('Unknown status filter');
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const result = await orderRepo.list({ status, page: p, pageSize: ps });
  return { ...result, orders: result.orders.map(withTransitions) };
}

async function getOrder(id) {
  const order = await orderRepo.getById(id);
  if (!order) throw ApiError.notFound('Order not found');
  return withTransitions(order);
}

async function updateStatus(id, status, note) {
  const order = await getOrder(id);
  if (!order.allowedNextStatuses.includes(status)) {
    throw ApiError.badRequest(`Cannot change status from ${order.status} to ${status || '(empty)'}`);
  }
  if (!v.isOptionalString(note, 255)) throw ApiError.badRequest('Note is too long');
  // Payment is collected on delivery/pickup, so completing an order marks it paid.
  const paymentStatus = status === 'COMPLETED' && order.paymentStatus === 'PENDING' ? 'PAID' : undefined;
  const updated = await orderRepo.updateStatus(id, { status, note: note ? v.clean(note) : null, paymentStatus });
  return withTransitions(updated);
}

async function updatePaymentStatus(id, paymentStatus) {
  if (!PAYMENT_STATUSES.includes(paymentStatus)) throw ApiError.badRequest('Unknown payment status');
  const order = await orderRepo.updatePaymentStatus(id, paymentStatus);
  if (!order) throw ApiError.notFound('Order not found');
  return withTransitions(order);
}

module.exports = {
  createOrder,
  trackOrder,
  listOrders,
  getOrder,
  updateStatus,
  updatePaymentStatus,
  getStats: () => orderRepo.getStats(),
};
