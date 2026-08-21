alter table public.workout_routines
  drop constraint if exists workout_routines_activity_type_check;
alter table public.workout_routines
  add constraint workout_routines_activity_type_check
  check (activity_type in ('strength', 'cardio', 'crossfit'));

alter table public.workout_sessions
  drop constraint if exists workout_sessions_activity_type_check;
alter table public.workout_sessions
  add constraint workout_sessions_activity_type_check
  check (activity_type in ('strength', 'cardio', 'crossfit'));

alter table public.workout_routines
  add column crossfit_time_cap_seconds integer,
  add constraint workout_routines_crossfit_time_cap_valid check (
    (activity_type = 'crossfit' and crossfit_time_cap_seconds between 60 and 10800)
    or (activity_type <> 'crossfit' and crossfit_time_cap_seconds is null)
  );

alter table public.workout_routine_exercises
  add column crossfit_uses_weight boolean not null default false,
  add column crossfit_weight_kg numeric(8, 2),
  add column crossfit_reps integer,
  add constraint workout_routine_exercises_crossfit_weight_valid check (
    crossfit_weight_kg is null or crossfit_weight_kg between 0 and 10000
  ),
  add constraint workout_routine_exercises_crossfit_reps_valid check (
    crossfit_reps is null or crossfit_reps between 1 and 1000
  ),
  add constraint workout_routine_exercises_crossfit_weight_contract check (
    (crossfit_uses_weight and crossfit_weight_kg is not null)
    or (not crossfit_uses_weight and crossfit_weight_kg is null)
  );

alter table public.workout_session_exercises
  add column crossfit_uses_weight boolean not null default false,
  add column crossfit_weight_kg numeric(8, 2),
  add column crossfit_reps integer,
  add constraint workout_session_exercises_crossfit_weight_valid check (
    crossfit_weight_kg is null or crossfit_weight_kg between 0 and 10000
  ),
  add constraint workout_session_exercises_crossfit_reps_valid check (
    crossfit_reps is null or crossfit_reps between 1 and 1000
  ),
  add constraint workout_session_exercises_crossfit_weight_contract check (
    (crossfit_uses_weight and crossfit_weight_kg is not null)
    or (not crossfit_uses_weight and crossfit_weight_kg is null)
  );

alter table public.workout_sessions
  add column crossfit_time_cap_seconds integer,
  add column crossfit_due_at timestamptz,
  add column crossfit_rounds_completed integer not null default 0,
  add constraint workout_sessions_crossfit_rounds_valid check (crossfit_rounds_completed >= 0),
  add constraint workout_sessions_crossfit_contract check (
    (
      activity_type = 'crossfit'
      and crossfit_time_cap_seconds between 60 and 10800
      and crossfit_due_at = started_at + make_interval(secs => crossfit_time_cap_seconds)
    )
    or (
      activity_type <> 'crossfit'
      and crossfit_time_cap_seconds is null
      and crossfit_due_at is null
      and crossfit_rounds_completed = 0
    )
  );

create index workout_sessions_crossfit_due_idx
  on public.workout_sessions (crossfit_due_at)
  where status = 'active' and activity_type = 'crossfit';

create or replace function public.validate_workout_routine_exercise_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  routine_activity text;
begin
  select activity_type into routine_activity
  from public.workout_routines
  where id = new.routine_id and user_id = new.user_id;

  if routine_activity is null then
    raise exception 'Workout routine was not found.';
  end if;

  if routine_activity = 'crossfit' then
    if new.crossfit_reps is null then
      raise exception 'CrossFit movements require repetitions.';
    end if;
  elsif new.crossfit_reps is not null or new.crossfit_uses_weight or new.crossfit_weight_kg is not null then
    raise exception 'CrossFit movement fields can only be used by CrossFit routines.';
  end if;

  return new;
end;
$$;

create trigger workout_routine_exercises_validate_contract
before insert or update on public.workout_routine_exercises
for each row execute function public.validate_workout_routine_exercise_contract();

