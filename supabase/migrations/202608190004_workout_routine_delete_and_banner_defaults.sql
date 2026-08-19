create or replace function public.protect_workout_session_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  finishing boolean := coalesce(current_setting('app.finishing_workout', true), 'false') = 'true';
  detaching_deleted_routine boolean;
begin
  detaching_deleted_routine := old.routine_id is not null
    and new.routine_id is null
    and not exists (
      select 1
      from public.workout_routines
      where id = old.routine_id and user_id = old.user_id
    );

  if detaching_deleted_routine then
    return new;
  end if;

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

with ranked_routines as (
  select
    id,
    row_number() over (partition by user_id order by position, created_at, id) as banner_number
  from public.workout_routines
  where banner_asset is null
)
update public.workout_routines as routine
set
  banner_asset = 'workout_' || (((ranked.banner_number - 1) % 13) + 1)::text || '.gif',
  banner_monochrome = true
from ranked_routines as ranked
where routine.id = ranked.id;

alter table public.workout_routines
  alter column banner_asset set default 'workout_1.gif',
  alter column banner_monochrome set default true;
