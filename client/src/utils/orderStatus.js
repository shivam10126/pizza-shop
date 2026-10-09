// Mirrors server/src/constants.js: which status an order may move to next.
export const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const ORDER_TYPES = ['DELIVERY', 'PICKUP'];
export const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI'];
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'REFUNDED'];

export function allowedNextStatuses(order) {
  const next = STATUS_TRANSITIONS[order.status] || [];
  return next.filter((s) => {
    if (s === 'OUT_FOR_DELIVERY') return order.orderType === 'DELIVERY';
    if (s === 'READY_FOR_PICKUP') return order.orderType === 'PICKUP';
    return true;
  });
}
