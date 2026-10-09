const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const SQLITE_CLIENTS = new Set(['sqlite', 'sqlite3', 'better-sqlite3']);

function isSqliteClient(name) {
  return SQLITE_CLIENTS.has(String(name || '').toLowerCase());
}

/**
 * Builds the knex configuration from environment variables.
 *
 *   DB_CLIENT=mysql2  (default)  -> real MySQL server, the production setup
 *   DB_CLIENT=sqlite             -> embedded SQLite file, only for local demos
 *                                   and the automated tests (no MySQL needed)
 *
 * Both modes run exactly the same migrations, seeds and query code.
 */
function buildKnexConfig(env = process.env) {
  const client = env.DB_CLIENT || 'mysql2';
  const base = {
    migrations: {
      directory: path.join(SERVER_ROOT, 'migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(SERVER_ROOT, 'seeds'),
    },
  };

  if (isSqliteClient(client)) {
    let filename = env.SQLITE_FILE || path.join('data', 'pizza-shop.sqlite');
    if (filename !== ':memory:') {
      filename = path.isAbsolute(filename) ? filename : path.join(SERVER_ROOT, filename);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    }
    return {
      ...base,
      client: 'better-sqlite3',
      connection: { filename },
      useNullAsDefault: true,
      // One connection only: an in-memory SQLite db lives per connection and
      // a file db avoids "database is locked" errors this way.
      pool: {
        min: 1,
        max: 1,
        afterCreate: (conn, done) => {
          conn.pragma('foreign_keys = ON');
          done(null, conn);
        },
      },
    };
  }

  return {
    ...base,
    client: 'mysql2',
    connection: {
      host: env.DB_HOST || '127.0.0.1',
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'pizza_shop',
      // Store and read all DATETIME values as UTC.
      timezone: 'Z',
      // Return DECIMAL columns as JS numbers instead of strings.
      decimalNumbers: true,
      charset: 'utf8mb4',
    },
    pool: { min: 0, max: 10 },
  };
}

module.exports = { buildKnexConfig, isSqliteClient, SERVER_ROOT };
