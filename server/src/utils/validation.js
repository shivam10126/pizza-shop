const PHONE_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (v, max = 500) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

const isOptionalString = (v, max = 500) =>
  v === undefined || v === null || (typeof v === 'string' && v.length <= max);

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

const isMoney = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1_000_000;

const isPhone = (v) => typeof v === 'string' && PHONE_RE.test(v.trim());

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());

/** Keeps digits and a leading "+" so the same customer is matched regardless of spacing. */
const normalizePhone = (v) => {
  const trimmed = String(v).trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
};

const clean = (v) => (typeof v === 'string' ? v.trim() : v);

module.exports = {
  isNonEmptyString,
  isOptionalString,
  isPositiveInt,
  isMoney,
  isPhone,
  isEmail,
  normalizePhone,
  clean,
};
