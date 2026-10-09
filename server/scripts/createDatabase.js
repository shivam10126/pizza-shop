/**
 * Creates the MySQL database named in server/.env (DB_NAME) if it does not
 * exist yet. Tables are then created by "knex migrate:latest".
 * In SQLite mode this is a no-op (the file is created automatically).
 */
require('../src/config');
const { buildKnexConfig, isSqliteClient } = require('../src/db/knexConfig');

async function main() {
  const cfg = buildKnexConfig();

  if (isSqliteClient(cfg.client)) {
    console.log(`SQLite mode: database file "${cfg.connection.filename}" is created automatically.`);
    return;
  }

  const { database, host, port, user, password } = cfg.connection;
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error(`DB_NAME "${database}" may only contain letters, numbers and underscores.`);
  }

  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({ host, port, user, password });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
  console.log(`MySQL database "${database}" is ready on ${host}:${port}.`);
}

main().catch((err) => {
  console.error('Could not create the database:', err.message);
  console.error('Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD in server/.env and that MySQL is running.');
  process.exit(1);
});
