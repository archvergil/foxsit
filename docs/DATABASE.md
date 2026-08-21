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
supabase/migrations/202608180008_workout_completion_history.sql
supabase/migrations/202608180009_habit_custom_colors.sql
supabase/migrations/202608180010_visual_collections.sql
supabase/migrations/202608180011_rewards.sql
supabase/migrations/202608180012_habit_daily_rewards_and_workout_defaults.sql
supabase/migrations/202608190001_workout_history_delete.sql
supabase/migrations/202608190002_calendar_display_preferences.sql
supabase/migrations/202608190003_profile_avatars.sql
supabase/migrations/202608190004_workout_routine_delete_and_banner_defaults.sql
supabase/migrations/202608190005_habit_icon_contract.sql
supabase/migrations/202608190006_reward_ledger_account_delete.sql
supabase/migrations/202608200001_focus_history_delete_and_active_exercise_rename.sql
supabase/migrations/202608210001_atomic_focus_reward_reconciliation.sql
supabase/migrations/202608210002_reconcile_abandoned_focus_rewards.sql
supabase/migrations/202608210003_convert_task_to_calendar_event.sql
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

The sixth migration adds `habits` and `habit_logs`. Habits enforce a bounded Lucide-compatible icon slug, accent, daily or unique-weekday schedule, positive count target and stable position. The editor retains a strict supported-icon enum, while stored unknown slugs render with a safe fallback so one stale row cannot break the whole list. One log per habit/local date stores absolute count progress or a distinct skipped state; a trigger verifies that only progress at the target is completed and progress below it remains in progress. Composite owner foreign keys, per-operation RLS and user/date indexes prevent cross-user links and support history ranges.

The seventh migration adds `habits.archived_at` and keeps it synchronized with `is_active`. Historical calculations stop at that durable profile-timezone boundary, so an archived habit does not accumulate false misses; restoring it clears the boundary without removing prior logs.

The eighth migration adds `reorder_habits(uuid[])`. It locks the user's active set, rejects empty, partial, duplicate, stale or inaccessible orders and rewrites stable positions in one transaction. Archived habits retain their historical position and are not accepted in the active ordering payload.

Workout routine planning is live through `workout_routines` and `workout_routine_exercises`. Active training uses `workout_sessions`, immutable exercise-plan snapshots in `workout_session_exercises` and planned/completed `workout_sets`. The `start_workout_session` RPC atomically creates the session, copies the owned routine and provisions its sets; a partial unique index permits only one active session per user. Composite foreign keys enforce both owner and session continuity, RLS provides four own-row policies per exposed table, direct deletes from session internals are revoked, and set mutations are rejected once a session is no longer active. Every set is durable in Supabase; Zustand stores only the timestamp-based rest countdown.

`finish_workout_session` locks the owned active session, requires at least one completed set and commits completion, duration, notes and frozen metrics in one transaction. Set volume is `load × reps`; estimated 1RM uses Epley with a single rep equal to its actual load. One best set per normalized exercise is marked as a PR only when it strictly exceeds every previously completed session. Finished/cancelled sessions and their internal snapshots are immutable, direct creation of session internals is revoked, and history reads the frozen Supabase rows rather than recalculating mutable client state.

## Rewards contracts

Migration `202608180011` adds one active versioned rule document, private wallets, profile-timezone monthly counters, an immutable ledger and frozen credit requests. The BRL catalog keeps each credit's nominal value while charging 40% more coins than the original product table; fractional Silver prices round up. Authenticated clients can read only their own economy rows and cannot write balances, counters, transactions or redemptions directly.

The ledger mutation trigger rejects every direct update/delete, but migration `202608190006` permits the foreign-key cascade after its owning `auth.users` row is removed. This preserves normal immutability without blocking the product's full-account deletion flow.

Migration `202608200001` adds narrow owner-only RPCs for deleting a Focus history row and renaming an exercise snapshot while its Workout session is active. Focus deletion rejects rows attached to an in-progress rewarded run, and completed reward ledger entries remain immutable. The same migration expands Habit-project banner validation to the full authorized Habit and Workout GIF catalog.

Durable `focus_runs` link timer phases through `focus_sessions.focus_run_id`. Rewarded phases pass through `record_focus_session`, which validates the owned active run, configured duration, elapsed timestamps and retry idempotency. Completion requires every focus stack and intervening break. Workout routines and sessions snapshot immutable `activity_type` (`strength` or `cardio`); the existing finish transaction invokes the exact-once award. Conversions, redemptions and all Gold caps are enforced by narrow server RPCs using the active rule version.

Migration `202608210001` makes the final rewarded Focus phase atomic: its session insert triggers eligibility verification, run completion, wallet/counter updates and immutable ledger inserts before the same transaction commits. Retrying a session after a lost response returns its existing idempotent row even though the run is already complete. The migration also reconciles every pre-existing eligible run with saved stacks and breaks but no `reward_processed_at`, preserving the original monthly caps and exact-once ledger keys.

Migration `202608210002` recovers complete legacy runs that were marked abandoned only after a lost final-session response. It proves eligibility from the owned durable sessions before clearing the stale abandonment marker and calling the same exact-once award transaction. The abandon RPC now attempts finalization first, so a fully saved run can never lose its earned reward through the recovery controls.

Migration `202608210003` adds the owner-only `convert_task_to_calendar_event` RPC. It locks an open task, resolves its scheduled date (or profile-local creation date), creates a timed event with the task title, notes, project color and estimate-based duration, then deletes the task and cascading checklist in the same transaction. A failed insert therefore leaves the original task untouched. Calendar titles accept the Tasks title limit of 500 characters so the conversion cannot fail solely because of a valid task title.

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
