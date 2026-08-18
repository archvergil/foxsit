# Testing

## Layers

- Vitest: pure dates, streaks, timer calculations, workout metrics, environment validation and other domain rules.
- React Testing Library: forms, feedback states, optimistic rollback and reload restoration.
- Playwright: critical authenticated flows and responsive navigation.
- PGlite integration tests: production migrations, local account/session API, constraints, triggers, local dates and cross-user RLS checks.
- Supabase verification scripts: RLS cross-user isolation and transactional RPC behavior.

## Current coverage

The suite covers backend selection, environment validation, theme preference parsing, auth form validation, task schemas/status/filtering, timezone-aware local-day/deadline conversion and pure Pomodoro timestamp calculations. Calendar tests cover month/week/day boundaries, profile week starts, invalid DST wall times, overnight splitting, deterministic overlap columns, temporal/all-day database constraints and own-row RLS. Habits tests cover daily/weekday recurrence, count transitions, skipped reasons, daily history states, archived activity windows, current/longest streaks, profile-week/month rates, schema constraints and owner isolation. Component tests exercise Calendar CRUD plus the durable Habits Today and Insights lifecycles alongside the Tasks workflows. Database/API tests create isolated local accounts, persist Calendar events, projects/tasks/checklists, Focus sessions and habits/logs, verify the archive timestamp trigger and browser CORS write methods, reject stale/duplicate/cross-user links and enforce session-level RLS isolation.

The Focus unit matrix verifies pause accumulation, reload restoration from persisted timestamps, short/long-break cycling, completion/interruption records, the zero-time pause edge and profile-timezone/task statistics. The authenticated browser matrix covers both 390 px mobile and desktop layouts.

Run on Windows without global Node:

```powershell
.\scripts\npm.cmd run test -- --run
.\scripts\npm.cmd run test:db
.\scripts\npm.cmd run test:e2e:local
.\scripts\npm.cmd run test:coverage
```

## E2E setup

Install the Playwright Chromium binary once:

```powershell
.\scripts\npm.cmd exec playwright install chromium
```

Public production-build smoke tests require no credentials. `test:e2e:local` creates disposable local accounts on mobile and desktop, covers Calendar month/week/day CRUD, direct-route reload and task overlays, project create/rename, full task details, checklist restoration and task ordering after reload, then exercises a linked Focus timer and the Habits count/skip-reason/Insights/archive/restore flow across reloads. Every test account is removed afterward. Supabase-fidelity E2E still requires a dedicated local stack or isolated test project; do not embed credentials in code or commit `.env` files.

See `LOCAL_DEVELOPMENT.md` for the persistent PGlite socket server and the full local Supabase tier. PGlite passing is fast evidence, not a substitute for the Supabase boundary check.

## Required domain matrix

As features land, add tests for local-day conversion around midnight/DST, event ranges, habit scheduling/count/streaks, timestamp-based timer restoration, workout volume, 1RM, PR detection and previous-set lookup. The master prompt's eight E2E flows become release gates in Phase 8.

## Viewports

Component and E2E review targets are 390 px mobile, 768 px tablet/rail and 1280+ px desktop. Test light/dark plus keyboard focus and reduced motion.
