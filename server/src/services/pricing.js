const config = require('../config');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Public shop settings (also sent to the browser so the cart preview matches). */
function getShopSettings() {
  return {
    shopName: config.shop.name,
    currencySymbol: config.shop.currencySymbol,
    taxRate: config.shop.taxRate,
    deliveryFee: config.shop.deliveryFee,
    freeDeliveryOver: config.shop.freeDeliveryOver,
  };
}

function calculateTotals(lineTotals, orderType, settings = getShopSettings()) {
  const subtotal = round2(lineTotals.reduce((sum, v) => sum + v, 0));
  const tax = round2(subtotal * settings.taxRate);
  let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    const free = settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver;
    deliveryFee = free ? 0 : round2(settings.deliveryFee);
  }
  const total = round2(subtotal + tax + deliveryFee);
  return { subtotal, tax, deliveryFee, total };
}

module.exports = { round2, getShopSettings, calculateTotals };
