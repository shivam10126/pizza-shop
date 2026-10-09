# 🍕 Pizza Shop — React + Express + Node.js + MySQL

A complete online-ordering app for a pizza shop. Customers browse the menu, build a cart with sizes and toppings, check out for delivery or pickup and track their order. Staff log in to a dashboard to work orders through the kitchen and manage the menu. **Everything (menu, customers, orders, order lines, status history, users) is stored in MySQL tables.**

```
Browser (React / Vite)  ──►  Express REST API (Node.js)  ──►  MySQL
```

## Features

**Works with or without a database**
- With MySQL configured, everything is stored in MySQL tables.
- With no database connected (or no server running at all) the site switches to **local mode**: the same screens keep working, data is kept in the browser's local storage, dummy customers and orders are pre-loaded, and the staff login is `manager` / `1234`.

**Customer site**
- Menu grouped by category, each pizza with Small / Medium / Large prices and optional extra toppings
- Cart kept in the browser (survives refresh), live subtotal / tax / delivery-fee preview
- Checkout for home delivery or pickup, cash / card / UPI on delivery, kitchen notes
- Server-side validation and pricing (the browser never decides what an order costs)
- Order confirmation with an order number, plus an **order tracking page** (order number + phone)

**Staff dashboard** (`/admin`)
- Login with username + password (JWT), roles `ADMIN` and `STAFF`
- Today's orders and revenue, counts by status, auto-refreshing order board with filters
- Move orders through `PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY / READY_FOR_PICKUP → COMPLETED` (or `CANCELLED`) with notes; every change is kept in a history table
- Menu management: add / edit / hide / delete pizzas and toppings, prices per size

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | React 18, React Router 6, Vite 5, plain CSS |
| API | Node.js 18+, Express 4, JSON Web Tokens, bcrypt |
| Database | **MySQL 8** (or MariaDB 10.4+) through [knex](https://knexjs.org/) migrations and the `mysql2` driver |
| Tests | Node's built-in test runner against the same schema on an in-memory SQLite database |

## Project structure

```
pizza-shop/
├── package.json            # npm workspaces: one "npm install" installs both apps
├── shared/menu-seed.json   # sample menu used by the database seed and by local mode
├── client/                 # React app (Vite)
│   └── src/
│       ├── pages/          # Menu, Cart, Checkout, Order, Track, admin/*
│       ├── components/     # Navbar, PizzaCard, OrderDetails, ...
│       ├── context/        # Cart, Auth (admin token), Settings
│       ├── local/          # local mode: in-browser API + dummy data (no database)
│       └── api.js          # fetch wrapper for /api
└── server/                 # Express API
    ├── .env.example        # copy to .env and fill in your MySQL details
    ├── knexfile.js         # database config for the knex CLI
    ├── migrations/         # creates all tables (run once per database)
    ├── seeds/              # sample menu + first admin user
    ├── scripts/createDatabase.js
    ├── docs/schema.sql     # the resulting MySQL schema, for reference
    ├── src/
    │   ├── index.js        # starts the server (checks the DB connection first)
    │   ├── app.js          # Express app, routes, serves client/dist in production
    │   ├── routes/         # public.js, auth.js, admin.js
    │   ├── services/       # validation, pricing, order & menu logic
    │   ├── repositories/   # all SQL (knex query builder)
    │   └── db/             # knex instance + config
    └── tests/              # API tests (node --test)
```

## Try it without a database (local mode)

```bash
npm install
npm run build
npm start          # or: npm run dev
```

Open http://localhost:5000 (or http://localhost:5173 with `npm run dev`). Because no database is configured, the server logs *"Running without a database (local mode)"* and the site shows a yellow **Local mode** bar. Everything works: menu, cart, checkout, tracking and the staff dashboard (login `manager` / `1234`). The menu, 5 dummy customers and 7 dummy orders in every status are loaded automatically, and anything you add is saved in that browser's local storage (clear the site data to start over). Local-mode data is per browser and never leaves it, so use MySQL for a real shop.

## Quick start on a new machine

You need **Node.js 18 or newer** (20 LTS recommended), **npm**, **git** and a running **MySQL 8** server (MariaDB 10.4+ also works).

```bash
# 1. get the code and install everything (server + client)
git clone <your-repository-url> pizza-shop
cd pizza-shop
npm install

# 2. tell the server how to reach your MySQL
cp server/.env.example server/.env          # Windows: copy server\.env.example server\.env
#    then open server/.env and set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#    and give JWT_SECRET a long random value

# 3. create the database, all tables, the sample menu and the admin user
npm run db:setup

# 4. build the website and start the server
npm run build
npm start
```

Open **http://localhost:5000** — the shop is live. Staff dashboard: **http://localhost:5000/admin/login** (default login `admin` / `admin123`, taken from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `server/.env` at seed time — change them before seeding, or change the password from the API afterwards, see below).

`npm run db:setup` is the only database step. It:
1. creates the database named in `DB_NAME` if it does not exist (`npm run db:create`),
2. creates all tables (`npm run db:migrate`),
3. inserts the sample menu and the admin user (`npm run db:seed`, skipped if data already exists).

The MySQL user needs `CREATE` rights for step 1. If your host gives you a database but not `CREATE DATABASE`, create it in their panel, set `DB_NAME` to it and run `npm run db:migrate` and `npm run db:seed` instead.

### Development mode (hot reload)

```bash
npm run dev
```

Starts the API on http://localhost:5000 and the React dev server on **http://localhost:5173** (which proxies `/api` to the server). Both restart/reload on file changes.

## Configuration (`server/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Port the API (and the built website) listens on |
| `NODE_ENV` | `development` | Set to `production` on a live server |
| `JWT_SECRET` | *(dev placeholder)* | Secret used to sign staff login tokens — **set a long random string** |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origins, comma separated; `*` allows all |
| `DB_CLIENT` | `mysql2` | `mysql2` for MySQL/MariaDB, `sqlite` for the no-MySQL demo mode |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL server address |
| `DB_USER` / `DB_PASSWORD` | `root` / *(empty)* | MySQL credentials |
| `DB_NAME` | `pizza_shop` | Database name (created by `db:setup`) |
| `SHOP_NAME` | `Slice of Heaven` | Shown in the site header and title |
| `CURRENCY_SYMBOL` | `₹` | Prefix for all prices |
| `TAX_RATE` | `0.05` | Tax added on the subtotal (0.05 = 5 %) |
| `DELIVERY_FEE` | `40` | Fee for delivery orders |
| `FREE_DELIVERY_OVER` | `500` | Subtotal at which delivery becomes free (`0` disables) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` | First admin account, created by `db:seed` |

## npm scripts (run from the project root)

| Script | What it does |
| --- | --- |
| `npm install` | Installs server and client dependencies |
| `npm run db:setup` | Create database + tables + sample data (safe to re-run) |
| `npm run db:migrate` | Apply new migrations only |
| `npm run db:seed` | Insert sample menu / admin if missing |
| `npm run db:reset` | **Drops all tables**, recreates them and re-seeds |
| `npm run dev` | Development: API + React dev server with hot reload |
| `npm run build` | Build the React app into `client/dist` |
| `npm start` | Start the API; also serves `client/dist` if it exists |
| `npm test` | Run the server and local-mode test-suites (no MySQL needed) |

## Database

All tables are created by the migration in `server/migrations/` (the same file produces the identical schema on MySQL and on the SQLite test database). `server/docs/schema.sql` shows the resulting MySQL DDL for reference.

| Table | Holds |
| --- | --- |
| `categories` | Menu sections (Classic, Veggie, …) |
| `sizes` | Small / Medium / Large |
| `pizzas` | Pizzas with description, image URL, availability |
| `pizza_prices` | Price of each pizza in each size |
| `toppings` | Extra toppings with price and availability |
| `customers` | One row per phone number (name, email, last address) |
| `orders` | Order header: number, status, type, payment, subtotal / tax / fee / total, notes |
| `order_items` | Lines of an order with a **snapshot** of pizza name, size and price |
| `order_item_toppings` | Toppings chosen on each line (also snapshotted) |
| `order_status_history` | Every status change with time and note |
| `users` | Staff logins (bcrypt password hash, role) |
| `knex_migrations*` | Bookkeeping for migrations |

Because order lines keep a copy of names and prices, editing or deleting a pizza later never changes past orders.

To look at the data use any MySQL client, e.g. `SELECT order_number, status, total FROM orders ORDER BY id DESC;`.

### Local mode (no database) in detail

On every page load the React app calls `GET /api/health`. If the server reports `database.connected: false`, or the server cannot be reached at all, the app switches to local mode:

- `client/src/local/` contains an in-browser implementation of the same REST API (`/menu`, `/orders`, `/orders/track`, `/auth/*`, `/admin/*`) with identical validation, pricing and status rules.
- Data lives in `localStorage` under the key `pizza-shop-local-db`: the menu from `shared/menu-seed.json`, the dummy customers and orders from `client/src/local/demoData.js`, plus everything created afterwards.
- The only login is `manager` / `1234` (role ADMIN). The password can be changed from the dashboard API and is stored in local storage too, so treat it as a demo account.
- The server still starts without a database so it can serve the website and the shop settings from `server/.env`; API data routes answer `503` until MySQL is configured.

Once `server/.env` points at a reachable MySQL and `npm run db:setup` has run, restart the server and the same site uses the database. Local-mode data is not migrated.

### SQLite option (server-side, no MySQL)

For a server-side demo without MySQL, set `DB_CLIENT=sqlite` in `server/.env`. The server then uses an embedded SQLite file (`server/data/pizza-shop.sqlite`) with the same tables, migrations and code paths, and the site runs in normal (database) mode. `npm test` uses an in-memory SQLite database for the API tests, so the test-suite runs anywhere.

## API overview

All responses are JSON. Prices are numbers, dates are ISO-8601 strings (UTC).

**Public**

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Server + database status |
| `GET /api/settings` | Shop name, currency, tax and delivery settings |
| `GET /api/menu` | Available categories, pizzas (with sizes/prices), toppings |
| `POST /api/orders` | Place an order — body: `{ customer:{name,phone,email?,address?}, orderType:"DELIVERY"|"PICKUP", paymentMethod:"CASH"|"CARD"|"UPI", notes?, items:[{pizzaId,sizeId,quantity,toppingIds?}] }` |
| `POST /api/orders/track` | Look up an order — body: `{ orderNumber, phone }` |

**Staff** (send `Authorization: Bearer <token>`)

| Method & path | Purpose |
| --- | --- |
| `POST /api/auth/login` | `{ username, password }` → `{ token, user }` |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/change-password` | `{ currentPassword, newPassword }` |
| `GET /api/admin/stats` | Counts by status, today's orders and revenue |
| `GET /api/admin/orders?status=&page=&pageSize=` | Order list, newest first |
| `GET /api/admin/orders/:id` | One order with its status history |
| `PATCH /api/admin/orders/:id/status` | `{ status, note? }` — only allowed transitions are accepted |
| `PATCH /api/admin/orders/:id/payment` | `{ paymentStatus: "PENDING"|"PAID"|"REFUNDED" }` |
| `GET /api/admin/menu` | Full menu including hidden items |
| `POST /api/admin/pizzas`, `PUT /api/admin/pizzas/:id`, `DELETE /api/admin/pizzas/:id` | Manage pizzas (ADMIN role) — body: `{ name, description?, imageUrl?, categoryId, isAvailable?, prices:[{sizeId,price}] }` |
| `POST /api/admin/toppings`, `PUT /api/admin/toppings/:id`, `DELETE /api/admin/toppings/:id` | Manage toppings (ADMIN role) |

Validation errors come back as `400 { message, errors:[{ field, message }] }`.

## Tests

```bash
npm test
```

Server tests run the migrations and seeds on an in-memory SQLite database, start the API on a random port and exercise it end to end: menu, pricing (tax, delivery fee, free-delivery threshold), validation, order placement and tracking, customer re-use, login, authorization, status transitions, stats and menu management. Client tests cover the local (no database) mode with the same scenarios.

## Going live

- Set `NODE_ENV=production`, a strong `JWT_SECRET`, and `CORS_ORIGIN` to your site's address.
- Run `npm run build` once, then keep `npm start` running (for example with [pm2](https://pm2.keymetrics.io/): `pm2 start server/src/index.js --name pizza-shop`).
- Put a reverse proxy (nginx, Caddy, IIS) in front of port 5000 for HTTPS.
- Change the admin password: log in, then call `POST /api/auth/change-password` with the token, or re-seed a fresh database with new `ADMIN_*` values.

## Troubleshooting

| Message | Fix |
| --- | --- |
| `Cannot connect to the database … ECONNREFUSED` | MySQL is not running or `DB_HOST`/`DB_PORT` are wrong |
| `ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER` / `DB_PASSWORD` |
| `ER_BAD_DB_ERROR` / `Database tables are missing` | Run `npm run db:setup` |
| `Could not create the database` | The MySQL user lacks `CREATE DATABASE`; create it manually, then `npm run db:migrate && npm run db:seed` |
| Website shows the JSON message "Pizza shop API is running…" | Run `npm run build` first (or use `npm run dev`) |
| Yellow **Local mode** bar on the site | The server has no database connection: check `server/.env`, that MySQL is running, and run `npm run db:setup`; then restart the server |
| `npm install` warns about `better-sqlite3` | Optional; only needed for the SQLite demo mode and tests. MySQL mode is unaffected |
