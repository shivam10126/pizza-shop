import { allowedNextStatuses } from '../utils/orderStatus.js';

/** Error shape mirrored from the real API ({ message, errors? } with an HTTP status). */
export class LocalError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'LocalError';
    this.status = status;
    this.data = errors ? { message, errors } : { message };
  }
}

export function fail(status, message, errors) {
  throw new LocalError(status, message, errors);
}

export const LOCAL_SETTINGS = {
  shopName: 'Slice of Heaven',
  currencySymbol: '₹',
  taxRate: 0.05,
  deliveryFee: 40,
  freeDeliveryOver: 500,
};

export const withTransitions = (order) => ({ ...order, allowedNextStatuses: allowedNextStatuses(order) });

export const bySortOrder = (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
export const byName = (a, b) => a.name.localeCompare(b.name);

export function pizzaView(db, pizza) {
  const category = db.categories.find((c) => c.id === pizza.categoryId);
  return { ...pizza, categoryName: category ? category.name : null };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
