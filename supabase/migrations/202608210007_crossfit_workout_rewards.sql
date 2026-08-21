alter table public.reward_monthly_counters
  add column crossfit_rewarded_count integer not null default 0,
  add constraint reward_monthly_counters_crossfit_rewarded_count_valid
    check (crossfit_rewarded_count >= 0);

alter table public.reward_transactions
  drop constraint if exists reward_transactions_reason_check;
alter table public.reward_transactions
  add constraint reward_transactions_reason_check check (reason in (
    'focus_base', 'focus_description_bonus', 'focus_daily_40_bonus',
    'strength_reward', 'cardio_reward', 'crossfit_reward', 'cardio_monthly_bonus',
    'habit_daily_completion', 'habit_daily_completion_revoked',
    'silver_store_purchase', 'gold_store_purchase',
    'silver_to_gold_conversion', 'gold_to_silver_conversion', 'admin_adjustment'
  ));

do $$
declare
  previous_rules jsonb;
begin
  select rules into previous_rules
  from public.reward_rule_sets
  where is_active
  for update;
  if not found then raise exception 'Active reward rule is unavailable.'; end if;

  update public.reward_rule_sets set is_active = false where is_active;
  insert into public.reward_rule_sets(version, is_active, rules, checksum)
  values (
    '2026-08-21.2',
    true,
    jsonb_set(
      previous_rules,
      '{workout,crossfit}',
      '{"silver":2,"gold":4,"monthly_limit":25}'::jsonb,
      true
    ),
    'rewards-v2-crossfit-same-base-as-strength-and-cardio'
  );
end;
$$;

