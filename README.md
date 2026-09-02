# MitraHR — Sprint 0

Project scaffolding + login/auth + an empty app shell. This is the foundation everything else builds on.

## Stack (Sprint 0)

- **Backend:** NestJS + TypeScript, Prisma ORM, JWT auth
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Database:** SQLite for now (zero install, a single file) — the plan calls for PostgreSQL via Docker long-term, but Docker isn't installed on this machine yet. Switching later is a small, well-defined change (swap the Prisma `provider` and `DATABASE_URL`, re-run migrations) — not a rewrite.

## One-time setup

From the `MitraHR` folder:

```bash
npm install
```

This installs both the API and the web app in one go (npm workspaces).

### Backend

```bash
cd apps/api
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
```

This creates the local database file and seeds one admin login:

- **Email:** `admin@mitrahr.local`
- **Password:** `ChangeMe123!`

(Change this password once you're logged in — Sprint 0 doesn't have a "change password" screen yet; that's a fast follow.)

### Frontend

```bash
cd apps/web
```

No extra setup needed — it already points at `http://localhost:4000` for the API by default.

## Running it

Open two terminal tabs:

```bash
# Terminal 1
cd apps/api && npm run dev
```

```bash
# Terminal 2
cd apps/web && npm run dev
```

Then open **http://localhost:5173** and log in with the admin credentials above.

## What "done" looks like for Sprint 0

- [ ] You can log in with the seeded admin account
- [ ] After login you land on a blank MitraHR dashboard shell showing your name and role
- [ ] Logging out returns you to the login screen
- [ ] Refreshing the dashboard page keeps you logged in (session persists)

Once you've confirmed all four, Sprint 0 is signed off and we move to Sprint 1 (Employee Management).
