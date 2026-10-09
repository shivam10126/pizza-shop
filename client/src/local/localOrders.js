// Local-mode handlers for the public menu, placing orders and tracking them.
import { fail, withTransitions, pizzaView, randomCode, bySortOrder, byName } from './common.js';
import { calculateTotals, round2 } from '../utils/pricing.js';
import { validateOrderPayload, isNonEmptyString, isPhone, normalizePhone, clean } from './validation.js';

export function orderRoutes(ctx) {
  const { store, settings } = ctx;
  const db = () => store.get();

  const getMenu = () => {
    const d = db();
    const categories = [...d.categories]
      .sort(bySortOrder)
      .map((c) => ({
        ...c,
        pizzas: d.pizzas
          .filter((p) => p.categoryId === c.id && p.isAvailable && p.sizes.length)
          .sort(byName)
          .map((p) => pizzaView(d, p)),
      }))
      .filter((c) => c.pizzas.length);
    return {
      categories,
      sizes: [...d.sizes].sort(bySortOrder),
      toppings: d.toppings.filter((t) => t.isAvailable).sort(byName),
    };
  };

  const createOrder = ({ body }) => {
    const errors = validateOrderPayload(body);
    if (errors.length) fail(400, 'Please correct the highlighted fields', errors);
    const d = db();

    const items = body.items.map((line, i) => {
      const pizza = d.pizzas.find((p) => p.id === line.pizzaId && p.isAvailable);
      if (!pizza) fail(400, `Item ${i + 1}: that pizza is not available any more`);
      const size = pizza.sizes.find((s) => s.sizeId === line.sizeId);
      if (!size) fail(400, `Item ${i + 1}: size not available for ${pizza.name}`);
      const toppings = (line.toppingIds || []).map((id) => {
        const t = d.toppings.find((x) => x.id === id && x.isAvailable);
        if (!t) fail(400, `Item ${i + 1}: a selected topping is not available`);
        return { id: store.nextId('orderItemTopping'), toppingId: t.id, name: t.name, price: t.price };
      });
      const unitPrice = round2(size.price + toppings.reduce((s, t) => s + t.price, 0));
      return {
        id: store.nextId('orderItem'),
        pizzaId: pizza.id,
        pizzaName: pizza.name,
        sizeId: size.sizeId,
        sizeName: size.sizeName,
        unitPrice,
        quantity: line.quantity,
        lineTotal: round2(unitPrice * line.quantity),
        toppings,
      };
    });

    const stamp = new Date().toISOString();
    const phone = normalizePhone(body.customer.phone);
    const email = body.customer.email ? clean(body.customer.email) : null;
    const address = body.customer.address ? clean(body.customer.address) : null;
    let customer = d.customers.find((c) => c.phone === phone);
    if (customer) {
      Object.assign(customer, {
        name: clean(body.customer.name),
        email: email ?? customer.email,
        address: address ?? customer.address,
        updatedAt: stamp,
      });
    } else {
      customer = { id: store.nextId('customer'), name: clean(body.customer.name), phone, email, address, createdAt: stamp, updatedAt: stamp };
      d.customers.push(customer);
    }

    let orderNumber;
    do orderNumber = `PZ-${randomCode(6)}`;
    while (d.orders.some((o) => o.orderNumber === orderNumber));

    const order = {
      id: store.nextId('order'),
      orderNumber,
      status: 'PENDING',
      orderType: body.orderType,
      deliveryAddress: body.orderType === 'DELIVERY' ? address : null,
      paymentMethod: body.paymentMethod,
      paymentStatus: 'PENDING',
      ...calculateTotals(items.reduce((s, i) => s + i.lineTotal, 0), body.orderType, settings),
      notes: body.notes ? clean(body.notes) : null,
      createdAt: stamp,
      updatedAt: stamp,
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address },
      items,
      statusHistory: [{ status: 'PENDING', note: 'Order placed', changedAt: stamp }],
    };
    d.orders.push(order);
    return { order: withTransitions(order) };
  };

  const trackOrder = ({ body }) => {
    if (!isNonEmptyString(body.orderNumber, 20) || !isPhone(body.phone || '')) {
      fail(400, 'Order number and phone number are required');
    }
    const number = body.orderNumber.trim().toUpperCase();
    const phone = normalizePhone(body.phone);
    const order = db().orders.find((o) => o.orderNumber === number && o.customer.phone === phone);
    if (!order) fail(404, 'No order found for that order number and phone');
    return { order: withTransitions(order) };
  };

  return [
    { method: 'GET', pattern: /^\/menu$/, handler: getMenu },
    { method: 'POST', pattern: /^\/orders$/, handler: createOrder },
    { method: 'POST', pattern: /^\/orders\/track$/, handler: trackOrder },
  ];
}