create or replace function public.finalize_eligible_workout_reward(
  p_session_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.workout_sessions%rowtype;
  wallet public.reward_wallets%rowtype;
  counter public.reward_monthly_counters%rowtype;
  rule public.reward_rule_sets%rowtype;
  activity_rule jsonb;
  reward_reason text;
  profile_timezone text;
  completion_at timestamptz;
  v_local_day date;
  v_local_month date;
  predominant_mode text;
  gold_cap integer;
  monthly_limit integer;
  monthly_count integer;
  local_count integer;
  silver_award integer;
  gold_award integer;
  bonus_silver integer := 0;
  bonus_gold integer := 0;
begin
  if p_user_id is null then return 'missing_user'; end if;

  if exists (
    select 1 from public.reward_transactions
    where user_id = p_user_id
      and source_type = 'workout_session'
      and source_key = p_session_id::text
      and reason in ('strength_reward', 'cardio_reward', 'crossfit_reward')
  ) then return 'already_processed'; end if;

  select * into target_session
  from public.workout_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then return 'not_found'; end if;
  if target_session.status <> 'completed' then return 'not_completed'; end if;
  if target_session.activity_type not in ('strength', 'cardio', 'crossfit') then return 'invalid_activity'; end if;

  if exists (
    select 1 from public.reward_transactions
    where user_id = p_user_id
      and source_type = 'workout_session'
      and source_key = p_session_id::text
      and reason in ('strength_reward', 'cardio_reward', 'crossfit_reward')
  ) then return 'already_processed'; end if;

  select * into rule from public.reward_rule_sets where is_active;
  if not found then raise exception 'Active reward rule is unavailable.'; end if;

  activity_rule := rule.rules -> 'workout' -> target_session.activity_type;
  if activity_rule is null then raise exception 'Workout reward rule is unavailable.'; end if;

  if target_session.activity_type = 'cardio'
    and target_session.duration_seconds < (activity_rule ->> 'minimum_seconds')::integer then
    return 'cardio_too_short';
  end if;

  select coalesce(timezone, 'UTC') into profile_timezone
  from public.profiles
  where id = p_user_id;
  profile_timezone := coalesce(profile_timezone, 'UTC');
  completion_at := coalesce(target_session.ended_at, target_session.started_at);
  v_local_day := timezone(profile_timezone, completion_at)::date;
  v_local_month := date_trunc('month', v_local_day::timestamp)::date;

  reward_reason := case target_session.activity_type
    when 'strength' then 'strength_reward'
    when 'cardio' then 'cardio_reward'
    else 'crossfit_reward'
  end;

  insert into public.reward_wallets(user_id)
  values(p_user_id)
  on conflict do nothing;

  insert into public.reward_monthly_counters(user_id, local_month)
  values(p_user_id, v_local_month)
  on conflict do nothing;

  select * into wallet
  from public.reward_wallets
  where user_id = p_user_id
  for update;

  select * into counter
  from public.reward_monthly_counters
  where user_id = p_user_id and local_month = v_local_month
  for update;

  select count(*)::integer into local_count
  from public.reward_transactions
  where user_id = p_user_id
    and reason = reward_reason
    and metadata ->> 'local_day' = v_local_day::text;
  if local_count > 0 then return 'daily_limit'; end if;

  monthly_limit := (activity_rule ->> 'monthly_limit')::integer;
  monthly_count := case target_session.activity_type
    when 'strength' then counter.strength_rewarded_count
    when 'cardio' then counter.cardio_rewarded_count
    else counter.crossfit_rewarded_count
  end;
  if monthly_count >= monthly_limit then return 'monthly_limit'; end if;

  silver_award := (activity_rule ->> 'silver')::integer;
  predominant_mode := public.reward_predominant_mode(counter);
  gold_cap := (rule.rules #>> array['focus_modes', predominant_mode, 'gold_cap'])::integer;
  gold_award := least(
    (activity_rule ->> 'gold')::integer,
    greatest(0, gold_cap - counter.gold_credited)
  );

  if target_session.activity_type = 'cardio'
    and counter.cardio_rewarded_count = monthly_limit - 1
    and not counter.cardio_monthly_bonus_granted then
    bonus_silver := (activity_rule ->> 'monthly_bonus_silver')::integer;
    bonus_gold := least(
      (activity_rule ->> 'monthly_bonus_gold')::integer,
      greatest(0, gold_cap - counter.gold_credited - gold_award)
    );
  end if;

  update public.reward_wallets
  set silver_balance = silver_balance + silver_award + bonus_silver,
      gold_balance = gold_balance + gold_award + bonus_gold,
      version = version + 1
  where user_id = p_user_id
  returning * into wallet;

  update public.reward_monthly_counters
  set gold_credited = gold_credited + gold_award + bonus_gold,
      strength_rewarded_count = strength_rewarded_count
        + case when target_session.activity_type = 'strength' then 1 else 0 end,
      cardio_rewarded_count = cardio_rewarded_count
        + case when target_session.activity_type = 'cardio' then 1 else 0 end,
      crossfit_rewarded_count = crossfit_rewarded_count
        + case when target_session.activity_type = 'crossfit' then 1 else 0 end,
      cardio_monthly_bonus_granted = cardio_monthly_bonus_granted or bonus_silver > 0
  where id = counter.id;

  insert into public.reward_transactions(
    user_id, reason, silver_delta, gold_delta, silver_balance_after, gold_balance_after,
    source_type, source_key, source_id, rule_version, metadata
  ) values (
    p_user_id, reward_reason, silver_award, gold_award,
    wallet.silver_balance - bonus_silver, wallet.gold_balance - bonus_gold,
    'workout_session', p_session_id::text, p_session_id, rule.version,
    jsonb_build_object(
      'activity_type', target_session.activity_type,
      'local_day', v_local_day,
      'reconciled_after_completion', completion_at < clock_timestamp() - interval '1 minute'
    )
  );

  if bonus_silver > 0 or bonus_gold > 0 then
    insert into public.reward_transactions(
      user_id, reason, silver_delta, gold_delta, silver_balance_after, gold_balance_after,
      source_type, source_key, source_id, rule_version, metadata
    ) values (
      p_user_id, 'cardio_monthly_bonus', bonus_silver, bonus_gold,
      wallet.silver_balance, wallet.gold_balance,
      'workout_session', 'cardio:' || v_local_month, p_session_id, rule.version,
      jsonb_build_object('local_month', v_local_month)
    );
  end if;

  return 'awarded';
end;
$$;

create or replace function public.award_workout_rewards(p_session_id uuid)
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

  result := public.finalize_eligible_workout_reward(p_session_id, current_user_id);
  if result = 'not_found' then raise exception 'Workout session was not found.'; end if;
  if result = 'not_completed' then raise exception 'A completed workout session is required.'; end if;
  if result in ('missing_user', 'invalid_activity') then raise exception 'The workout is not eligible for rewards.'; end if;

  if result in ('cardio_too_short', 'daily_limit', 'monthly_limit') then
    return jsonb_build_object('eligible', false, 'reason', result);
  end if;

  return public.get_reward_dashboard(30);
end;
$$;

create or replace function public.award_completed_workout_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'completed' and new.status = 'completed' then
    perform public.finalize_eligible_workout_reward(new.id, new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.reconcile_unrewarded_crossfit_workout_rewards(
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
  awarded_count integer := 0;
begin
  for candidate in
    select session.id, session.user_id
    from public.workout_sessions as session
    where session.status = 'completed'
      and session.activity_type = 'crossfit'
      and (p_user_id is null or session.user_id = p_user_id)
      and not exists (
        select 1
        from public.reward_transactions as reward
        where reward.user_id = session.user_id
          and reward.source_type = 'workout_session'
          and reward.source_key = session.id::text
          and reward.reason in ('strength_reward', 'cardio_reward', 'crossfit_reward')
      )
    order by session.ended_at, session.id
  loop
    result := public.finalize_eligible_workout_reward(candidate.id, candidate.user_id);
    if result = 'awarded' then
      awarded_count := awarded_count + 1;
    elsif result not in ('already_processed', 'daily_limit', 'monthly_limit') then
      raise exception 'Could not reconcile CrossFit workout %: %', candidate.id, result;
    end if;
  end loop;
  return awarded_count;
end;
$$;

do $$
declare
  awarded_count integer;
begin
  awarded_count := public.reconcile_unrewarded_crossfit_workout_rewards(null);
  raise notice 'Retroactively awarded % completed CrossFit workout(s).', awarded_count;
end;
$$;

revoke all on function public.finalize_eligible_workout_reward(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.reconcile_unrewarded_crossfit_workout_rewards(uuid)
from public, anon, authenticated;
revoke all on function public.award_completed_workout_trigger()
from public, anon, authenticated;
revoke all on function public.award_workout_rewards(uuid) from public, anon;
grant execute on function public.award_workout_rewards(uuid) to authenticated;
