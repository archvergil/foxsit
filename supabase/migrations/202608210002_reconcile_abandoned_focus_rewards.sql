create or replace function public.reconcile_eligible_abandoned_focus_runs(
  p_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  result text;
  recovered_count integer := 0;
begin
  for candidate in
    select
      run.id,
      run.user_id,
      max(session.ended_at) as completion_at
    from public.focus_runs as run
    join public.focus_sessions as session
      on session.focus_run_id = run.id
      and session.user_id = run.user_id
    where run.reward_processed_at is null
      and run.abandoned_at is not null
      and (p_user_id is null or run.user_id = p_user_id)
    group by run.id, run.user_id, run.required_stack_count,
      run.focus_seconds_per_stack, run.break_seconds
    having count(*) filter (
      where session.session_type = 'focus'
        and session.completed
        and session.planned_seconds = run.focus_seconds_per_stack
        and session.focused_seconds = run.focus_seconds_per_stack
    ) >= run.required_stack_count
      and count(*) filter (
        where session.session_type in ('short_break', 'long_break')
          and session.completed
          and session.planned_seconds = run.break_seconds
          and session.focused_seconds = run.break_seconds
      ) >= run.required_stack_count - 1
    order by max(session.ended_at), run.id
  loop
    -- A completed sequence is authoritative. The legacy client could abandon the
    -- run only after the final session had committed and its response was lost.
    -- Finalize it in this statement so the partial active-run index is never
    -- exposed to two active rows for the same user.
    update public.focus_runs
    set abandoned_at = null,
        completed_at = coalesce(completed_at, candidate.completion_at)
    where id = candidate.id
      and user_id = candidate.user_id
      and reward_processed_at is null;

    result := public.finalize_eligible_focus_run(candidate.id, candidate.user_id);
    if result = 'awarded' then
      recovered_count := recovered_count + 1;
    elsif result <> 'already_processed' then
      raise exception 'Could not reconcile abandoned eligible Focus run %: %', candidate.id, result;
    end if;
  end loop;

  return recovered_count;
end;
$$;

create or replace function public.abandon_focus_run(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  result text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  -- A lost RPC response can leave the client believing a durably completed
  -- phase failed. Never turn a complete, eligible run into an abandoned one.
  result := public.finalize_eligible_focus_run(p_run_id, current_user_id);
  if result in ('awarded', 'already_processed') then
    return;
  end if;

  update public.focus_runs
  set abandoned_at = clock_timestamp()
  where id = p_run_id
    and user_id = current_user_id
    and completed_at is null
    and abandoned_at is null;
end;
$$;

do $$
declare
  recovered_count integer;
begin
  recovered_count := public.reconcile_eligible_abandoned_focus_runs(null);
  raise notice 'Recovered % abandoned eligible Focus reward run(s).', recovered_count;
end;
$$;

revoke all on function public.reconcile_eligible_abandoned_focus_runs(uuid)
from public, anon, authenticated;
revoke all on function public.abandon_focus_run(uuid) from public, anon;
grant execute on function public.abandon_focus_run(uuid) to authenticated;
