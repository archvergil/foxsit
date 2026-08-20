# Local development

The app can be exercised end to end without Docker or a remote deployment. The lightweight local tier uses PGlite, a PostgreSQL/WASM database, rather than SQLite so the production migrations, data types, constraints and RLS policies stay valid.

## One-command local workspace

`.env.local` selects the loopback-only development adapter:

```text
VITE_LOCAL_BACKEND_URL=http://127.0.0.1:8787
```

Start the database, local account/data API and Vite together:

```powershell
.\scripts\npm.cmd run dev:local
```

Open:

```text
App:      http://localhost:5173
Local API: http://127.0.0.1:8787
Database:  127.0.0.1:55432
```

Create an account through `/signup`. The account, hashed password, session, profile, Calendar events, Tasks, Focus history, Habit projects, habits, archive boundaries and daily habit logs persist under `.local-data/pglite` across browser and server restarts. Habit project assignment, custom colors and banner choices use the same production columns. Habit Insights is derived from those local rows rather than seeded metrics. The active Pomodoro itself is timestamp-based local UI state, so it also survives a page reload without writing to the database every second. The interface labels the session as `Local data` so it cannot be confused with Supabase production data.

Local passwords are hashed with Node scrypt using a per-account random salt. Session tokens are random, stored hashed in the local database and accepted only by an HTTP server bound to `127.0.0.1`. This is still development infrastructure: do not reuse an important password.

## Separate services

The database command starts both the PostgreSQL socket and loopback API:

```powershell
.\scripts\npm.cmd run db:local
.\scripts\npm.cmd run dev
```

Connection details for database tools:

```text
Host: 127.0.0.1
Port: 55432
Database: postgres
User: postgres
URL: postgresql://postgres:postgres@127.0.0.1:55432/postgres
Data directory: .local-data/pglite
```

At startup, every versioned file from `supabase/migrations/` is applied in filename order. Migration checksums are recorded in `local_migration_history`; startup refuses an edited migration that was already applied.

## Tests and reset

Run isolated in-memory database/API tests and the real browser account flow:

```powershell
.\scripts\npm.cmd run test:db
.\scripts\npm.cmd run test:e2e:local
```

Reset the local workspace database, including local accounts:

```powershell
.\scripts\npm.cmd run db:local:reset
```

Stop the running local database before resetting it. The reset script resolves and verifies the exact `.local-data/pglite` target before deletion. `.local-data/` and `.env.local` are ignored by Git.

## Deliberate limits

The thin local API implements the Auth/Profile/Calendar/Tasks/Focus/Habits contracts currently used by the app. It is not a Supabase emulator, its server code is never part of the browser bundle, and production mode cannot select the local client adapter. Email delivery/recovery, Storage, Realtime, PostgREST behavior and Supabase-managed grants still require the official stack. Local password recovery therefore returns an explicit unavailable message rather than pretending to send email.

## Full Supabase fidelity

The Supabase CLI is installed as a project dependency. After starting a Docker-compatible runtime:

```powershell
.\scripts\npm.cmd run supabase:start
.\scripts\npm.cmd run supabase:status
```

Remove `VITE_LOCAL_BACKEND_URL` from `.env.local`, add the API URL and publishable key printed by the CLI, and run `npm run dev`. Use this tier before production release because it covers the exact Auth/PostgREST/Storage platform boundary.

No local workflow requires pushing a branch or deploying Cloudflare/Supabase.
