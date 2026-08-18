create or replace function public.reorder_tasks(p_task_ids uuid[])
returns setof public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested_count integer := cardinality(p_task_ids);
  owned_open_count integer;
  matched_count integer;
begin
  if requested_count is null or requested_count = 0 then
    raise exception 'Task order must contain at least one task.';
  end if;

  select count(*)
  into owned_open_count
  from public.tasks
  where user_id = (select auth.uid())
    and status = 'open';

  select count(distinct id)
  into matched_count
  from public.tasks
  where user_id = (select auth.uid())
    and status = 'open'
    and id = any(p_task_ids);

  if requested_count <> owned_open_count or matched_count <> owned_open_count then
    raise exception 'Task order is stale or contains inaccessible tasks.';
  end if;

  return query
  with requested as (
    select id, ordinality
    from unnest(p_task_ids) with ordinality as ordered(id, ordinality)
  ),
  updated as (
    update public.tasks as task
    set position = requested.ordinality * 1000
    from requested
    where task.id = requested.id
      and task.user_id = (select auth.uid())
      and task.status = 'open'
    returning task.*
  )
  select * from updated order by position;
end;
$$;

revoke all on function public.reorder_tasks(uuid[]) from public;
grant execute on function public.reorder_tasks(uuid[]) to authenticated;
