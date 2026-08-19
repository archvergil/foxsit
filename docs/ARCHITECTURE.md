# Architecture

## Shape

The app is a static React SPA deployed from GitHub to Cloudflare Pages. Supabase supplies authentication, Postgres and Storage. The browser never receives a service-role key.

```text
React route
  -> feature page/component
  -> feature hook (TanStack Query)
  -> feature repository
  -> Supabase JS (production) or loopback adapter (development only)
  -> PostgreSQL protected by RLS
```

Visual components do not query Supabase. Query keys, repositories, mutations, Zod schemas and domain helpers live within each feature. Cross-feature projections such as Today and Calendar consume normalized view models; they do not duplicate source rows.

Calendar, Tasks, Focus and Habits follow this boundary end to end: pages consume TanStack Query hooks, those hooks receive typed repositories through context, and only the Supabase or explicit development adapter performs remote reads/writes. Profile preferences use the same repository boundary. Task completion, Habit progress and Calendar event moves update every relevant cached view optimistically, snapshot previous values, restore them on failure and reconcile with durable server state in the background. Mutations stop blocking as soon as the durable write returns; cache revalidation does not extend visible button-pending states.

Calendar stores only authored events. Month, week and day view models project scheduled/deadline Tasks and scheduled Habits at read time, while pure helpers build profile-week ranges, split overnight events into local-day segments and assign deterministic columns to overlap groups. The Habit adapter respects the profile timezone, creation/archive window and daily logs, and produces read-only items that link back to Habits without copying rows into `calendar_events`. Timed coordinates use local wall-clock minutes for display, while durable values remain UTC `timestamptz`. The mobile Day view preserves the time-column grid with an internally scrolling schedule; the mobile Week view uses a selected-day agenda to avoid unusably narrow seven-column content.

Tasks uses a responsive master-detail composition rather than a modal: lists remain the source context while a detail panel edits title, notes, project, priority, local scheduled date, timestamped deadline, focus estimate and checklist. Project deletion durably detaches its tasks into Inbox. Checklist completion uses the same optimistic snapshot/rollback rule as task completion; creates, edits and deletes keep their forms/panels open until persistence confirms success.

Manual task ordering uses pointer drag-and-drop, the drag library's keyboard sensor and explicit 44 px move buttons. The client optimistically updates every cached task list, snapshots and restores those lists on error, then reconciles with the server. Persistence sends the complete open-task sequence to one transactional RPC; partial, duplicate and cross-user orders are rejected rather than leaving fractional updates.

Habits keeps recurrence, count/status transitions, streaks, history states and completion-rate calculations in pure helpers. Today derives its profile-timezone local date, shows only habits scheduled for that date and writes absolute daily progress through the repository. Active-habit ordering is persisted atomically through a complete-set RPC; drag, keyboard and explicit move controls share the same optimistic update with snapshot rollback. Insights loads the real log range, excludes pre-creation/post-archive dates and derives current/longest streaks, current profile-week/month rates, 12-week consistency and daily history without generated claims. A skipped log remains distinct from completion and may carry a reason; editors and archive/restore actions only close or change state after durable persistence succeeds.

Workout → Habit contract: a completed workout may upsert one linked habit's local-day log with `source = 'workout'` and `source_id = workout_session.id`, using the workout completion transaction and the profile timezone. Replaying the same completion must be idempotent and set the linked habit to its completed target without decrementing manual progress. Workout sessions now exist, but the UI exposes no synthetic link action until the next migration validates ownership of both records and extends the completion transaction.

## State ownership

- TanStack Query: profiles, Calendar events, projects/tasks, durable focus history, habits/logs, workout routines and the active workout session stored in Supabase.
- Zustand persist: active Pomodoro timestamps, the transient workout rest countdown and small local UI state that must survive reload. Workout sets and session progress never live only in Zustand.
- React component state: transient field, dialog and navigation state.
- `localStorage`: immediate theme preference until profile synchronization is introduced.

