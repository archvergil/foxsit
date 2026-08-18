# APP_NAME

A personal productivity PWA for Today, Calendar, Tasks, Focus, Habits and Workout. The product uses React, TypeScript, Vite and Supabase and targets Cloudflare Pages.

The final product name is intentionally unresolved. `APP_NAME` is centralized in `src/config/product.ts` and must remain the placeholder until the owner chooses a name.

## Current phase

Phase 0 and the Phase 1 foundation are complete. The Phase 3 Tasks/Focus flow and Phase 4 Calendar are complete at the local boundary. Phase 5 Habits now has durable CRUD/archive, daily or weekday schedules, count targets, skip reasons, timezone-aware Today logs, daily history, streaks, weekly/monthly rates and a 12-week heatmap. Habit ordering/integrations and Workout remain the next feature work rather than displaying mock user data.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for progress and acceptance criteria.

## Local database without deployment

For fast development, the project includes a persistent PGlite PostgreSQL server plus a loopback account/data API. This enables real local sign-up, sign-in, Calendar, Tasks, Focus history and Habits progress without Docker:

```powershell
.\scripts\npm.cmd run dev:local
.\scripts\npm.cmd run test:db
.\scripts\npm.cmd run test:e2e:local
```

Open `http://localhost:5173` and create an account. PGlite applies the same versioned migrations; the project-scoped Supabase CLI remains available for full Auth/PostgREST/Storage fidelity once Docker is running. See [local development](docs/LOCAL_DEVELOPMENT.md).

## Local setup on Windows

This workspace contains an ignored, portable Node.js LTS runtime under `.tools/node`. No global Node installation is required.

```powershell
.\scripts\node.cmd --version
.\scripts\npm.cmd install
Copy-Item .env.example .env.local
.\scripts\npm.cmd run dev
```

If `.tools/node` is absent, restore the pinned official binary and verify its checksum:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap-node.ps1
```

On macOS/Linux or a machine with Node installed, use Node `24.18.1` and standard `npm` commands.

## Environment

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_LOCAL_BACKEND_URL
VITE_APP_ENV
```

Never expose a Supabase service-role key through `VITE_*` variables. Copy `.env.example` to `.env.local` and use a publishable/anon key; RLS is the authorization boundary.

## Quality commands

```powershell
.\scripts\npm.cmd run lint
.\scripts\npm.cmd run typecheck
.\scripts\npm.cmd run test -- --run
.\scripts\npm.cmd run test:db
.\scripts\npm.cmd run build
```

## Deployment

Cloudflare Pages builds `dist` with `npm run build`. The SPA fallback lives in `public/_redirects`. Full setup is documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
