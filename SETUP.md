# Setting up the pizza shop on a new machine

Step by step, from the ZIP file to a running shop on MySQL (Windows wording, the commands are the same on macOS/Linux).

## 1. Install the two prerequisites

1. **Node.js 20 LTS** from <https://nodejs.org>. The installer adds `node` and `npm`. Check in a new terminal:

   ```bash
   node -v
   ```

2. **MySQL Server 8** from <https://dev.mysql.com/downloads/installer/> (choose "Developer Default" to also get MySQL Workbench). During setup you choose a **root password** — write it down, you need it in step 4. Make sure the Windows service **MySQL80** is running (Services app). XAMPP's MariaDB also works; its root password is empty by default.

## 2. Get the project

1. Open <https://github.com/shivam10126/pizza-shop>, click the green **Code** button, then **Download ZIP**
   (or `git clone https://github.com/shivam10126/pizza-shop.git` if git is installed).
2. Extract it somewhere simple, for example `C:\projects\pizza-shop`. `package.json`, `client`, `server` and `shared` must be directly inside that folder, not inside a second `pizza-shop-main` folder.
3. Open a terminal in that folder (Shift + right-click the folder → "Open PowerShell window here"), or:

   ```bash
   cd C:\projects\pizza-shop
   ```

## 3. Install dependencies

One command installs both the server and the React client:

```bash
npm install
```

A warning about `better-sqlite3` is harmless; it is only used by the test suite.

## 4. Point the project at your MySQL

The ZIP does not contain `server\.env` (it is excluded on purpose because it holds passwords), so create it from the example:

```bash
Copy-Item server\.env.example server\.env
```

(macOS/Linux: `cp server/.env.example server/.env`)

Open `server\.env` in Notepad and set:

```
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=the-root-password-you-chose
DB_NAME=pizza_shop
JWT_SECRET=any-long-random-sentence-of-your-own
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-staff-password
```

Leave the shop settings (name, currency, tax, delivery fee) as they are or change them. You do not need to create anything in MySQL by hand.

## 5. Create the database, tables and sample data

```bash
npm run db:setup
```

This connects with the details above and, in order:

1. creates the `pizza_shop` database,
2. creates all 11 tables,
3. inserts the sample menu,
4. creates the staff user from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

You should see `Batch 1 run: 1 migrations`, `Seeded 4 categories ...` and `Created admin user`.
To check, open MySQL Workbench, refresh **Schemas**, and expand `pizza_shop` → **Tables**.
The reference DDL is in `server/docs/schema.sql` if you want to read it; you never run it yourself.

## 6. Build and start

```bash
npm run build
```

```bash
npm start
```

The terminal prints `Database connected (mysql2)`.

- Shop: <http://localhost:5000>
- Staff dashboard: <http://localhost:5000/admin/login> (the `ADMIN_*` login from your `.env`)

If you see a yellow **Local mode** bar, the database is not connected — see step 8.
For development with hot reload use `npm run dev` and open <http://localhost:5173> instead.

## 7. Day-to-day

| Task | How |
| --- | --- |
| Start the shop again later | open a terminal in the folder, `npm start` (MySQL must be running) |
| Change the sample menu before seeding | edit `shared/menu-seed.json`; staff can also edit the menu in the dashboard afterwards |
| Wipe everything and start over | `npm run db:reset` (drops all tables, recreates and reseeds) |
| Update to a newer ZIP / `git pull` | `npm install`, then `npm run db:migrate` (your data stays) |
| Change the staff password | log in, then call `POST /api/auth/change-password` (see README), or reset and reseed with new `ADMIN_*` values |

## 8. If something goes wrong

| Symptom | Fix |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL is not running or uses another port: start the MySQL80 service or fix `DB_PORT` |
| `ER_ACCESS_DENIED_ERROR` | wrong `DB_USER` / `DB_PASSWORD` in `server\.env` |
| `Could not create the database` | your MySQL user cannot create databases: create `pizza_shop` in Workbench, then `npm run db:migrate` and `npm run db:seed` |
| Yellow **Local mode** bar on the site | the server could not reach MySQL at startup: fix `.env`, start again |
| Port 5000 already in use | change `PORT` in `server\.env` |
| `npm` is not recognised | close and reopen the terminal after installing Node.js |
| Website shows only a JSON message | run `npm run build` first |
