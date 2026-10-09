const v = require('../utils/validation');
const { ORDER_TYPES, PAYMENT_METHODS } = require('../constants');

const MAX_ITEMS = 50;
const MAX_QTY = 20;

/** Returns a list of { field, message } problems; empty when the payload is valid. */
function validateOrderPayload(body) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const customer = body.customer && typeof body.customer === 'object' ? body.customer : {};
  const items = Array.isArray(body.items) ? body.items : [];

  if (!v.isNonEmptyString(customer.name, 100)) add('customer.name', 'Name is required');
  if (!v.isPhone(customer.phone)) add('customer.phone', 'Enter a valid phone number');
  if (customer.email && !v.isEmail(customer.email)) add('customer.email', 'Enter a valid email address');
  if (!v.isOptionalString(customer.address, 500)) add('customer.address', 'Address is too long');

  if (!ORDER_TYPES.includes(body.orderType)) add('orderType', 'Choose delivery or pickup');
  if (body.orderType === 'DELIVERY' && !v.isNonEmptyString(customer.address, 500)) {
    add('customer.address', 'Delivery address is required for delivery orders');
  }
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) add('paymentMethod', 'Choose a payment method');
  if (!v.isOptionalString(body.notes, 500)) add('notes', 'Notes are too long');

  if (!items.length) add('items', 'Your cart is empty');
  if (items.length > MAX_ITEMS) add('items', `At most ${MAX_ITEMS} lines per order`);
  items.forEach((item, i) => {
    if (!item || typeof item !== 'object') return add(`items[${i}]`, 'Invalid item');
    if (!v.isPositiveInt(item.pizzaId)) add(`items[${i}].pizzaId`, 'Invalid pizza');
    if (!v.isPositiveInt(item.sizeId)) add(`items[${i}].sizeId`, 'Invalid size');
    if (!v.isPositiveInt(item.quantity) || item.quantity > MAX_QTY) {
      add(`items[${i}].quantity`, `Quantity must be between 1 and ${MAX_QTY}`);
    }
    if (item.toppingIds !== undefined) {
      if (!Array.isArray(item.toppingIds) || !item.toppingIds.every(v.isPositiveInt)) {
        add(`items[${i}].toppingIds`, 'Invalid toppings');
      }
    }
    return undefined;
  });
  return errors;
}

module.exports = { validateOrderPayload, MAX_ITEMS, MAX_QTY };
