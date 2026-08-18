alter table public.workout_session_exercises
  add column exercise_key text generated always as (lower(btrim(exercise_name))) stored;

create index workout_session_exercises_user_key_idx
  on public.workout_session_exercises (user_id, exercise_key);

alter table public.workout_sets
  add column volume_kg numeric(12, 2),
  add column estimated_1rm_kg numeric(10, 2),
  add column is_personal_record boolean not null default false,
  add constraint workout_sets_volume_valid check (volume_kg is null or volume_kg >= 0),
  add constraint workout_sets_estimated_1rm_valid check (estimated_1rm_kg is null or estimated_1rm_kg >= 0);

alter table public.workout_sessions
  add column completed_sets integer not null default 0,
  add column total_volume_kg numeric(14, 2) not null default 0,
  add column best_estimated_1rm_kg numeric(10, 2),
  add column personal_records integer not null default 0,
  add constraint workout_sessions_completed_sets_valid check (completed_sets >= 0),
  add constraint workout_sessions_total_volume_valid check (total_volume_kg >= 0),
  add constraint workout_sessions_best_1rm_valid check (best_estimated_1rm_kg is null or best_estimated_1rm_kg >= 0),
  add constraint workout_sessions_personal_records_valid check (personal_records >= 0);

create or replace function public.protect_workout_session_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  finishing boolean := coalesce(current_setting('app.finishing_workout', true), 'false') = 'true';
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'Finished workout sessions are immutable.';
  end if;

  if new.user_id is distinct from old.user_id
    or new.routine_id is distinct from old.routine_id
    or new.routine_name is distinct from old.routine_name
    or new.started_at is distinct from old.started_at then
    raise exception 'Workout session identity is immutable.';
  end if;

  if new.status = 'completed' and not finishing then
    raise exception 'Workout sessions must be completed through finish_workout_session.';
  end if;

  if (
    new.completed_sets is distinct from old.completed_sets
    or new.total_volume_kg is distinct from old.total_volume_kg
    or new.best_estimated_1rm_kg is distinct from old.best_estimated_1rm_kg
    or new.personal_records is distinct from old.personal_records
  ) and not finishing then
    raise exception 'Workout metrics are managed by finish_workout_session.';
  end if;

  return new;
end;
$$;

create trigger workout_sessions_protect_state
before update on public.workout_sessions
for each row execute function public.protect_workout_session_state();

create or replace function public.finish_workout_session(
  p_session_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_session public.workout_sessions%rowtype;
  finished_at timestamptz := clock_timestamp();
  completed_set_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Workout notes cannot exceed 5000 characters.';
  end if;

  select * into target_session
  from public.workout_sessions
  where id = p_session_id and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Workout session was not found.';
  end if;

  if target_session.status = 'completed' then
    return target_session.id;
  end if;

  if target_session.status <> 'active' then
    raise exception 'Only an active workout can be completed.';
  end if;

  select count(*)::integer into completed_set_count
  from public.workout_sets
  where session_id = target_session.id
    and user_id = current_user_id
    and completed_at is not null;

  if completed_set_count = 0 then
    raise exception 'Complete at least one set before finishing the workout.';
  end if;

  perform set_config('app.finishing_workout', 'true', true);

  update public.workout_sets
  set
    volume_kg = round(coalesce(weight_kg, 0) * reps, 2),
    estimated_1rm_kg = case
      when weight_kg is null or weight_kg <= 0 then null
      when reps = 1 then weight_kg
      else round(weight_kg * (1 + reps / 30.0), 2)
    end,
    is_personal_record = false
  where session_id = target_session.id
    and user_id = current_user_id
    and completed_at is not null;

  with current_bests as (
    select distinct on (exercise.exercise_key)
      workout_set.id as set_id,
      exercise.exercise_key,
      workout_set.estimated_1rm_kg
    from public.workout_sets workout_set
    join public.workout_session_exercises exercise
      on exercise.id = workout_set.session_exercise_id
      and exercise.session_id = workout_set.session_id
      and exercise.user_id = workout_set.user_id
    where workout_set.session_id = target_session.id
      and workout_set.user_id = current_user_id
      and workout_set.completed_at is not null
      and workout_set.estimated_1rm_kg is not null
    order by exercise.exercise_key, workout_set.estimated_1rm_kg desc, workout_set.completed_at, workout_set.id
  ),
  prior_bests as (
    select
      exercise.exercise_key,
      max(workout_set.estimated_1rm_kg) as estimated_1rm_kg
    from public.workout_sets workout_set
    join public.workout_session_exercises exercise
      on exercise.id = workout_set.session_exercise_id
      and exercise.session_id = workout_set.session_id
      and exercise.user_id = workout_set.user_id
    join public.workout_sessions workout_session
      on workout_session.id = workout_set.session_id
      and workout_session.user_id = workout_set.user_id
    where workout_set.user_id = current_user_id
      and workout_set.session_id <> target_session.id
      and workout_session.status = 'completed'
      and workout_set.completed_at is not null
      and workout_set.estimated_1rm_kg is not null
    group by exercise.exercise_key
  )
  update public.workout_sets workout_set
  set is_personal_record = true
  from current_bests current_best
  left join prior_bests prior_best on prior_best.exercise_key = current_best.exercise_key
  where workout_set.id = current_best.set_id
    and current_best.estimated_1rm_kg > coalesce(prior_best.estimated_1rm_kg, 0);

  update public.workout_sessions
  set
    status = 'completed',
    ended_at = finished_at,
    duration_seconds = greatest(0, floor(extract(epoch from (finished_at - started_at)))::integer),
    notes = nullif(btrim(p_notes), ''),
    completed_sets = completed_set_count,
    total_volume_kg = coalesce((
      select sum(volume_kg) from public.workout_sets
      where session_id = target_session.id and user_id = current_user_id and completed_at is not null
    ), 0),
    best_estimated_1rm_kg = (
      select max(estimated_1rm_kg) from public.workout_sets
      where session_id = target_session.id and user_id = current_user_id and completed_at is not null
    ),
    personal_records = (
      select count(*)::integer from public.workout_sets
      where session_id = target_session.id and user_id = current_user_id and is_personal_record
    )
  where id = target_session.id and user_id = current_user_id;

  return target_session.id;
end;
$$;

alter function public.start_workout_session(uuid) security definer;

revoke insert on public.workout_sessions from authenticated;
revoke insert, update on public.workout_session_exercises from authenticated;
revoke insert on public.workout_sets from authenticated;

revoke all on function public.protect_workout_session_state() from public, anon, authenticated;
revoke all on function public.finish_workout_session(uuid, text) from public, anon;
grant execute on function public.finish_workout_session(uuid, text) to authenticated;
