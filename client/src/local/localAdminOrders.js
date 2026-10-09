// Local-mode handlers for the staff order board and stats.
import { fail, withTransitions } from './common.js';
import { round2 } from '../utils/pricing.js';
import { ORDER_STATUSES } from '../utils/format.js';
import { PAYMENT_STATUSES, allowedNextStatuses } from '../utils/orderStatus.js';
import { isOptionalString, clean } from './validation.js';

export function adminOrderRoutes(ctx) {
  const { store } = ctx;
  const db = () => store.get();

  const findOrder = (id) => {
    const order = db().orders.find((o) => o.id === id);
    if (!order) fail(404, 'Order not found');
    return order;
  };

  const listOrders = ({ query }) => {
    const { status } = query;
    if (status && !ORDER_STATUSES.includes(status)) fail(400, 'Unknown status filter');
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
    const all = db()
      .orders.filter((o) => !status || o.status === status)
      .sort((a, b) => b.id - a.id);
    const orders = all
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ statusHistory, ...rest }) => withTransitions(rest));
    return { orders, total: all.length, page, pageSize };
  };

  const updateStatus = ({ params: [id], body }) => {
    const order = findOrder(id);
    const { status, note } = body;
    if (!allowedNextStatuses(order).includes(status)) {
      fail(400, `Cannot change status from ${order.status} to ${status || '(empty)'}`);
    }
    if (!isOptionalString(note, 255)) fail(400, 'Note is too long');
    const stamp = new Date().toISOString();
    order.status = status;
    order.updatedAt = stamp;
    if (status === 'COMPLETED' && order.paymentStatus === 'PENDING') order.paymentStatus = 'PAID';
    order.statusHistory.push({ status, note: note ? clean(note) : null, changedAt: stamp });
    return { order: withTransitions(order) };
  };

  const updatePayment = ({ params: [id], body }) => {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) fail(400, 'Unknown payment status');
    const order = findOrder(id);
    order.paymentStatus = body.paymentStatus;
    order.updatedAt = new Date().toISOString();
    return { order: withTransitions(order) };
  };

  const stats = () => {
    const d = db();
    const byStatus = {};
    for (const o of d.orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = d.orders.filter((o) => o.status !== 'CANCELLED' && new Date(o.createdAt) >= start);
    return { byStatus, today: { orders: today.length, revenue: round2(today.reduce((s, o) => s + o.total, 0)) } };
  };

  return [
    { method: 'GET', pattern: /^\/admin\/stats$/, auth: 'any', handler: stats },
    { method: 'GET', pattern: /^\/admin\/orders$/, auth: 'any', handler: listOrders },
    { method: 'GET', pattern: /^\/admin\/orders\/(\d+)$/, auth: 'any', handler: ({ params: [id] }) => ({ order: withTransitions(findOrder(id)) }) },
    { method: 'PATCH', pattern: /^\/admin\/orders\/(\d+)\/status$/, auth: 'any', handler: updateStatus },
    { method: 'PATCH', pattern: /^\/admin\/orders\/(\d+)\/payment$/, auth: 'any', handler: updatePayment },
  ];
}