The Pomodoro store persists phase, owner, start/pause timestamps, accumulated pause duration, configured durations, optional task and cycle index. Remaining time is always derived from timestamps; it never decrements persisted state each second. Completion/stop writes one durable session through TanStack Query, and the phase is not cleared or advanced until that write succeeds. No remote table is mirrored wholesale into Zustand.

## Local development boundary

PGlite runs the production SQL migrations in PostgreSQL/WASM for fast tests and exposes a persistent local PostgreSQL socket on `127.0.0.1:55432`. A compatibility bootstrap supplies `auth.users`, `auth.uid()`, local roles and local-only credential/session tables.

A thin HTTP server on `127.0.0.1:8787` lets the development build create real local accounts and exercise Profile, Calendar, Tasks, Focus and Habits repositories. It is not a production backend and deliberately does not imitate email, PostgREST, Storage or Realtime. The official Supabase local stack remains the fidelity boundary for those platform contracts. Details live in `docs/LOCAL_DEVELOPMENT.md`.

## Routing and loading

The browser router uses feature-level lazy imports centralized in `routeModules.ts`. Navigation intent preloads the destination chunk on focus, hover or pointer-down, and the authenticated shell warms remaining feature chunks after the initial route settles. Public auth routes and the protected app shell share an auth provider that resolves either a persisted Supabase session or an explicitly configured local development session before rendering redirects. `public/_redirects` gives Cloudflare Pages an SPA fallback for direct internal-route refreshes.

TanStack Query keeps successful server data fresh for two minutes and inactive data for thirty minutes, so normal tab changes reuse rendered information instead of flashing loading states. Calendar range transitions retain the prior grid while the next range loads. A two-pixel shell activity indicator distinguishes background refresh from saving without blocking navigation; feature-level errors and mutation rollback remain the authoritative failure feedback.

## Configuration boundary

`src/config/backend.ts` selects the loopback adapter only in development and otherwise requires validated public Supabase settings. A missing environment produces a visible setup state and disabled auth submission; the app does not create a client with placeholder credentials or claim an authentication write succeeded.

## Offline and PWA boundary

The service worker precaches static app assets and may cache only the immutable exercise-catalog path. Private Supabase responses are deliberately excluded from service-worker runtime caching. Only timer timestamps persist locally; active workout progress is recovered from Supabase, and server-required mutations remain visibly pending or fail honestly.

## Time model

- Instants and durations use `timestamptz` in UTC.
- Local-day concepts use Postgres `date` and explicit helpers rather than sliced ISO strings.
- Profile timezone is an IANA name detected at sign-up and stored on `profiles`.
- Week start is an integer profile preference, defaulting to Monday (`1`).
- Task deadline inputs are interpreted in the profile IANA timezone and round-tripped before conversion to UTC; nonexistent DST wall-clock times are rejected instead of silently shifted.
- Calendar timed-event inputs follow the same round-trip rule. All-day ranges remain inclusive local dates, while timestamp ranges use an exclusive end so midnight and overlap queries stay unambiguous.
- Habit schedules and logs use profile-local `date` keys. `archived_at` remains an instant and is converted through the profile timezone before it bounds historical rates.

## Security boundary

Every user-owned exposed table must contain a user identity or use the authenticated profile ID as its primary key, enable RLS, and grant only explicit own-row access. Profile, Calendar, Tasks, Focus and Habits migrations implement that contract and have cross-user isolation coverage. Future feature migrations must add the same verification before their phase exits.

## Decisions

- [ADR 0001](adr/0001-portable-node-toolchain.md): portable, pinned Node toolchain.
- [ADR 0002](adr/0002-auth-and-client-boundary.md): email/password auth and configuration behavior.
- [ADR 0003](adr/0003-icon-led-visual-identity.md): fox-led visual identity without inventing a product name.
- [ADR 0004](adr/0004-local-database-testing.md): two-tier PGlite and Supabase local testing.
- [ADR 0005](adr/0005-loopback-local-backend.md): development-only accounts and data through the loopback PGlite adapter.
