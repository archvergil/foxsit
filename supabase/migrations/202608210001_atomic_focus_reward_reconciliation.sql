create or replace function public.finalize_eligible_focus_run(
  p_run_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.focus_runs%rowtype;
  wallet public.reward_wallets%rowtype;
  counter public.reward_monthly_counters%rowtype;
  rule public.reward_rule_sets%rowtype;
  predominant_mode text;
  mode_rule jsonb;
  stack_count integer;
  break_count integer;
  silver_room integer;
  gold_room integer;
  base_silver integer;
  base_gold integer;
  description_silver integer := 0;
  daily_silver integer := 0;
  local_40_count integer;
  source_key text := p_run_id::text;
  v_profile_timezone text;
  v_completion_at timestamptz;
  v_local_day date;
  v_local_month date;
begin
  if p_user_id is null then
    return 'missing_user';
  end if;

  select * into target_run
  from public.focus_runs
  where id = p_run_id and user_id = p_user_id
  for update;

  if not found then return 'not_found'; end if;
  if target_run.reward_processed_at is not null then return 'already_processed'; end if;
  if target_run.abandoned_at is not null then return 'abandoned'; end if;

  select count(*)::integer into stack_count
  from public.focus_sessions
  where user_id = p_user_id
    and focus_run_id = p_run_id
    and session_type = 'focus'
    and completed
    and planned_seconds = target_run.focus_seconds_per_stack
    and focused_seconds = target_run.focus_seconds_per_stack;

  if stack_count < target_run.required_stack_count then return 'incomplete_stacks'; end if;

  select count(*)::integer into break_count
  from public.focus_sessions
  where user_id = p_user_id
    and focus_run_id = p_run_id
    and session_type in ('short_break', 'long_break')
    and completed
    and planned_seconds = target_run.break_seconds
    and focused_seconds = target_run.break_seconds;

  if break_count < target_run.required_stack_count - 1 then return 'incomplete_breaks'; end if;

  select coalesce(max(ended_at), clock_timestamp()) into v_completion_at
  from public.focus_sessions
  where user_id = p_user_id and focus_run_id = p_run_id;

  select coalesce(timezone, 'UTC') into v_profile_timezone
  from public.profiles
  where id = p_user_id;

  v_profile_timezone := coalesce(v_profile_timezone, 'UTC');
  v_local_day := timezone(v_profile_timezone, v_completion_at)::date;
  v_local_month := date_trunc('month', v_local_day::timestamp)::date;

  insert into public.reward_wallets(user_id)
  values (p_user_id)
  on conflict do nothing;

  insert into public.reward_monthly_counters(user_id, local_month)
  values (p_user_id, v_local_month)
  on conflict do nothing;

  select * into wallet
  from public.reward_wallets
  where user_id = p_user_id
  for update;

  select * into counter
  from public.reward_monthly_counters
  where user_id = p_user_id and local_month = v_local_month
  for update;

  select * into rule from public.reward_rule_sets where is_active;
  if not found then raise exception 'Active reward rule is unavailable.'; end if;

  mode_rule := rule.rules -> 'focus_modes' -> target_run.mode;
  if mode_rule is null then return 'invalid_mode'; end if;

  update public.focus_runs
  set completed_stack_count = required_stack_count,
      completed_at = coalesce(completed_at, v_completion_at),
      reward_processed_at = clock_timestamp()
  where id = target_run.id;

  if target_run.mode = '25_5' then
    counter.focus_25_5_completed := counter.focus_25_5_completed + 1;
  elsif target_run.mode = '30_5' then
    counter.focus_30_5_completed := counter.focus_30_5_completed + 1;
  else
    counter.focus_40_5_completed := counter.focus_40_5_completed + 1;
  end if;

  predominant_mode := public.reward_predominant_mode(counter);
  silver_room := greatest(
    0,
    (rule.rules #>> array['focus_modes', predominant_mode, 'focus_silver_cap'])::integer - counter.focus_silver_credited
  );
  gold_room := greatest(
    0,
    (rule.rules #>> array['focus_modes', predominant_mode, 'gold_cap'])::integer - counter.gold_credited
  );
  base_silver := least((mode_rule ->> 'silver')::integer, silver_room);
  base_gold := least((mode_rule ->> 'gold')::integer, gold_room);
  silver_room := silver_room - base_silver;

  if target_run.description is not null
    and char_length(btrim(target_run.description)) >= (rule.rules ->> 'focus_description_min_codepoints')::integer then
    description_silver := least((rule.rules ->> 'focus_description_silver')::integer, silver_room);
    silver_room := silver_room - description_silver;
  end if;

  if target_run.mode = '40_5' then
    select count(*)::integer into local_40_count
    from public.focus_runs as completed_run
    where completed_run.user_id = p_user_id
      and completed_run.mode = '40_5'
      and completed_run.completed_at is not null
      and timezone(v_profile_timezone, completed_run.completed_at)::date = v_local_day
      and (
        completed_run.completed_at < coalesce(target_run.completed_at, v_completion_at)
        or (
          completed_run.completed_at = coalesce(target_run.completed_at, v_completion_at)
          and completed_run.id <= target_run.id
        )
      );

    if local_40_count = 2 then
      daily_silver := least((rule.rules ->> 'focus_daily_40_silver')::integer, silver_room);
    end if;
  end if;

  update public.reward_wallets
  set silver_balance = silver_balance + base_silver + description_silver + daily_silver,
      gold_balance = gold_balance + base_gold,
      version = version + 1
  where user_id = p_user_id
  returning * into wallet;

  update public.reward_monthly_counters
  set focus_25_5_completed = counter.focus_25_5_completed,
      focus_30_5_completed = counter.focus_30_5_completed,
      focus_40_5_completed = counter.focus_40_5_completed,
      focus_silver_credited = focus_silver_credited + base_silver + description_silver + daily_silver,
      gold_credited = gold_credited + base_gold
  where id = counter.id;

  if base_silver <> 0 or base_gold <> 0 then
    insert into public.reward_transactions(
      user_id, reason, silver_delta, gold_delta, silver_balance_after, gold_balance_after,
      source_type, source_key, source_id, rule_version, metadata
    ) values (
      p_user_id, 'focus_base', base_silver, base_gold,
      wallet.silver_balance - description_silver - daily_silver, wallet.gold_balance,
      'focus_run', source_key, p_run_id, rule.version,
      jsonb_build_object('mode', target_run.mode, 'local_day', v_local_day, 'reconciled_atomically', true)
    );
  end if;

  if description_silver > 0 then
    insert into public.reward_transactions(
      user_id, reason, silver_delta, gold_delta, silver_balance_after, gold_balance_after,
      source_type, source_key, source_id, rule_version
    ) values (
      p_user_id, 'focus_description_bonus', description_silver, 0,
      wallet.silver_balance - daily_silver, wallet.gold_balance,
      'focus_run', source_key, p_run_id, rule.version
    );
  end if;

  if daily_silver > 0 then
    insert into public.reward_transactions(
      user_id, reason, silver_delta, gold_delta, silver_balance_after, gold_balance_after,
      source_type, source_key, source_id, rule_version
    ) values (
      p_user_id, 'focus_daily_40_bonus', daily_silver, 0,
      wallet.silver_balance, wallet.gold_balance,
      'focus_run', '40_5:' || v_local_day, p_run_id, rule.version
    );
  end if;

  return 'awarded';
end;
$$;

create or replace function public.complete_focus_run_and_award(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  result text;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;

  result := public.finalize_eligible_focus_run(p_run_id, current_user_id);

  if result = 'not_found' then raise exception 'Focus run was not found.'; end if;
  if result = 'abandoned' then raise exception 'An abandoned Focus run is not eligible.'; end if;
  if result = 'incomplete_stacks' then raise exception 'Complete every Focus stack before claiming rewards.'; end if;
  if result = 'incomplete_breaks' then raise exception 'Complete every break between Focus stacks before claiming rewards.'; end if;
  if result in ('missing_user', 'invalid_mode') then raise exception 'The Focus run is not eligible for rewards.'; end if;

  return public.get_reward_dashboard(30);
end;
$$;

create or replace function public.auto_finalize_focus_reward_from_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.focus_run_id is not null and new.completed then
    perform public.finalize_eligible_focus_run(new.focus_run_id, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists focus_sessions_auto_finalize_reward on public.focus_sessions;
create trigger focus_sessions_auto_finalize_reward
after insert or update on public.focus_sessions
for each row execute function public.auto_finalize_focus_reward_from_session();

create or replace function public.record_focus_session(
  p_focus_run_id uuid,
  p_task_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_planned_seconds integer,
  p_focused_seconds integer,
  p_session_type text,
  p_completed boolean
)
returns public.focus_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.focus_runs%rowtype;
  saved public.focus_sessions%rowtype;
  expected_seconds integer;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_session_type not in ('focus', 'short_break', 'long_break') then raise exception 'Focus phase is invalid.'; end if;
  if p_planned_seconds < 1 or p_planned_seconds > 86400 or p_focused_seconds < 0 or p_focused_seconds > p_planned_seconds then raise exception 'Focus duration is invalid.'; end if;
  if p_ended_at < p_started_at or p_ended_at > clock_timestamp() + interval '5 minutes' then raise exception 'Focus timestamps are invalid.'; end if;
  if p_completed and p_focused_seconds <> p_planned_seconds then raise exception 'A completed phase must reach its planned duration.'; end if;
  if p_completed and extract(epoch from (p_ended_at - p_started_at))::integer < p_planned_seconds then raise exception 'The completed phase elapsed too quickly.'; end if;
  if p_task_id is not null and p_session_type <> 'focus' then raise exception 'Only Focus phases can link a task.'; end if;

  if p_focus_run_id is not null then
    select * into saved
    from public.focus_sessions
    where user_id = current_user_id
      and focus_run_id = p_focus_run_id
      and started_at = p_started_at
      and session_type = p_session_type;
    if found then return saved; end if;

    select * into target_run
    from public.focus_runs
    where id = p_focus_run_id and user_id = current_user_id
    for update;

    if not found then raise exception 'The Focus run is not active.'; end if;

    if target_run.completed_at is not null or target_run.abandoned_at is not null then
      select * into saved
      from public.focus_sessions
      where user_id = current_user_id
        and focus_run_id = p_focus_run_id
        and started_at = p_started_at
        and session_type = p_session_type;
      if found then return saved; end if;
      raise exception 'The Focus run is not active.';
    end if;

    expected_seconds := case
      when p_session_type = 'focus' then target_run.focus_seconds_per_stack
      else target_run.break_seconds
    end;
    if p_planned_seconds <> expected_seconds then raise exception 'The phase duration does not match its durable Focus run.'; end if;
  end if;

  insert into public.focus_sessions(
    user_id, focus_run_id, task_id, started_at, ended_at, planned_seconds,
    focused_seconds, session_type, completed
  ) values (
    current_user_id, p_focus_run_id, p_task_id, p_started_at, p_ended_at,
    p_planned_seconds, p_focused_seconds, p_session_type, p_completed
  )
  on conflict (user_id, focus_run_id, started_at, session_type)
  do update set created_at = public.focus_sessions.created_at
  returning * into saved;

  return saved;
end;
$$;

do $$
declare
  candidate record;
  result text;
begin
  for candidate in
    select run.id, run.user_id
    from public.focus_runs as run
    where run.reward_processed_at is null
      and run.abandoned_at is null
      and (
        select count(*)
        from public.focus_sessions as session
        where session.user_id = run.user_id
          and session.focus_run_id = run.id
          and session.session_type = 'focus'
          and session.completed
          and session.planned_seconds = run.focus_seconds_per_stack
          and session.focused_seconds = run.focus_seconds_per_stack
      ) >= run.required_stack_count
      and (
        select count(*)
        from public.focus_sessions as session
        where session.user_id = run.user_id
          and session.focus_run_id = run.id
          and session.session_type in ('short_break', 'long_break')
          and session.completed
          and session.planned_seconds = run.break_seconds
          and session.focused_seconds = run.break_seconds
      ) >= run.required_stack_count - 1
    order by run.started_at, run.id
  loop
    result := public.finalize_eligible_focus_run(candidate.id, candidate.user_id);
    if result not in ('awarded', 'already_processed') then
      raise exception 'Could not reconcile eligible Focus run %: %', candidate.id, result;
    end if;
  end loop;
end;
$$;

revoke all on function public.finalize_eligible_focus_run(uuid, uuid) from public, anon, authenticated;
revoke all on function public.auto_finalize_focus_reward_from_session() from public, anon, authenticated;
revoke all on function public.record_focus_session(uuid, uuid, timestamptz, timestamptz, integer, integer, text, boolean) from public, anon;
revoke all on function public.complete_focus_run_and_award(uuid) from public, anon;
grant execute on function public.record_focus_session(uuid, uuid, timestamptz, timestamptz, integer, integer, text, boolean) to authenticated;
grant execute on function public.complete_focus_run_and_award(uuid) to authenticated;
