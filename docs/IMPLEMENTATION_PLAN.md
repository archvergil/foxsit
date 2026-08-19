# Implementation plan

Last updated: 2026-08-19

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
- [x] Add ownership-safe nested task projects and customizable faded GIF banners in production.
- [x] Task CRUD, checklist, optimistic completion/reordering with rollback and durable manual ordering.
- [x] Persisted timestamp-based Pomodoro store and mini player.
- [x] Durable focus session history and task integration.
- [~] Unit, component and E2E coverage for the daily flow (unit/component complete; authenticated E2E needs the loopback Workout/Rewards repository gap and stale Habits assertions resolved before deployed Supabase E2E).

## Phase 4 — Calendar

- [x] Month, week and day views.
- [x] Event CRUD with temporal/all-day validation.
- [x] Profile-timezone conversions and local-day helpers for month and week slices.
- [x] Derived task overlays without duplicated calendar rows.
- [x] Mobile agenda, deterministic week overlap layout and month/week date edge-case tests.
- [x] Add compact mobile item markers with overflow indication and profile-synced Event, Task and Habit visibility preferences across every Calendar view.

## Phase 5 — Habits

- [!] Audit/port legacy algorithms if the reference source becomes available.
- [x] Habit CRUD, daily/weekday schedules, count targets, skipped reasons, Today logs, archived management and durable accessible ordering.
- [x] Tested daily history, current/longest streaks, weekly/monthly progress, 12-week heatmap and factual insights.
- [x] Read-only Calendar adapter and ownership-safe Workout link contract.
- [x] Rework the Habit workspace into compact routine rows and a responsive visual editor with icon, palette and custom-color selection in production.
- [x] Add first-class Habit projects with project assignment, visual icons and customizable faded GIF banners in production.
- [x] Add an explicit clear-history-only choice to Habit deletion and keep the habit itself intact.
- [x] Make Habit project banners keyboard-accessible collapse controls on mobile and desktop.

## Phase 6 — Workout

- [!] Import and validate the legacy exercise catalog when supplied.
- [!] Confirm rights and credentials before migrating any legacy GIF.
- [x] Routine builder and normalized persistence in production Supabase.
- [x] Add per-routine faded GIF banners with original-color/monochrome selection in production.
- [x] Supabase-backed active workout with durable sets, timestamp-based rest timer and reload recovery.
- [x] Transactional finish, completed history, volume, estimated 1RM and PRs.
- [x] Add mobile-first collapsible exercise entry, active-session routine artwork and cascading set drafts that persist only through explicit set completion.
- [x] Add owner-only completed-session deletion with a confirmed destructive action and cascading history cleanup.
- [ ] Workout ↔ habit and calendar adapters.

## Phase 7 — Today integrations

- [x] Replace foundation states with real aggregated queries.
- [x] Next event, agenda, tasks, habits, workout and current focus state.
- [x] Derived daily metrics with real loading/empty/error/success states.
- [x] Add supplied monochrome Habit, Focus and Workout GIF artwork to the Today overview cards and explicit PWA precache entries.

## Phase 8 — Rewards

- [x] Add the versioned reward-rule configuration, wallet, monthly counters, immutable ledger and redemption migrations with RLS.
- [x] Extend durable Focus runs and Workout sessions with the facts needed to award eligible activity exactly once.
- [x] Add transactional reward, conversion and redemption RPCs with profile-timezone monthly limits and idempotency constraints.
- [x] Add a transactional 10 Silver + 2 Gold daily Habit award with exact reversal and safe re-award after an accidental undo.
- [x] Build the responsive Rewards area: balances, monthly progress, conversions, ledger and both credit stores.
- [~] Cover the economy with unit, database/RLS, component and authenticated E2E tests; migration `202608180011` is applied and deployed authenticated E2E remains pending.

Product override confirmed on 2026-08-18: every BRL credit keeps its nominal value, while its Silver or Gold redemption cost is 40% higher than the original master table. Fractional Silver results round up so no SKU is charged below the requested increase; this pricing lives in the versioned server rule set and is mirrored by tested display constants only.

Exit: all balances are durable and auditable; monthly caps, conversions and duplicate-reward prevention are proven under the local data boundary.

## Phase 9 — Release

- [x] Standardize segmented navigation controls across Calendar, Habits, Focus and Workout with an elastic active-indicator transition and the compact production radius system.
- [x] Redesign the Calendar month workspace with a compact grid, functional event search and real color/category/description-tag filters.
- [x] Add an elastic active indicator to the mobile primary navigation and keep Calendar filter popovers anchored to their controls.
- [ ] Full visual and accessibility audit.
- [ ] Performance, lazy-loading and reduced-connection checks.
- [ ] PWA install/update/offline verification.
- [ ] Supabase Security/Performance Advisor review.
- [ ] Complete E2E suite and production documentation.
- [ ] Remove foundation milestone copy and all temporary routes/states.

## Next vertical slice

Apply migrations `202608180012`, `202608190001` and `202608190002`; verify Habit award/reversal, Workout history deletion, Calendar preferences, rewarded Focus runs, strength/cardio completion, conversions and credit requests through authenticated deployed E2E, then continue the release audit. Migrations through `202608180011` are recorded as applied; the three listed migrations remain pending production application.

