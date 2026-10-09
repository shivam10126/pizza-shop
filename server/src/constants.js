const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED',
];

// Which status an order may move to from its current status.
const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const ORDER_TYPES = ['DELIVERY', 'PICKUP'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'REFUNDED'];
const USER_ROLES = ['ADMIN', 'STAFF'];

function allowedNextStatuses(order) {
  const next = STATUS_TRANSITIONS[order.status] || [];
  // Delivery orders never become "ready for pickup" and vice versa.
  return next.filter((s) => {
    if (s === 'OUT_FOR_DELIVERY') return order.orderType === 'DELIVERY';
    if (s === 'READY_FOR_PICKUP') return order.orderType === 'PICKUP';
    return true;
  });
}

module.exports = {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  ORDER_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
  allowedNextStatuses,
};
