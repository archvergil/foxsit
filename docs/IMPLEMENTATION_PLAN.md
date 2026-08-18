# Implementation plan

Last updated: 2026-08-18

Status legend: `[x]` complete, `[~]` in progress, `[ ]` pending, `[!]` blocked by an external input.

## Phase 0 — Audit and decisions

- [x] Inspect the complete initial workspace and verify Git/tooling baseline.
- [x] Search for a ZIP, extracted legacy project and `.reference/` tree.
- [x] Record that no legacy source is currently present; no extraction is possible.
- [x] Create `REFERENCE_AUDIT.md` with reuse, rejection and deferred-audit rules.
- [x] Confirm required stack and choose an email/password Supabase Auth foundation.
- [x] Record architecture, database and visual decisions.
- [x] Identify the supplied fox icon as the only reusable asset and preserve its source.
- [x] Verify that no legacy secret or environment file exists in the workspace.

Exit: complete. The missing legacy is a documented input limitation, not a blocker for the clean foundation.

## Phase 1 — Foundation

- [x] Scaffold React + TypeScript + Vite with strict settings and `@/` aliases.
- [x] Pin an official portable Node.js LTS runtime and add verified bootstrap/wrapper scripts.
- [x] Configure ESLint, Vitest, Testing Library and Playwright.
- [x] Configure Supabase client with explicit missing-configuration behavior.
- [x] Configure TanStack Query and React Router with feature-level lazy loading.
- [x] Create a responsive shell: desktop sidebar, tablet rail and mobile capsule navigation.
- [x] Create light/dark/system tokens with an inline no-flash theme bootstrap.
- [x] Implement accessible button, field, loading, configuration, offline and update feedback.
- [x] Implement email/password sign-in, sign-up, recovery, AuthGuard and sign-out.
- [x] Create the profile bootstrap migration with RLS and an `auth.users` trigger.
- [x] Configure PWA manifest, app-shell precache and safe SPA fallback.
- [x] Add GitHub Actions quality workflow.
- [x] Validate public responsive screenshots and direct-route SPA/AuthGuard refresh locally.
- [x] Validate a production deployment against a real Supabase project and Cloudflare Worker.

Exit criteria: login and authenticated shell work at 390 px, 768 px and 1280+ px; refresh on internal routes succeeds; lint, typecheck, unit tests and build pass.

## Phase 2 — Database and domain contracts

- [x] Add the first reproducible migration for `profiles`.
- [x] Add normalized migrations for Calendar, Tasks, Focus, Habits and Workout, including active sessions, exercise snapshots and sets.
- [x] Add RLS policies, ownership-safe FKs/indexes and cross-user verification for every currently exposed user table.
- [x] Generate `database.generated.ts` from the production Supabase project after migrations are applied.
- [x] Create feature repositories, query hooks and Zod schemas for the implemented production slices.
- [x] Implement and validate the transactional `finish_workout_session` RPC.
- [ ] Add deterministic seed/reference imports without user mock data.
- [x] Add PGlite in-memory tests and a persistent local PostgreSQL-compatible server.
- [x] Add project-scoped Supabase CLI commands for the Docker fidelity tier.
- [x] Add a loopback-only PGlite account/data API for end-to-end local development without Docker.

Exit: local database is reproducible and no exposed table is open across users.

## Phase 3 — Tasks and Focus

- [x] Projects, Inbox, Today, Upcoming and Completed queries with project create, rename and delete management.
- [x] Task CRUD, checklist, optimistic completion/reordering with rollback and durable manual ordering.
- [x] Persisted timestamp-based Pomodoro store and mini player.
- [x] Durable focus session history and task integration.
- [~] Unit, component and E2E coverage for the daily flow (unit/component and local authenticated E2E complete; Supabase E2E pending).

## Phase 4 — Calendar

- [x] Month, week and day views.
- [x] Event CRUD with temporal/all-day validation.
- [x] Profile-timezone conversions and local-day helpers for month and week slices.
- [x] Derived task overlays without duplicated calendar rows.
- [x] Mobile agenda, deterministic week overlap layout and month/week date edge-case tests.

