const config = require('./config');
const db = require('./db/knex');
const { createApp } = require('./app');

async function checkDatabase() {
  try {
    await db.raw('select 1');
  } catch (err) {
    console.error(`\nCannot connect to the database (${db.clientName}): ${err.message}`);
    console.error('-> Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME in server/.env');
    console.error('-> Make sure the MySQL server is running and reachable.\n');
    process.exit(1);
  }

  if (!(await db.schema.hasTable('pizzas'))) {
    console.error('\nDatabase tables are missing. Run "npm run db:setup" from the project root first.\n');
    process.exit(1);
  }

  const [, pending] = await db.migrate.list();
  if (pending.length) {
    console.warn(`There are ${pending.length} pending migration(s). Run "npm run db:migrate".`);
  }
}

async function start() {
  await checkDatabase();
  console.log(`Database connected (${db.clientName})`);

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
