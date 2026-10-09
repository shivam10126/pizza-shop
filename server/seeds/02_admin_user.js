/**
 * Creates the first admin user from ADMIN_USERNAME / ADMIN_PASSWORD in .env
 * (defaults: admin / admin123). Skipped if that username already exists.
 */
const bcrypt = require('bcryptjs');

exports.seed = async function seed(knex) {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await knex('users').where({ username }).first();
  if (existing) {
    console.log(`Admin user "${username}" already exists - skipping.`);
    return;
  }

  const now = new Date();
  await knex('users').insert({
    username,
    password_hash: await bcrypt.hash(password, 10),
    display_name: 'Administrator',
    role: 'ADMIN',
    is_active: 1,
    created_at: now,
    updated_at: now,
  });
  console.log(`Created admin user "${username}".`);
};
