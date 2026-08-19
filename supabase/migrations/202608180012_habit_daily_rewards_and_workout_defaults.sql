update public.workout_routines
set color_token = 'slate'
where color_token <> 'slate';

alter table public.workout_routines
  alter column color_token set default 'slate';

update public.reward_rule_sets set is_active = false where is_active;

insert into public.reward_rule_sets (version, is_active, checksum, rules)
select
  '2026-08-18.2',
  true,
  'rewards-v2-daily-habits-10-silver-2-gold',
  rules || '{"habits":{"daily_completion":{"silver":10,"gold":2}}}'::jsonb
from public.reward_rule_sets
where version = '2026-08-18.1';

alter table public.reward_transactions
  drop constraint if exists reward_transactions_reason_check;

alter table public.reward_transactions
  add constraint reward_transactions_reason_check check (reason in (
    'focus_base', 'focus_description_bonus', 'focus_daily_40_bonus',
    'strength_reward', 'cardio_reward', 'cardio_monthly_bonus',
    'habit_daily_completion', 'habit_daily_completion_revoked',
    'silver_store_purchase', 'gold_store_purchase',
    'silver_to_gold_conversion', 'gold_to_silver_conversion', 'admin_adjustment'
  ));

create table public.habit_daily_reward_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  awarded boolean not null default false,
  award_cycle integer not null default 0 check (award_cycle >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

alter table public.habit_daily_reward_states enable row level security;

create policy "habit_daily_reward_states_select_own"
on public.habit_daily_reward_states for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.habit_daily_reward_states to authenticated;
revoke insert, update, delete on public.habit_daily_reward_states from authenticated;
revoke all on public.habit_daily_reward_states from anon;

create function public.protect_pending_habit_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_time_zone text;
  v_today date;
  v_reserved_silver bigint := 0;
  v_reserved_gold bigint := 0;
begin
  if new.silver_balance >= old.silver_balance and new.gold_balance >= old.gold_balance then
    return new;
  end if;

  select coalesce(timezone, 'UTC') into v_time_zone
  from public.profiles where id = new.user_id;
  v_today := (now() at time zone coalesce(v_time_zone, 'UTC'))::date;

  if exists (
    select 1 from public.habit_daily_reward_states
    where user_id = new.user_id and local_date = v_today and awarded
  ) then
    select
      (rules #>> '{habits,daily_completion,silver}')::bigint,
      (rules #>> '{habits,daily_completion,gold}')::bigint
    into v_reserved_silver, v_reserved_gold
    from public.reward_rule_sets where is_active;
  end if;

  if new.silver_balance < coalesce(v_reserved_silver, 0) or new.gold_balance < coalesce(v_reserved_gold, 0) then
    raise exception 'Today''s Habit reward remains reserved until the local day closes.';
  end if;
  return new;
end;
$$;

create trigger reward_wallets_protect_pending_habit_reward
before update on public.reward_wallets
for each row execute function public.protect_pending_habit_reward();

create function public.evaluate_habit_daily_reward(p_user_id uuid, p_local_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_time_zone text;
  v_today date;
  v_scheduled integer;
  v_completed integer;
  v_is_complete boolean;
  v_awarded boolean;
  v_cycle integer;
  v_rule_version text;
  v_silver bigint;
  v_gold bigint;
  v_silver_balance bigint;
  v_gold_balance bigint;
begin
  select coalesce(timezone, 'UTC') into v_time_zone
  from public.profiles where id = p_user_id;
  v_time_zone := coalesce(v_time_zone, 'UTC');
  v_today := (now() at time zone v_time_zone)::date;

  if p_local_date <> v_today then return; end if;

  select
    count(*)::integer,
    count(*) filter (where exists (
      select 1 from public.habit_logs l
      where l.user_id = h.user_id
        and l.habit_id = h.id
        and l.local_date = p_local_date
        and l.status = 'completed'
        and l.count >= h.target_count
    ))::integer
  into v_scheduled, v_completed
  from public.habits h
  where h.user_id = p_user_id
    and h.is_active
    and (
      h.schedule_type = 'daily'
      or (h.schedule_type = 'weekdays' and extract(dow from p_local_date)::smallint = any(h.weekdays))
    );

  v_is_complete := v_scheduled > 0 and v_completed = v_scheduled;

  if v_is_complete then
    insert into public.habit_daily_reward_states(user_id, local_date)
    values (p_user_id, p_local_date)
    on conflict (user_id, local_date) do nothing;
  end if;

  select awarded, award_cycle into v_awarded, v_cycle
  from public.habit_daily_reward_states
  where user_id = p_user_id and local_date = p_local_date
  for update;

  if not found or v_is_complete = v_awarded then return; end if;

  select
    version,
    (rules #>> '{habits,daily_completion,silver}')::bigint,
    (rules #>> '{habits,daily_completion,gold}')::bigint
  into v_rule_version, v_silver, v_gold
  from public.reward_rule_sets where is_active;

  if v_rule_version is null or v_silver is null or v_gold is null then
    raise exception 'Active habit reward rule is unavailable.';
  end if;

  insert into public.reward_wallets(user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  if v_is_complete then
    v_cycle := v_cycle + 1;
  else
    v_silver := -v_silver;
    v_gold := -v_gold;
    update public.habit_daily_reward_states
    set awarded = false, updated_at = now()
    where user_id = p_user_id and local_date = p_local_date;
  end if;

  update public.reward_wallets
  set silver_balance = silver_balance + v_silver,
      gold_balance = gold_balance + v_gold,
      version = version + 1,
      updated_at = now()
  where user_id = p_user_id
  returning silver_balance, gold_balance into v_silver_balance, v_gold_balance;

  insert into public.reward_transactions(
    user_id, reason, silver_delta, gold_delta, silver_balance_after, gold_balance_after,
    source_type, source_key, rule_version, metadata
  ) values (
    p_user_id,
    case when v_is_complete then 'habit_daily_completion' else 'habit_daily_completion_revoked' end,
    v_silver, v_gold, v_silver_balance, v_gold_balance,
    'habit_day', p_local_date::text || ':' || v_cycle::text, v_rule_version,
    jsonb_build_object('local_date', p_local_date, 'award_cycle', v_cycle)
  );

  update public.habit_daily_reward_states
  set awarded = v_is_complete, award_cycle = v_cycle, updated_at = now()
  where user_id = p_user_id and local_date = p_local_date;
end;
$$;

create function public.sync_habit_daily_reward_from_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.evaluate_habit_daily_reward(
    coalesce(new.user_id, old.user_id),
    coalesce(new.local_date, old.local_date)
  );
  return coalesce(new, old);
end;
$$;

create trigger habit_logs_sync_daily_reward
after insert or update or delete on public.habit_logs
for each row execute function public.sync_habit_daily_reward_from_log();

revoke all on function public.evaluate_habit_daily_reward(uuid, date) from public, anon, authenticated;
revoke all on function public.sync_habit_daily_reward_from_log() from public, anon, authenticated;
revoke all on function public.protect_pending_habit_reward() from public, anon, authenticated;
