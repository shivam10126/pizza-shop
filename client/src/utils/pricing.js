// Mirrors server/src/services/pricing.js so the cart preview matches the
// final total. The server always recalculates prices before saving.
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateTotals(subtotalRaw, orderType, settings) {
  const subtotal = round2(subtotalRaw);
  const tax = round2(subtotal * (settings.taxRate || 0));
  let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    const free = settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver;
    deliveryFee = free ? 0 : round2(settings.deliveryFee || 0);
  }
  return { subtotal, tax, deliveryFee, total: round2(subtotal + tax + deliveryFee) };
}
