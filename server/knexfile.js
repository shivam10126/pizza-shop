// Used by the knex CLI (npm run db:migrate / db:seed / db:rollback).
// The application itself builds the same config through src/db/knex.js.
require('./src/config');
const { buildKnexConfig } = require('./src/db/knexConfig');

module.exports = buildKnexConfig();
