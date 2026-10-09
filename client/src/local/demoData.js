// Dummy customers and orders for local (no database) mode, so the staff
// dashboard, stats and order tracking have realistic data straight away.
import { calculateTotals, round2 } from '../utils/pricing.js';

export const DEMO_CUSTOMERS = [
  { name: 'Priya Sharma', phone: '9876501234', email: 'priya@example.com', address: '14 Lake View Apartments, Koramangala' },
  { name: 'Rahul Verma', phone: '9123456780', email: null, address: '55 Market Street, BTM Layout' },
  { name: 'Ananya Iyer', phone: '9988776655', email: 'ananya@example.com', address: '7 Rose Garden Road, Indiranagar' },
  { name: 'Vikram Singh', phone: '9012345678', email: 'vikram@example.com', address: '221 Palm Grove, Whitefield' },
  { name: 'Neha Gupta', phone: '9898989898', email: null, address: '3 Hill Crest Lane, Jayanagar' },
];

// minutesAgo = when the order was placed. steps = [status, minutes after placing, note?]
export const DEMO_ORDERS = [
  { number: 'PZ-DEMO2A', customer: 0, minutesAgo: 12, type: 'DELIVERY', payment: 'UPI', notes: 'Please ring the bell',
    items: [{ pizza: 'Margherita', size: 'Medium', qty: 2, toppings: ['Extra Cheese'] }, { pizza: 'Cheese Burst', size: 'Small', qty: 1 }],
    steps: [] },
  { number: 'PZ-DEMO3B', customer: 1, minutesAgo: 35, type: 'PICKUP', payment: 'CASH',
    items: [{ pizza: 'Farmhouse', size: 'Large', qty: 1 }],
    steps: [['CONFIRMED', 3, 'Called the customer']] },
  { number: 'PZ-DEMO4C', customer: 2, minutesAgo: 58, type: 'DELIVERY', payment: 'CARD', notes: 'Extra napkins',
    items: [{ pizza: 'Pepperoni', size: 'Medium', qty: 1 }, { pizza: 'Chicken Tikka', size: 'Medium', qty: 1, toppings: ['Jalapenos'] }],
    steps: [['CONFIRMED', 2], ['PREPARING', 9, 'In the oven']] },
  { number: 'PZ-DEMO5D', customer: 3, minutesAgo: 110, type: 'DELIVERY', payment: 'CASH',
    items: [{ pizza: 'Paneer Tikka', size: 'Large', qty: 1, toppings: ['Sweet Corn', 'Red Onion'] }],
    steps: [['CONFIRMED', 2], ['PREPARING', 8], ['OUT_FOR_DELIVERY', 32, 'Rider: Suresh']] },
  { number: 'PZ-DEMO6E', customer: 4, minutesAgo: 60 * 26, type: 'DELIVERY', payment: 'UPI', paymentStatus: 'PAID',
    items: [{ pizza: 'BBQ Chicken', size: 'Medium', qty: 2, toppings: ['Mushrooms'] }],
    steps: [['CONFIRMED', 1], ['PREPARING', 6], ['OUT_FOR_DELIVERY', 28], ['COMPLETED', 52, 'Delivered']] },
  { number: 'PZ-DEMO7F', customer: 0, minutesAgo: 60 * 30, type: 'PICKUP', payment: 'CASH', paymentStatus: 'PAID',
    items: [{ pizza: 'Four Cheese', size: 'Medium', qty: 1 }, { pizza: 'Veggie Supreme', size: 'Small', qty: 1 }],
    steps: [['CONFIRMED', 2], ['PREPARING', 5], ['READY_FOR_PICKUP', 24], ['COMPLETED', 41, 'Picked up']] },
  { number: 'PZ-DEMO8G', customer: 1, minutesAgo: 60 * 50, type: 'DELIVERY', payment: 'CASH',
    items: [{ pizza: 'Meat Feast', size: 'Large', qty: 1 }],
    steps: [['CANCELLED', 4, 'Customer changed their mind']] },
];

const minutesBefore = (date, minutes) => new Date(date.getTime() - minutes * 60000);

/** Adds demo customers and orders to a freshly seeded local database. */
export function addDemoData(db, settings, now = new Date()) {
  const weekAgo = minutesBefore(now, 7 * 24 * 60).toISOString();
  db.customers = DEMO_CUSTOMERS.map((c, i) => ({ id: i + 1, ...c, createdAt: weekAgo, updatedAt: weekAgo }));
  db.seq.customer = db.customers.length;

  const byName = (list) => Object.fromEntries(list.map((x) => [x.name, x]));
  const pizzas = byName(db.pizzas);
  const toppings = byName(db.toppings);

  const oldestFirst = [...DEMO_ORDERS].sort((a, b) => b.minutesAgo - a.minutesAgo);
  for (const demo of oldestFirst) {
    const placedAt = minutesBefore(now, demo.minutesAgo);
    const customer = db.customers[demo.customer];
    const items = demo.items.map((line) => {
      const pizza = pizzas[line.pizza];
      const size = pizza.sizes.find((s) => s.sizeName === line.size);
      const lineToppings = (line.toppings || []).map((name) => {
        const t = toppings[name];
        db.seq.orderItemTopping += 1;
        return { id: db.seq.orderItemTopping, toppingId: t.id, name: t.name, price: t.price };
      });
      const unitPrice = round2(size.price + lineToppings.reduce((s, t) => s + t.price, 0));
      db.seq.orderItem += 1;
      return {
        id: db.seq.orderItem,
        pizzaId: pizza.id,
        pizzaName: pizza.name,
        sizeId: size.sizeId,
        sizeName: size.sizeName,
        unitPrice,
        quantity: line.qty,
        lineTotal: round2(unitPrice * line.qty),
        toppings: lineToppings,
      };
    });
    const totals = calculateTotals(items.reduce((s, i) => s + i.lineTotal, 0), demo.type, settings);
    const history = [{ status: 'PENDING', note: 'Order placed', changedAt: placedAt.toISOString() }];
    for (const [status, minutes, note] of demo.steps) {
      history.push({ status, note: note || null, changedAt: new Date(placedAt.getTime() + minutes * 60000).toISOString() });
    }
    const last = history[history.length - 1];
    db.seq.order += 1;
    db.orders.push({
      id: db.seq.order,
      orderNumber: demo.number,
      status: last.status,
      orderType: demo.type,
      deliveryAddress: demo.type === 'DELIVERY' ? customer.address : null,
      paymentMethod: demo.payment,
      paymentStatus: demo.paymentStatus || 'PENDING',
      ...totals,
      notes: demo.notes || null,
      createdAt: placedAt.toISOString(),
      updatedAt: last.changedAt,
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address },
      items,
      statusHistory: history,
    });
  }
  return db;
}