create or replace function public.start_workout_session(p_routine_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  selected_routine public.workout_routines%rowtype;
  active_session_id uuid;
  session_started_at timestamptz := clock_timestamp();
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;

  select id into active_session_id
  from public.workout_sessions
  where user_id = current_user_id and status = 'active'
  limit 1;
  if active_session_id is not null then return active_session_id; end if;

  select * into selected_routine
  from public.workout_routines
  where id = p_routine_id and user_id = current_user_id and archived_at is null;
  if not found then raise exception 'Workout routine was not found.'; end if;

  if not exists (
    select 1 from public.workout_routine_exercises
    where routine_id = selected_routine.id and user_id = current_user_id
  ) then raise exception 'Add at least one exercise before starting the workout.'; end if;

  if selected_routine.activity_type = 'crossfit' and exists (
    select 1 from public.workout_routine_exercises
    where routine_id = selected_routine.id and user_id = current_user_id and crossfit_reps is null
  ) then raise exception 'Every CrossFit movement must have repetitions.'; end if;

  insert into public.workout_sessions (
    user_id, routine_id, routine_name, started_at,
    crossfit_time_cap_seconds, crossfit_due_at
  ) values (
    current_user_id, selected_routine.id, selected_routine.name, session_started_at,
    selected_routine.crossfit_time_cap_seconds,
    case when selected_routine.activity_type = 'crossfit'
      then session_started_at + make_interval(secs => selected_routine.crossfit_time_cap_seconds)
      else null end
  ) returning id into active_session_id;

  insert into public.workout_session_exercises (
    user_id, session_id, source_routine_exercise_id, exercise_name, muscle_group,
    position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes,
    crossfit_uses_weight, crossfit_weight_kg, crossfit_reps
  )
  select
    current_user_id, active_session_id, id, exercise_name, muscle_group,
    position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes,
    crossfit_uses_weight, crossfit_weight_kg, crossfit_reps
  from public.workout_routine_exercises
  where routine_id = selected_routine.id and user_id = current_user_id
  order by position, created_at;

  if selected_routine.activity_type <> 'crossfit' then
    insert into public.workout_sets (user_id, session_id, session_exercise_id, set_number)
    select current_user_id, active_session_id, exercise.id, set_number
    from public.workout_session_exercises exercise
    cross join lateral generate_series(1, exercise.target_sets) set_number
    where exercise.session_id = active_session_id and exercise.user_id = current_user_id;
  end if;

  return active_session_id;
end;
$$;

create or replace function public.protect_workout_session_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  finishing boolean := coalesce(current_setting('app.finishing_workout', true), 'false') = 'true';
  recording_round boolean := coalesce(current_setting('app.recording_crossfit_round', true), 'false') = 'true';
  detaching_deleted_routine boolean;
begin
  detaching_deleted_routine := old.routine_id is not null
    and new.routine_id is null
    and not exists (
      select 1 from public.workout_routines
      where id = old.routine_id and user_id = old.user_id
    );
  if detaching_deleted_routine then return new; end if;
  if old.status in ('completed', 'cancelled') then raise exception 'Finished workout sessions are immutable.'; end if;

  if new.user_id is distinct from old.user_id
    or new.routine_id is distinct from old.routine_id
    or new.routine_name is distinct from old.routine_name
    or new.started_at is distinct from old.started_at
    or new.crossfit_time_cap_seconds is distinct from old.crossfit_time_cap_seconds
    or new.crossfit_due_at is distinct from old.crossfit_due_at then
    raise exception 'Workout session identity is immutable.';
  end if;

  if new.status = 'completed' and not finishing then
    raise exception 'Workout sessions must be completed through an authorized finalizer.';
  end if;

  if new.crossfit_rounds_completed is distinct from old.crossfit_rounds_completed
    and not recording_round then
    raise exception 'CrossFit rounds must be recorded through increment_crossfit_round.';
  end if;

  if (
    new.completed_sets is distinct from old.completed_sets
    or new.total_volume_kg is distinct from old.total_volume_kg
    or new.best_estimated_1rm_kg is distinct from old.best_estimated_1rm_kg
    or new.personal_records is distinct from old.personal_records
  ) and not finishing then
    raise exception 'Workout metrics are managed by an authorized finalizer.';
  end if;
  return new;
end;
$$;

create or replace function public.finalize_crossfit_workout_session(
  p_session_id uuid,
  p_user_id uuid
)
returns public.workout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.workout_sessions%rowtype;
begin
  select * into target from public.workout_sessions
  where id = p_session_id and user_id = p_user_id
  for update;
  if not found then raise exception 'CrossFit workout was not found.'; end if;
  if target.status = 'completed' then return target; end if;
  if target.status <> 'active' or target.activity_type <> 'crossfit' then
    raise exception 'Only an active CrossFit workout can be finalized.';
  end if;
  if clock_timestamp() < target.crossfit_due_at then
    raise exception 'The CrossFit time cap has not elapsed.';
  end if;

  perform set_config('app.finishing_workout', 'true', true);
  update public.workout_sessions
  set status = 'completed',
      ended_at = target.crossfit_due_at,
      duration_seconds = target.crossfit_time_cap_seconds,
      completed_sets = 0,
      total_volume_kg = 0,
      best_estimated_1rm_kg = null,
      personal_records = 0
  where id = target.id and user_id = target.user_id
  returning * into target;
  return target;
end;
$$;

create or replace function public.increment_crossfit_round(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.workout_sessions%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into target from public.workout_sessions
  where id = p_session_id and user_id = current_user_id
  for update;
  if not found then raise exception 'CrossFit workout was not found.'; end if;
  if target.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'rounds_completed', target.crossfit_rounds_completed);
  end if;
  if target.status <> 'active' or target.activity_type <> 'crossfit' then
    raise exception 'Only an active CrossFit workout can record rounds.';
  end if;
  if clock_timestamp() >= target.crossfit_due_at then
    target := public.finalize_crossfit_workout_session(target.id, current_user_id);
    return jsonb_build_object('status', 'completed', 'rounds_completed', target.crossfit_rounds_completed);
  end if;

  perform set_config('app.recording_crossfit_round', 'true', true);
  update public.workout_sessions
  set crossfit_rounds_completed = crossfit_rounds_completed + 1
  where id = target.id and user_id = current_user_id
  returning * into target;
  return jsonb_build_object('status', 'active', 'rounds_completed', target.crossfit_rounds_completed);
end;
$$;

create or replace function public.settle_crossfit_workout(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved public.workout_sessions%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  saved := public.finalize_crossfit_workout_session(p_session_id, current_user_id);
  return saved.id;
end;
$$;

create or replace function public.finalize_due_crossfit_workouts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  completed_count integer := 0;
begin
  for candidate in
    select id, user_id from public.workout_sessions
    where status = 'active' and activity_type = 'crossfit'
      and crossfit_due_at <= clock_timestamp()
    order by crossfit_due_at, id
    for update skip locked
  loop
    perform public.finalize_crossfit_workout_session(candidate.id, candidate.user_id);
    completed_count := completed_count + 1;
  end loop;
  return completed_count;
end;
$$;

create or replace function public.award_completed_workout_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status <> 'completed' and new.status = 'completed'
    and new.activity_type in ('strength', 'cardio')
    and (select auth.uid()) = new.user_id then
    perform public.award_workout_rewards(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.validate_workout_routine_exercise_contract() from public, anon, authenticated;
revoke all on function public.finalize_crossfit_workout_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_due_crossfit_workouts() from public, anon, authenticated;
revoke all on function public.increment_crossfit_round(uuid) from public, anon;
revoke all on function public.settle_crossfit_workout(uuid) from public, anon;
grant execute on function public.increment_crossfit_round(uuid) to authenticated;
grant execute on function public.settle_crossfit_workout(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    if exists (select 1 from cron.job where jobname = 'finalize-due-crossfit-workouts') then
      perform cron.unschedule('finalize-due-crossfit-workouts');
    end if;
    perform cron.schedule(
      'finalize-due-crossfit-workouts',
      '10 seconds',
      'select public.finalize_due_crossfit_workouts();'
    );
  else
    raise notice 'pg_cron is unavailable; clients will settle CrossFit workouts on synchronization.';
  end if;
exception when others then
  raise notice 'Could not schedule the CrossFit finalizer: %', sqlerrm;
end;
$$;
