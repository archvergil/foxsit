create or replace function public.delete_focus_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  deleted_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if exists (
    select 1
    from public.focus_sessions as session
    join public.focus_runs as run on run.id = session.focus_run_id
    where session.id = p_session_id
      and session.user_id = current_user_id
      and run.completed_at is null
      and run.abandoned_at is null
  ) then
    raise exception 'End the active rewarded Focus run before deleting this session.';
  end if;

  delete from public.focus_sessions
  where id = p_session_id and user_id = current_user_id
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Focus session not found.';
  end if;

  return deleted_id;
end;
$$;

revoke all on function public.delete_focus_session(uuid) from public;
grant execute on function public.delete_focus_session(uuid) to authenticated;

create or replace function public.rename_active_workout_exercise(
  p_session_exercise_id uuid,
  p_exercise_name text
)
returns public.workout_session_exercises
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := btrim(p_exercise_name);
  renamed public.workout_session_exercises;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if normalized_name is null or char_length(normalized_name) = 0 or char_length(normalized_name) > 160 then
    raise exception 'Exercise name must contain between 1 and 160 characters.';
  end if;

  update public.workout_session_exercises as exercise
  set exercise_name = normalized_name,
      updated_at = now()
  where exercise.id = p_session_exercise_id
    and exercise.user_id = current_user_id
    and exists (
      select 1
      from public.workout_sessions as session
      where session.id = exercise.session_id
        and session.user_id = current_user_id
        and session.status = 'active'
    )
  returning exercise.* into renamed;

  if renamed.id is null then
    raise exception 'Active workout exercise not found.';
  end if;

  return renamed;
end;
$$;

revoke all on function public.rename_active_workout_exercise(uuid, text) from public;
grant execute on function public.rename_active_workout_exercise(uuid, text) to authenticated;

alter table public.habit_projects
  drop constraint if exists habit_projects_banner_asset_valid;

alter table public.habit_projects
  add constraint habit_projects_banner_asset_valid check (
    banner_asset is null
    or banner_asset ~ '^(habits_([1-9]|1[01])|workout_([1-9]|1[0-3]))[.]gif$'
  );
