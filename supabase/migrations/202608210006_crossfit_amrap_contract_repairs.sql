create or replace function public.protect_workout_routine_activity_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.activity_type is distinct from old.activity_type and exists (
    select 1
    from public.workout_routine_exercises
    where routine_id = old.id and user_id = old.user_id
  ) then
    raise exception 'Remove existing exercises before changing the workout modality.';
  end if;
  return new;
end;
$$;

create trigger workout_routines_protect_activity_type
before update of activity_type on public.workout_routines
for each row execute function public.protect_workout_routine_activity_type();

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
    user_id, routine_id, routine_name, activity_type, started_at,
    crossfit_time_cap_seconds, crossfit_due_at
  ) values (
    current_user_id, selected_routine.id, selected_routine.name,
    selected_routine.activity_type, session_started_at,
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

revoke all on function public.protect_workout_routine_activity_type() from public, anon, authenticated;
