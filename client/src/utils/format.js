export const money = (value, symbol = '₹') => `${symbol}${Number(value || 0).toFixed(2)}`;

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
};

export const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  READY_FOR_PICKUP: 'Ready for pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUSES = Object.keys(STATUS_LABELS);

export const statusLabel = (status) => STATUS_LABELS[status] || status;

export const PAYMENT_LABELS = { CASH: 'Cash', CARD: 'Card', UPI: 'UPI' };