## Latest verification

Completed the responsive Workout, Calendar and navigation interaction slice on 2026-08-19:

- made Add exercise compact and collapsed by default on mobile, carried routine artwork into the Slate active-workout banner and cascaded KG/Reps/RIR drafts through subsequent incomplete sets;
- added confirmed, owner-only deletion of completed Workout sessions through migration `202608190001`, with component and database regressions;
- made Habit project banners collapsible, added capped mobile Calendar markers with overflow indication and persisted Calendar content preferences through migration `202608190002`;
- fixed mobile Calendar filter anchoring, added the sliding bottom-navigation indicator and used the three supplied grayscale GIFs on Today overview cards;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (140/140), `npm run test:db` (34/34) and `npm run build` passed;
- browser visual QA was unavailable because no integrated or extension browser was connected in this session.

Completed the product-polish and daily Habit reward slice on 2026-08-18:

- named the product Foxsit across the shell, PWA manifest, document title and product documentation;
- bounded Training blocks with internal scrolling, stopped the Workout hero and form actions from stretching, and kept icon-label buttons horizontal;
- made confirmation dialogs await durable writes before closing, fixed routine deletion navigation and added a regression test;
- added a clear-history-only Habit deletion choice plus the local and Supabase repository contracts;
- added migration `202608180012` for Slate data/default normalization and the reversible 10 Silver + 2 Gold all-Habits daily award; the pending daily amount is protected from spending so reversal never creates a negative balance;
- reduced Calendar Habit-chip height and refined the Rewards conversion summary;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (135/135), `npm run test:db` (31/31) and `npm run build` passed;
- migration `202608180012` still requires production application.

Completed the shared interaction correction on 2026-08-18:

- preserved the elastic segmented-control transition across the route remounts used by Calendar and Habits, matching Focus and Workout;
- fixed every shared icon-and-label button so icons stay to the left of non-wrapping labels;
- replaced native confirmations with the animated, accessible Radix alert dialog for destructive Calendar, Task, Habit and Workout actions;
- removed Workout routine color selection and standardized every routine banner surface on Slate;
- recorded that production migration `202608180011` is applied; authenticated deployed Rewards E2E remains pending.
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (133/133), `npm run test:db` (30/30) and `npm run build` passed;
- the local Playwright runner now receives its loopback URL explicitly, but its existing suite remains red because Today has no loopback Workout repository and several Habits assertions target the pre-redesign UI.

Implemented the Rewards economy on 2026-08-18:

- added versioned rules, private wallets, monthly counters, immutable ledger and frozen credit requests in migration `202608180011`;
- applied the confirmed pricing override: BRL credit values remain unchanged while every Silver/Gold cost is 40% higher, with fractional Silver results rounded up;
- added exact-once Focus-run and Workout awards, predominant-mode caps, five shared monthly conversions, authoritative catalog redemptions and RLS-protected RPCs;
- added the responsive `/rewards` workspace with balances, monthly progress, confirmations, both stores, request statuses and incremental ledger history;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (131/131), `npm run test:db` (30/30) and `npm run build` passed; migration `202608180011` is applied and authenticated deployed E2E remains pending.

Completed the Today integration slice on 2026-08-18:

- replaced the foundation copy with real aggregated Calendar, Tasks, Habits, Focus and Workout queries;
- added next-event, agenda, active Pomodoro/workout status and profile-timezone daily metrics with explicit loading, empty and retry states;
- kept the dashboard read-only and derived, without duplicating module data;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (125/125), `npm run test:db` (25/25) and `npm run build` passed.

Implemented the visual collection architecture on 2026-08-18:

- moved the supplied GIF library into the Vite public asset tree and strictly separated `workout_*` from `habits_*` choices;
- added reusable faded banner rendering plus original-color/monochrome selection;
- added per-routine Workout banners, first-class Habit projects and nested Task projects with ownership-safe Supabase contracts and RLS;
- added migration `202608180010_visual_collections.sql`; it was subsequently applied to production.
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (124/124), `npm run test:db` (25/25) and `npm run build` passed.

Completed the Habit workspace visual rework on 2026-08-18:

- replaced oversized habit cards with compact, responsive routine rows and a low-radius workspace header, toolbar and progress summary;
- replaced text-only icon/color selects with visual icon tiles, palette swatches, live preview and validated custom hexadecimal color input;
- added migration `202608180009_habit_custom_colors.sql` and Calendar rendering support for custom habit colors;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (116/116) and `npm run build` passed;
- the first application attempt timed out at the linked pooler; migration `202608180009` was subsequently applied to production.

Completed the interaction and global radius correction on 2026-08-18:

- added a dedicated active indicator that slides elastically between every two- and three-option segmented control;
- normalized the application radius tokens and remaining oversized hard-coded radii to the compact Calendar standard, while retaining functional circles;
- `npm run lint`, `npm run typecheck`, `npm run test -- --run` (115/115) and `npm run build` passed.

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
