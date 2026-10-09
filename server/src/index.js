const config = require('./config');
const db = require('./db/knex');
const { createApp } = require('./app');

/**
 * Returns true when the database is reachable and set up.
 * If it cannot be reached the server still starts: the website then runs in
 * LOCAL MODE (all data kept in the browser's local storage, login manager/1234).
 */
async function checkDatabase() {
  try {
    await db.raw('select 1');
  } catch (err) {
    console.warn(`\nNo database connection (${db.clientName}): ${err.message}`);
    console.warn('-> The website will run in LOCAL MODE: data is stored in the browser only.');
    console.warn('-> To use MySQL, set DB_* in server/.env, start MySQL and run "npm run db:setup".\n');
    return false;
  }

  if (!(await db.schema.hasTable('pizzas'))) {
    console.error('\nDatabase is reachable but the tables are missing. Run "npm run db:setup" from the project root first.\n');
    process.exit(1);
  }

  const [, pending] = await db.migrate.list();
  if (pending.length) {
    console.warn(`There are ${pending.length} pending migration(s). Run "npm run db:migrate".`);
  }
  return true;
}

async function start() {
  const connected = await checkDatabase();
  console.log(connected ? `Database connected (${db.clientName})` : 'Running without a database (local mode)');

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Pizza shop server listening on http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => db.destroy().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
