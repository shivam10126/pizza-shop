const knex = require('knex');
require('../config');
const { buildKnexConfig } = require('./knexConfig');

const knexConfig = buildKnexConfig();
const db = knex(knexConfig);

db.clientName = knexConfig.client;

module.exports = db;