## Phase 5 — Habits

- [!] Audit/port legacy algorithms if the reference source becomes available.
- [x] Habit CRUD, daily/weekday schedules, count targets, skipped reasons, Today logs, archived management and durable accessible ordering.
- [x] Tested daily history, current/longest streaks, weekly/monthly progress, 12-week heatmap and factual insights.
- [x] Read-only Calendar adapter and ownership-safe Workout link contract.

## Phase 6 — Workout

- [!] Import and validate the legacy exercise catalog when supplied.
- [!] Confirm rights and credentials before migrating any legacy GIF.
- [x] Routine builder and normalized persistence in production Supabase.
- [x] Supabase-backed active workout with durable sets, timestamp-based rest timer and reload recovery.
- [x] Transactional finish, completed history, volume, estimated 1RM and PRs.
- [ ] Workout ↔ habit and calendar adapters.

## Phase 7 — Today integrations

- [~] Replace foundation states with real aggregated queries (Today Tasks card complete).
- [ ] Next event, agenda, tasks, habits, workout and current focus state.
- [ ] Derived daily metrics with real loading/empty/error/success states.

## Phase 8 — Rewards

- [ ] Add the versioned reward-rule configuration, wallet, monthly counters, immutable ledger and redemption migrations with RLS.
- [ ] Extend durable Focus runs and Workout sessions with the facts needed to award eligible activity exactly once.
- [ ] Add transactional reward, conversion and redemption RPCs with profile-timezone monthly limits and idempotency constraints.
- [ ] Build the responsive Rewards area: balances, monthly progress, conversions, ledger and both credit stores.
- [ ] Cover the economy with unit, database/RLS, component and authenticated E2E tests.

Exit: all balances are durable and auditable; monthly caps, conversions and duplicate-reward prevention are proven under the local data boundary.

## Phase 9 — Release

- [x] Standardize segmented navigation controls across Calendar, Habits, Focus and Workout with the production visual system.
- [x] Redesign the Calendar month workspace with a compact grid, functional event search and real color/category/description-tag filters.
- [ ] Full visual and accessibility audit.
- [ ] Performance, lazy-loading and reduced-connection checks.
- [ ] PWA install/update/offline verification.
- [ ] Supabase Security/Performance Advisor review.
- [ ] Complete E2E suite and production documentation.
- [ ] Remove foundation milestone copy and all temporary routes/states.

## Next vertical slice

Continue Phase 6 with ownership-safe Workout → Habit completion and read-only Calendar adapters, then expose the scheduled/active workout on Today. New slices target production Supabase and the Cloudflare Worker directly; the historical local backend is not extended. Keep the missing legacy catalog and authorized GIF source as an explicit audit limitation; do not fabricate those assets.

## Latest verification

Completed the compact Calendar month workspace slice on 2026-08-18:

- replaced the oversized month composition with a full-width, low-radius calendar grid and restrained controls;
- added production-backed event search plus Color, Category and `#tag`-in-description filters without introducing local event state or new database fields;
- focused Calendar tests passed, including event creation, filtering, editing and deletion.

Completed the segmented-control visual slice on 2026-08-18:

- replaced the duplicated Calendar, Habits, Focus and Workout switch styling with the shared dark-rail/light-active segmented control;
- preserved native route links, button states, visible focus treatment, reduced-motion handling and 44 px touch targets;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (113/113) and `npm run build` passed.

Completed the production Workout completion/history slice on 2026-08-18:

- `npm run lint`: passed with zero warnings;
- `npm run typecheck`: passed under TypeScript 6 strict mode;
- `npm run test -- --run`: 113/113 unit, component and existing regression tests passed;
- `npm run build`: passed, PWA/service worker generated and no chunk exceeded the warning threshold;
- production Supabase: migration `202608180008` applied and recorded; transactional completion, immutable finished sessions, server-calculated metrics and strict previous-best PR detection were validated inside a rolled-back production transaction;
- production Cloudflare Worker: deployment remains Git-driven from `main`.
