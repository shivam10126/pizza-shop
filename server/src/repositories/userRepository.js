const db = require('../db/knex');
const { toBool, toIso } = require('./mappers');

const mapUser = (r) => ({
  id: r.id,
  username: r.username,
  passwordHash: r.password_hash,
  displayName: r.display_name,
  role: r.role,
  isActive: toBool(r.is_active),
  createdAt: toIso(r.created_at),
});

async function findByUsername(username) {
  const row = await db('users').where({ username }).first();
  return row ? mapUser(row) : null;
}

async function findById(id) {
  const row = await db('users').where({ id }).first();
  return row ? mapUser(row) : null;
}

async function updatePassword(id, passwordHash) {
  return db('users').where({ id }).update({ password_hash: passwordHash, updated_at: new Date() });
}

module.exports = { findByUsername, findById, updatePassword };
