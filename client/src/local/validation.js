// Same rules as server/src/utils/validation.js + services/orderValidation.js,
// used when the app runs in local (no database) mode.
import { ORDER_TYPES, PAYMENT_METHODS } from '../utils/orderStatus.js';

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isNonEmptyString = (v, max = 500) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
export const isOptionalString = (v, max = 500) =>
  v === undefined || v === null || (typeof v === 'string' && v.length <= max);
export const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
export const isMoney = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1_000_000;
export const isPhone = (v) => typeof v === 'string' && PHONE_RE.test(v.trim());
export const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
export const clean = (v) => (typeof v === 'string' ? v.trim() : v);

export const normalizePhone = (v) => {
  const trimmed = String(v).trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
};

const MAX_ITEMS = 50;
const MAX_QTY = 20;

export function validateOrderPayload(body) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const customer = body.customer && typeof body.customer === 'object' ? body.customer : {};
  const items = Array.isArray(body.items) ? body.items : [];

  if (!isNonEmptyString(customer.name, 100)) add('customer.name', 'Name is required');
  if (!isPhone(customer.phone)) add('customer.phone', 'Enter a valid phone number');
  if (customer.email && !isEmail(customer.email)) add('customer.email', 'Enter a valid email address');
  if (!isOptionalString(customer.address, 500)) add('customer.address', 'Address is too long');

  if (!ORDER_TYPES.includes(body.orderType)) add('orderType', 'Choose delivery or pickup');
  if (body.orderType === 'DELIVERY' && !isNonEmptyString(customer.address, 500)) {
    add('customer.address', 'Delivery address is required for delivery orders');
  }
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) add('paymentMethod', 'Choose a payment method');
  if (!isOptionalString(body.notes, 500)) add('notes', 'Notes are too long');

  if (!items.length) add('items', 'Your cart is empty');
  if (items.length > MAX_ITEMS) add('items', `At most ${MAX_ITEMS} lines per order`);
  items.forEach((item, i) => {
    if (!item || typeof item !== 'object') return add(`items[${i}]`, 'Invalid item');
    if (!isPositiveInt(item.pizzaId)) add(`items[${i}].pizzaId`, 'Invalid pizza');
    if (!isPositiveInt(item.sizeId)) add(`items[${i}].sizeId`, 'Invalid size');
    if (!isPositiveInt(item.quantity) || item.quantity > MAX_QTY) {
      add(`items[${i}].quantity`, `Quantity must be between 1 and ${MAX_QTY}`);
    }
    if (item.toppingIds !== undefined) {
      if (!Array.isArray(item.toppingIds) || !item.toppingIds.every(isPositiveInt)) {
        add(`items[${i}].toppingIds`, 'Invalid toppings');
      }
    }
    return undefined;
  });
  return errors;
}
