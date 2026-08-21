alter table public.calendar_events
  drop constraint if exists calendar_events_title_not_blank;

alter table public.calendar_events
  add constraint calendar_events_title_not_blank
  check (char_length(trim(title)) between 1 and 500);

create or replace function public.convert_task_to_calendar_event(
  p_task_id uuid,
  p_start_time time without time zone
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_task public.tasks%rowtype;
  profile_timezone text;
  event_date date;
  event_start timestamptz;
  event_end timestamptz;
  event_color text := 'slate';
  event_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_start_time is null then
    raise exception 'A start time is required.';
  end if;

  select * into target_task
  from public.tasks
  where id = p_task_id
    and user_id = current_user_id
    and status = 'open'
  for update;

  if not found then
    raise exception 'Open task not found.';
  end if;

  select coalesce(timezone, 'UTC') into profile_timezone
  from public.profiles
  where id = current_user_id;
  profile_timezone := coalesce(profile_timezone, 'UTC');

  event_date := coalesce(
    target_task.scheduled_date,
    timezone(profile_timezone, target_task.created_at)::date
  );
  event_start := timezone(profile_timezone, event_date + p_start_time);
  event_end := event_start + make_interval(mins => coalesce(target_task.estimate_minutes, 60));

  if target_task.project_id is not null then
    select color_token into event_color
    from public.task_projects
    where id = target_task.project_id
      and user_id = current_user_id;
    event_color := coalesce(event_color, 'slate');
  end if;

  insert into public.calendar_events (
    user_id,
    title,
    description,
    all_day,
    start_at,
    end_at,
    start_date,
    end_date,
    category,
    color_token,
    location
  ) values (
    current_user_id,
    target_task.title,
    target_task.notes,
    false,
    event_start,
    event_end,
    null,
    null,
    'Task',
    event_color,
    null
  ) returning id into event_id;

  delete from public.tasks
  where id = target_task.id
    and user_id = current_user_id;

  return event_id;
end;
$$;

revoke all on function public.convert_task_to_calendar_event(uuid, time without time zone)
from public, anon;
grant execute on function public.convert_task_to_calendar_event(uuid, time without time zone)
to authenticated;
