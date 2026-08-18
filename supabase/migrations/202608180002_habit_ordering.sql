create or replace function public.reorder_habits(p_habit_ids uuid[])
returns setof public.habits
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested_count integer := cardinality(p_habit_ids);
  owned_active_count integer;
  matched_count integer;
begin
  if requested_count is null or requested_count = 0 then
    raise exception 'Habit order must contain at least one habit.';
  end if;

  perform 1 from public.habits
  where user_id = (select auth.uid()) and is_active
  for update;

  select count(*) into owned_active_count
  from public.habits
  where user_id = (select auth.uid()) and is_active;

  select count(distinct id) into matched_count
  from public.habits
  where user_id = (select auth.uid()) and is_active and id = any(p_habit_ids);

  if requested_count <> owned_active_count or matched_count <> owned_active_count then
    raise exception 'Habit order is stale or contains inaccessible habits.';
  end if;

  return query
  with requested as (
    select id, ordinality from unnest(p_habit_ids) with ordinality as ordered(id, ordinality)
  ), updated as (
    update public.habits as habit
    set position = requested.ordinality * 1000
    from requested
    where habit.id = requested.id
      and habit.user_id = (select auth.uid())
      and habit.is_active
    returning habit.*
  )
  select * from updated order by position;
end;
$$;

revoke all on function public.reorder_habits(uuid[]) from public;
grant execute on function public.reorder_habits(uuid[]) to authenticated;
