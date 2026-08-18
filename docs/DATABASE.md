# Database

## Migration status

The repository uses ordered Supabase migrations rather than a loose SQL snapshot:

```text
supabase/migrations/202608140001_foundation_profiles.sql
supabase/migrations/202608170001_tasks_projects.sql
supabase/migrations/202608170002_focus_sessions.sql
supabase/migrations/202608170003_task_ordering.sql
supabase/migrations/202608170004_calendar_events.sql
supabase/migrations/202608170005_habits.sql
supabase/migrations/202608180001_habit_history.sql
supabase/migrations/202608180002_habit_ordering.sql
supabase/migrations/202608180003_backfill_existing_profiles.sql
supabase/migrations/202608180004_workout_routines.sql
supabase/migrations/202608180005_workout_active_sessions.sql
supabase/migrations/202608180006_workout_session_ownership.sql
supabase/migrations/202608180007_workout_session_integrity.sql
```

It creates `public.profiles`, strict theme/week/timezone checks, automatic `updated_at`, own-row RLS and an `auth.users` trigger. Sign-up metadata supplies `display_name` and the browser's IANA timezone; defaults remain safe if metadata is absent.

## Profile contract

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key and `auth.users(id)` FK with cascade delete |
| `display_name` | `text` | Nullable, 1–60 characters when present |
| `avatar_url` | `text` | Nullable; storage contract deferred |
| `timezone` | `text` | Required IANA string, defaults to `UTC` |
| `week_starts_on` | `smallint` | `0..6`, Monday is `1` |
| `theme` | `text` | `light`, `dark` or `system` |
| timestamps | `timestamptz` | Database-generated |

`profiles_select_own` and `profiles_update_own` use `(select auth.uid()) = id`. Insert happens through a `security definer` trigger with an empty search path; anonymous/authenticated roles cannot call that trigger function directly.

## Normalized schemas

The second migration adds normalized `task_projects`, `tasks` and `task_checklist_items`. Composite owner foreign keys prevent cross-user project/task or task/checklist relationships even if an identifier is guessed. Per-operation RLS covers select, insert, update and delete; indexes support project ordering, Today/status, Upcoming date ranges, deadline and checklist queries.

The third migration adds `focus_sessions`. A durable row stores `started_at`/`ended_at` as `timestamptz`, planned and effective seconds, phase type and completion state. The optional composite `(task_id, user_id)` foreign key rejects cross-user links and detaches on task deletion so history remains intact. Completed sessions must reach their planned duration; interrupted sessions retain only confirmed elapsed seconds. Own-row RLS and user/date/task indexes cover both history and statistics.

The fourth migration adds the `reorder_tasks(uuid[])` RPC. It accepts the authenticated user's complete open-task order, rejects empty, duplicate, stale or cross-user lists, and rewrites all positions atomically in one transaction. Filtered UI views merge their visible order back into the complete open-task sequence before calling the RPC, so hidden tasks retain their relative slots.

The fifth migration adds `calendar_events`. Timed events require an exclusive `start_at`/`end_at` range in `timestamptz`; all-day events require an inclusive `start_date`/`end_date` range and cannot also carry timestamps. Title, color and optional metadata constraints are enforced in PostgreSQL. Partial indexes support timed and all-day range queries, and per-operation own-row RLS protects every write and read. Tasks remain owned by `tasks` and are projected into Calendar queries rather than copied into this table.

The sixth migration adds `habits` and `habit_logs`. Habits enforce a supported Lucide icon, accent, daily or unique-weekday schedule, positive count target and stable position. One log per habit/local date stores absolute count progress or a distinct skipped state; a trigger verifies that only progress at the target is completed and progress below it remains in progress. Composite owner foreign keys, per-operation RLS and user/date indexes prevent cross-user links and support history ranges.

The seventh migration adds `habits.archived_at` and keeps it synchronized with `is_active`. Historical calculations stop at that durable profile-timezone boundary, so an archived habit does not accumulate false misses; restoring it clears the boundary without removing prior logs.

The eighth migration adds `reorder_habits(uuid[])`. It locks the user's active set, rejects empty, partial, duplicate, stale or inaccessible orders and rewrites stable positions in one transaction. Archived habits retain their historical position and are not accepted in the active ordering payload.

Workout routine planning is live through `workout_routines` and `workout_routine_exercises`. Active training uses `workout_sessions`, immutable exercise-plan snapshots in `workout_session_exercises` and planned/completed `workout_sets`. The `start_workout_session` RPC atomically creates the session, copies the owned routine and provisions its sets; a partial unique index permits only one active session per user. Composite foreign keys enforce both owner and session continuity, RLS provides four own-row policies per exposed table, direct deletes from session internals are revoked, and set mutations are rejected once a session is no longer active. Every set is durable in Supabase; Zustand stores only the timestamp-based rest countdown. Transactional completion and completed-session history remain pending.

## Types

`src/types/database.generated.ts` currently contains the reviewed Profile, Calendar, Tasks, task/habit-ordering RPCs, Focus and Habits contracts so the client is typed from day one. Once a Supabase project is linked, replace it using the CLI and review the diff:

```powershell
supabase gen types typescript --linked --schema public > src/types/database.generated.ts
```

## Apply locally

```powershell
supabase start
supabase db reset
```

The Supabase CLI is a pinned project dev dependency and runs through `npm run supabase:start`; it still requires a Docker-compatible runtime. For lightweight migration tests without Docker, use `npm run test:db` or the persistent PGlite server documented in `LOCAL_DEVELOPMENT.md`.
