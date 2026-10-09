// Small helpers that normalise driver differences (MySQL vs SQLite).

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBool(value) {
  return value === true || value === 1 || value === '1';
}

/** DATETIME values arrive as Date (mysql2), ms numbers or strings (sqlite). */
function toIso(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  const s = String(value);
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(s);
  if (m) return new Date(`${m[1]}T${m[2]}Z`).toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

/** Unique-constraint violations on MySQL (ER_DUP_ENTRY) and SQLite. */
function isUniqueViolation(err) {
  if (!err) return false;
  const code = String(err.code || '');
  return code === 'ER_DUP_ENTRY' || code.startsWith('SQLITE_CONSTRAINT') || /unique/i.test(err.message || '');
}

module.exports = { toNumber, toBool, toIso, isUniqueViolation };
