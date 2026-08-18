create table public.reward_rule_sets (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  is_active boolean not null default false,
  rules jsonb not null,
  checksum text not null,
  created_at timestamptz not null default now(),
  constraint reward_rule_sets_rules_object check (jsonb_typeof(rules) = 'object')
);

create unique index reward_rule_sets_one_active_idx
  on public.reward_rule_sets (is_active) where is_active;

insert into public.reward_rule_sets (version, is_active, checksum, rules)
values (
  '2026-08-18.1',
  true,
  'rewards-v1-brl-redemption-cost-plus-40-percent-ceil',
  $$
  {
    "pricing_note": "BRL credit values are unchanged. Coin costs are 40% above the original catalog; fractional Silver costs round up.",
    "focus_modes": {
      "25_5": {"focus_seconds": 1500, "break_seconds": 300, "required_stacks": 3, "silver": 2, "gold": 1, "focus_silver_cap": 150, "gold_cap": 100},
      "30_5": {"focus_seconds": 1800, "break_seconds": 300, "required_stacks": 4, "silver": 4, "gold": 3, "focus_silver_cap": 200, "gold_cap": 150},
      "40_5": {"focus_seconds": 2400, "break_seconds": 300, "required_stacks": 5, "silver": 6, "gold": 5, "focus_silver_cap": 250, "gold_cap": 200}
    },
    "focus_description_min_codepoints": 500,
    "focus_description_silver": 1,
    "focus_daily_40_silver": 1,
    "workout": {
      "strength": {"silver": 2, "gold": 4, "monthly_limit": 25},
      "cardio": {"silver": 2, "gold": 4, "minimum_seconds": 1800, "monthly_limit": 15, "monthly_bonus_silver": 20, "monthly_bonus_gold": 40}
    },
    "conversion": {"silver_per_gold": 20, "gold_to_silver": 10, "monthly_operations": 5},
    "catalog": [
      {"sku":"silver-005","currency":"silver","credit_cents":500,"coins":10},
      {"sku":"silver-007","currency":"silver","credit_cents":700,"coins":14},
      {"sku":"silver-010","currency":"silver","credit_cents":1000,"coins":21},
      {"sku":"silver-015","currency":"silver","credit_cents":1500,"coins":31},
      {"sku":"silver-020","currency":"silver","credit_cents":2000,"coins":42},
      {"sku":"silver-030","currency":"silver","credit_cents":3000,"coins":63},
      {"sku":"silver-040","currency":"silver","credit_cents":4000,"coins":84},
      {"sku":"silver-050","currency":"silver","credit_cents":5000,"coins":98},
      {"sku":"silver-060","currency":"silver","credit_cents":6000,"coins":119},
      {"sku":"silver-070","currency":"silver","credit_cents":7000,"coins":140},
      {"sku":"silver-080","currency":"silver","credit_cents":8000,"coins":161},
      {"sku":"silver-090","currency":"silver","credit_cents":9000,"coins":182},
      {"sku":"silver-100","currency":"silver","credit_cents":10000,"coins":203},
      {"sku":"gold-100","currency":"gold","credit_cents":10000,"coins":210},
      {"sku":"gold-200","currency":"gold","credit_cents":20000,"coins":420},
      {"sku":"gold-300","currency":"gold","credit_cents":30000,"coins":630},
      {"sku":"gold-500","currency":"gold","credit_cents":50000,"coins":1050},
      {"sku":"gold-800","currency":"gold","credit_cents":80000,"coins":1680},
      {"sku":"gold-1000","currency":"gold","credit_cents":100000,"coins":2100},
      {"sku":"gold-1500","currency":"gold","credit_cents":150000,"coins":3150},
      {"sku":"gold-2000","currency":"gold","credit_cents":200000,"coins":4200},
      {"sku":"gold-3000","currency":"gold","credit_cents":300000,"coins":6300},
      {"sku":"gold-4000","currency":"gold","credit_cents":400000,"coins":8400}
    ]
  }
  $$::jsonb
);

create table public.reward_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  silver_balance bigint not null default 0 check (silver_balance >= 0),
  gold_balance bigint not null default 0 check (gold_balance >= 0),
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_monthly_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_month date not null,
  focus_25_5_completed integer not null default 0 check (focus_25_5_completed >= 0),
  focus_30_5_completed integer not null default 0 check (focus_30_5_completed >= 0),
  focus_40_5_completed integer not null default 0 check (focus_40_5_completed >= 0),
  focus_silver_credited integer not null default 0 check (focus_silver_credited >= 0),
  gold_credited integer not null default 0 check (gold_credited >= 0),
  strength_rewarded_count integer not null default 0 check (strength_rewarded_count >= 0),
  cardio_rewarded_count integer not null default 0 check (cardio_rewarded_count >= 0),
  cardio_monthly_bonus_granted boolean not null default false,
  conversion_count integer not null default 0 check (conversion_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_monthly_counters_owner_month unique (user_id, local_month)
);

create index reward_monthly_counters_user_month_idx
  on public.reward_monthly_counters (user_id, local_month desc);

create table public.reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in (
    'focus_base', 'focus_description_bonus', 'focus_daily_40_bonus',
    'strength_reward', 'cardio_reward', 'cardio_monthly_bonus',
    'silver_store_purchase', 'gold_store_purchase',
    'silver_to_gold_conversion', 'gold_to_silver_conversion', 'admin_adjustment'
  )),
  silver_delta bigint not null default 0,
  gold_delta bigint not null default 0,
  silver_balance_after bigint not null check (silver_balance_after >= 0),
  gold_balance_after bigint not null check (gold_balance_after >= 0),
  source_type text not null,
  source_key text not null,
  source_id uuid,
  rule_version text not null references public.reward_rule_sets(version),
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint reward_transactions_nonzero_delta check (silver_delta <> 0 or gold_delta <> 0),
  constraint reward_transactions_source_key_not_blank check (char_length(btrim(source_key)) between 1 and 200),
  constraint reward_transactions_exactly_once unique (user_id, reason, source_key)
);

create index reward_transactions_user_created_idx
  on public.reward_transactions (user_id, created_at desc);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_sku text not null,
  currency text not null check (currency in ('silver', 'gold')),
  coins_spent bigint not null check (coins_spent > 0),
  credit_cents integer not null check (credit_cents > 0),
  status text not null default 'requested' check (status in ('requested', 'fulfilled', 'cancelled')),
  rule_version text not null references public.reward_rule_sets(version),
  request_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_redemptions_request_once unique (user_id, request_key)
);

create index reward_redemptions_user_created_idx
  on public.reward_redemptions (user_id, created_at desc);

create table public.focus_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('25_5', '30_5', '40_5', 'other')),
  focus_seconds_per_stack integer not null check (focus_seconds_per_stack between 60 and 10800),
  break_seconds integer not null check (break_seconds between 0 and 3600),
  required_stack_count integer not null check (required_stack_count between 1 and 20),
  completed_stack_count integer not null default 0 check (completed_stack_count >= 0 and completed_stack_count <= required_stack_count),
  description text check (description is null or char_length(description) <= 10000),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  reward_processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint focus_runs_owner_identity unique (id, user_id),
  constraint focus_runs_end_state check (completed_at is null or abandoned_at is null)
);

create unique index focus_runs_one_active_per_user_idx
  on public.focus_runs (user_id) where completed_at is null and abandoned_at is null;
create index focus_runs_user_completed_idx on public.focus_runs (user_id, completed_at desc);

alter table public.focus_sessions
  add column focus_run_id uuid,
  add constraint focus_sessions_run_owner_fk foreign key (focus_run_id, user_id)
    references public.focus_runs(id, user_id) on delete set null (focus_run_id);

create index focus_sessions_run_idx on public.focus_sessions (focus_run_id, started_at);
alter table public.focus_sessions add constraint focus_sessions_reward_phase_once
  unique (user_id, focus_run_id, started_at, session_type);

alter table public.workout_routines
  add column activity_type text not null default 'strength'
  check (activity_type in ('strength', 'cardio'));

alter table public.workout_sessions
  add column activity_type text not null default 'strength'
  check (activity_type in ('strength', 'cardio'));

create index workout_sessions_reward_source_idx
  on public.workout_sessions (user_id, activity_type, ended_at desc) where status = 'completed';

create or replace function public.snapshot_workout_activity_type()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.routine_id is not null then
    select activity_type into new.activity_type
    from public.workout_routines
    where id = new.routine_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger workout_sessions_snapshot_activity_type
before insert on public.workout_sessions
for each row execute function public.snapshot_workout_activity_type();

create or replace function public.protect_workout_activity_type()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.activity_type is distinct from old.activity_type then
    raise exception 'A workout session activity type is immutable.';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_protect_activity_type
before update of activity_type on public.workout_sessions
for each row execute function public.protect_workout_activity_type();

create trigger reward_wallets_set_updated_at before update on public.reward_wallets
for each row execute function public.set_updated_at();
create trigger reward_monthly_counters_set_updated_at before update on public.reward_monthly_counters
for each row execute function public.set_updated_at();
create trigger reward_redemptions_set_updated_at before update on public.reward_redemptions
for each row execute function public.set_updated_at();

create or replace function public.reject_reward_ledger_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Reward transactions are immutable.';
end;
$$;

create trigger reward_transactions_immutable
before update or delete on public.reward_transactions
for each row execute function public.reject_reward_ledger_mutation();

create or replace function public.reward_local_period(p_user_id uuid, out local_day date, out local_month date)
language plpgsql security definer set search_path = '' as $$
declare profile_timezone text;
begin
  select timezone into profile_timezone from public.profiles where id = p_user_id;
  profile_timezone := coalesce(profile_timezone, 'UTC');
  local_day := timezone(profile_timezone, clock_timestamp())::date;
  local_month := date_trunc('month', local_day::timestamp)::date;
end;
$$;

create or replace function public.reward_predominant_mode(p_counter public.reward_monthly_counters)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_counter.focus_40_5_completed > greatest(p_counter.focus_25_5_completed, p_counter.focus_30_5_completed) then '40_5'
    when p_counter.focus_30_5_completed > p_counter.focus_25_5_completed
      and p_counter.focus_30_5_completed >= p_counter.focus_40_5_completed then '30_5'
    else '25_5'
  end
$$;

create or replace function public.get_reward_dashboard(p_history_limit integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  period record;
  wallet public.reward_wallets%rowtype;
  counter public.reward_monthly_counters%rowtype;
  rule public.reward_rule_sets%rowtype;
  mode text;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_history_limit < 1 or p_history_limit > 100 then raise exception 'History limit must be between 1 and 100.'; end if;
  select * into period from public.reward_local_period(current_user_id);
  insert into public.reward_wallets (user_id) values (current_user_id) on conflict do nothing;
  insert into public.reward_monthly_counters (user_id, local_month)
    values (current_user_id, period.local_month) on conflict (user_id, local_month) do nothing;
  select * into wallet from public.reward_wallets where user_id = current_user_id;
  select * into counter from public.reward_monthly_counters where user_id = current_user_id and local_month = period.local_month;
  select * into rule from public.reward_rule_sets where is_active;
  mode := public.reward_predominant_mode(counter);
  return jsonb_build_object(
    'wallet', to_jsonb(wallet),
    'counter', to_jsonb(counter),
    'local_day', period.local_day,
    'predominant_mode', mode,
    'focus_silver_cap', (rule.rules #>> array['focus_modes', mode, 'focus_silver_cap'])::integer,
    'gold_cap', (rule.rules #>> array['focus_modes', mode, 'gold_cap'])::integer,
    'rule', jsonb_build_object('version', rule.version, 'rules', rule.rules),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from (select * from public.reward_transactions where user_id = current_user_id order by created_at desc limit p_history_limit) t), '[]'::jsonb),
    'redemptions', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (select * from public.reward_redemptions where user_id = current_user_id order by created_at desc limit 50) r), '[]'::jsonb)
  );
end;
$$;

create or replace function public.convert_reward_currency(
  p_direction text,
  p_units integer,
  p_request_key uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid(); period record; wallet public.reward_wallets%rowtype;
  counter public.reward_monthly_counters%rowtype; rule public.reward_rule_sets%rowtype;
  mode text; silver_delta bigint; gold_delta bigint; gold_cap integer; v_source_key text := p_request_key::text;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_units < 1 or p_units > 1000000 then raise exception 'Conversion units are invalid.'; end if;
  if p_direction not in ('silver_to_gold', 'gold_to_silver') then raise exception 'Conversion direction is invalid.'; end if;
  if exists (select 1 from public.reward_transactions where user_id=current_user_id and source_type='conversion' and source_key=v_source_key) then
    return public.get_reward_dashboard(30);
  end if;
  select * into period from public.reward_local_period(current_user_id);
  insert into public.reward_wallets(user_id) values(current_user_id) on conflict do nothing;
  insert into public.reward_monthly_counters(user_id,local_month) values(current_user_id,period.local_month) on conflict do nothing;
  select * into wallet from public.reward_wallets where user_id=current_user_id for update;
  select * into counter from public.reward_monthly_counters where user_id=current_user_id and local_month=period.local_month for update;
  if exists (select 1 from public.reward_transactions where user_id=current_user_id and source_type='conversion' and source_key=v_source_key) then
    return public.get_reward_dashboard(30);
  end if;
  select * into rule from public.reward_rule_sets where is_active;
  if counter.conversion_count >= (rule.rules #>> '{conversion,monthly_operations}')::integer then raise exception 'Monthly conversion limit reached.'; end if;
  if p_direction='silver_to_gold' then
    silver_delta := -p_units * (rule.rules #>> '{conversion,silver_per_gold}')::integer;
    gold_delta := p_units;
    mode := public.reward_predominant_mode(counter);
    gold_cap := (rule.rules #>> array['focus_modes',mode,'gold_cap'])::integer;
    if wallet.silver_balance + silver_delta < 0 then raise exception 'Insufficient Silver balance.'; end if;
    if counter.gold_credited + gold_delta > gold_cap then raise exception 'The requested Gold exceeds the monthly cap. Maximum convertible: %.', greatest(0,gold_cap-counter.gold_credited); end if;
  else
    silver_delta := p_units * (rule.rules #>> '{conversion,gold_to_silver}')::integer;
    gold_delta := -p_units;
    if wallet.gold_balance + gold_delta < 0 then raise exception 'Insufficient Gold balance.'; end if;
  end if;
  update public.reward_wallets set silver_balance=silver_balance+silver_delta, gold_balance=gold_balance+gold_delta, version=version+1 where user_id=current_user_id
    returning * into wallet;
  update public.reward_monthly_counters set conversion_count=conversion_count+1,
    gold_credited=gold_credited+greatest(gold_delta,0) where id=counter.id returning * into counter;
  insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,rule_version,metadata)
  values(current_user_id,case when p_direction='silver_to_gold' then 'silver_to_gold_conversion' else 'gold_to_silver_conversion' end,
    silver_delta,gold_delta,wallet.silver_balance,wallet.gold_balance,'conversion',v_source_key,rule.version,jsonb_build_object('units',p_units,'local_month',period.local_month));
  return public.get_reward_dashboard(30);
end;
$$;

create or replace function public.redeem_reward_credit(p_catalog_sku text, p_request_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid(); wallet public.reward_wallets%rowtype; rule public.reward_rule_sets%rowtype;
  item jsonb; redemption_id uuid; reason text;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if exists(select 1 from public.reward_redemptions where user_id=current_user_id and request_key=p_request_key) then return public.get_reward_dashboard(30); end if;
  select * into rule from public.reward_rule_sets where is_active;
  select value into item from jsonb_array_elements(rule.rules->'catalog') where value->>'sku'=p_catalog_sku;
  if item is null then raise exception 'Credit SKU is not available.'; end if;
  insert into public.reward_wallets(user_id) values(current_user_id) on conflict do nothing;
  select * into wallet from public.reward_wallets where user_id=current_user_id for update;
  if exists(select 1 from public.reward_redemptions where user_id=current_user_id and request_key=p_request_key) then return public.get_reward_dashboard(30); end if;
  if item->>'currency'='silver' then
    if wallet.silver_balance < (item->>'coins')::bigint then raise exception 'Insufficient Silver balance.'; end if;
    update public.reward_wallets set silver_balance=silver_balance-(item->>'coins')::bigint,version=version+1 where user_id=current_user_id returning * into wallet;
    reason := 'silver_store_purchase';
  else
    if wallet.gold_balance < (item->>'coins')::bigint then raise exception 'Insufficient Gold balance.'; end if;
    update public.reward_wallets set gold_balance=gold_balance-(item->>'coins')::bigint,version=version+1 where user_id=current_user_id returning * into wallet;
    reason := 'gold_store_purchase';
  end if;
  insert into public.reward_redemptions(user_id,catalog_sku,currency,coins_spent,credit_cents,rule_version,request_key)
  values(current_user_id,p_catalog_sku,item->>'currency',(item->>'coins')::bigint,(item->>'credit_cents')::integer,rule.version,p_request_key)
  returning id into redemption_id;
  insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,source_id,rule_version,metadata)
  values(current_user_id,reason,case when item->>'currency'='silver' then -(item->>'coins')::bigint else 0 end,
    case when item->>'currency'='gold' then -(item->>'coins')::bigint else 0 end,wallet.silver_balance,wallet.gold_balance,
    'redemption',p_request_key::text,redemption_id,rule.version,jsonb_build_object('sku',p_catalog_sku,'credit_cents',(item->>'credit_cents')::integer));
  return public.get_reward_dashboard(30);
end;
$$;

create or replace function public.start_focus_run(p_mode text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid:=auth.uid(); rule public.reward_rule_sets%rowtype; mode_rule jsonb; run_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_mode not in ('25_5','30_5','40_5') then raise exception 'Reward Focus mode is invalid.'; end if;
  if p_description is not null and char_length(p_description)>10000 then raise exception 'Focus description is too long.'; end if;
  select id into run_id from public.focus_runs where user_id=current_user_id and completed_at is null and abandoned_at is null and mode=p_mode;
  if run_id is not null then return run_id; end if;
  update public.focus_runs set abandoned_at=clock_timestamp()
    where user_id=current_user_id and completed_at is null and abandoned_at is null;
  select * into rule from public.reward_rule_sets where is_active;
  mode_rule:=rule.rules->'focus_modes'->p_mode;
  insert into public.focus_runs(user_id,mode,focus_seconds_per_stack,break_seconds,required_stack_count,description)
  values(current_user_id,p_mode,(mode_rule->>'focus_seconds')::integer,(mode_rule->>'break_seconds')::integer,
    (mode_rule->>'required_stacks')::integer,nullif(btrim(p_description),'')) returning id into run_id;
  return run_id;
end;
$$;

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
returns public.focus_sessions language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid:=auth.uid(); target_run public.focus_runs%rowtype; saved public.focus_sessions%rowtype;
  expected_seconds integer;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_session_type not in ('focus','short_break','long_break') then raise exception 'Focus phase is invalid.'; end if;
  if p_planned_seconds<1 or p_planned_seconds>86400 or p_focused_seconds<0 or p_focused_seconds>p_planned_seconds then raise exception 'Focus duration is invalid.'; end if;
  if p_ended_at<p_started_at or p_ended_at>clock_timestamp()+interval '5 minutes' then raise exception 'Focus timestamps are invalid.'; end if;
  if p_completed and p_focused_seconds<>p_planned_seconds then raise exception 'A completed phase must reach its planned duration.'; end if;
  if p_completed and extract(epoch from (p_ended_at-p_started_at))::integer < p_planned_seconds then raise exception 'The completed phase elapsed too quickly.'; end if;
  if p_task_id is not null and p_session_type<>'focus' then raise exception 'Only Focus phases can link a task.'; end if;
  if p_focus_run_id is not null then
    select * into target_run from public.focus_runs where id=p_focus_run_id and user_id=current_user_id for update;
    if not found or target_run.completed_at is not null or target_run.abandoned_at is not null then raise exception 'The Focus run is not active.'; end if;
    expected_seconds:=case when p_session_type='focus' then target_run.focus_seconds_per_stack else target_run.break_seconds end;
    if p_planned_seconds<>expected_seconds then raise exception 'The phase duration does not match its durable Focus run.'; end if;
  end if;
  insert into public.focus_sessions(user_id,focus_run_id,task_id,started_at,ended_at,planned_seconds,focused_seconds,session_type,completed)
  values(current_user_id,p_focus_run_id,p_task_id,p_started_at,p_ended_at,p_planned_seconds,p_focused_seconds,p_session_type,p_completed)
  on conflict (user_id,focus_run_id,started_at,session_type) do update set created_at=public.focus_sessions.created_at
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.abandon_focus_run(p_run_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  update public.focus_runs set abandoned_at=clock_timestamp()
  where id=p_run_id and user_id=auth.uid() and completed_at is null and abandoned_at is null;
end;
$$;

create or replace function public.complete_focus_run_and_award(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid:=auth.uid(); run public.focus_runs%rowtype; period record; wallet public.reward_wallets%rowtype;
  counter public.reward_monthly_counters%rowtype; rule public.reward_rule_sets%rowtype; mode text; mode_rule jsonb;
  stack_count integer; break_count integer; silver_room integer; gold_room integer; base_silver integer; base_gold integer;
  desc_silver integer:=0; daily_silver integer:=0; local_40_count integer; source_key text;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into run from public.focus_runs where id=p_run_id and user_id=current_user_id for update;
  if not found then raise exception 'Focus run was not found.'; end if;
  if run.abandoned_at is not null then raise exception 'An abandoned Focus run is not eligible.'; end if;
  if run.reward_processed_at is not null then return public.get_reward_dashboard(30); end if;
  select count(*)::integer into stack_count from public.focus_sessions
   where user_id=current_user_id and focus_run_id=p_run_id and session_type='focus' and completed
     and planned_seconds=run.focus_seconds_per_stack and focused_seconds=run.focus_seconds_per_stack;
  if stack_count < run.required_stack_count then raise exception 'Complete every Focus stack before claiming rewards.'; end if;
  select count(*)::integer into break_count from public.focus_sessions
   where user_id=current_user_id and focus_run_id=p_run_id and session_type in ('short_break','long_break') and completed
     and planned_seconds=run.break_seconds and focused_seconds=run.break_seconds;
  if break_count < run.required_stack_count-1 then raise exception 'Complete every break between Focus stacks before claiming rewards.'; end if;
  select * into period from public.reward_local_period(current_user_id);
  insert into public.reward_wallets(user_id) values(current_user_id) on conflict do nothing;
  insert into public.reward_monthly_counters(user_id,local_month) values(current_user_id,period.local_month) on conflict do nothing;
  select * into wallet from public.reward_wallets where user_id=current_user_id for update;
  select * into counter from public.reward_monthly_counters where user_id=current_user_id and local_month=period.local_month for update;
  select * into rule from public.reward_rule_sets where is_active; mode_rule:=rule.rules->'focus_modes'->run.mode;
  update public.focus_runs set completed_stack_count=required_stack_count,completed_at=clock_timestamp(),reward_processed_at=clock_timestamp() where id=run.id;
  if run.mode='25_5' then counter.focus_25_5_completed:=counter.focus_25_5_completed+1;
  elsif run.mode='30_5' then counter.focus_30_5_completed:=counter.focus_30_5_completed+1;
  else counter.focus_40_5_completed:=counter.focus_40_5_completed+1; end if;
  mode:=public.reward_predominant_mode(counter);
  silver_room:=greatest(0,(rule.rules #>> array['focus_modes',mode,'focus_silver_cap'])::integer-counter.focus_silver_credited);
  gold_room:=greatest(0,(rule.rules #>> array['focus_modes',mode,'gold_cap'])::integer-counter.gold_credited);
  base_silver:=least((mode_rule->>'silver')::integer,silver_room);
  base_gold:=least((mode_rule->>'gold')::integer,gold_room);
  silver_room:=silver_room-base_silver;
  if run.description is not null and char_length(btrim(run.description)) >= (rule.rules->>'focus_description_min_codepoints')::integer then
    desc_silver:=least((rule.rules->>'focus_description_silver')::integer,silver_room); silver_room:=silver_room-desc_silver;
  end if;
  if run.mode='40_5' then
    select count(*)::integer into local_40_count from public.focus_runs
      where user_id=current_user_id and mode='40_5' and completed_at is not null
      and timezone((select timezone from public.profiles where id=current_user_id),completed_at)::date=period.local_day;
    if local_40_count=2 then daily_silver:=least((rule.rules->>'focus_daily_40_silver')::integer,silver_room); end if;
  end if;
  update public.reward_wallets set silver_balance=silver_balance+base_silver+desc_silver+daily_silver,
    gold_balance=gold_balance+base_gold,version=version+1 where user_id=current_user_id returning * into wallet;
  update public.reward_monthly_counters set focus_25_5_completed=counter.focus_25_5_completed,
    focus_30_5_completed=counter.focus_30_5_completed,focus_40_5_completed=counter.focus_40_5_completed,
    focus_silver_credited=focus_silver_credited+base_silver+desc_silver+daily_silver,gold_credited=gold_credited+base_gold
    where id=counter.id;
  source_key:=p_run_id::text;
  if base_silver<>0 or base_gold<>0 then insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,source_id,rule_version,metadata)
    values(current_user_id,'focus_base',base_silver,base_gold,wallet.silver_balance-desc_silver-daily_silver,wallet.gold_balance,'focus_run',source_key,p_run_id,rule.version,jsonb_build_object('mode',run.mode,'local_day',period.local_day)); end if;
  if desc_silver>0 then insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,source_id,rule_version)
    values(current_user_id,'focus_description_bonus',desc_silver,0,wallet.silver_balance-daily_silver,wallet.gold_balance,'focus_run',source_key,p_run_id,rule.version); end if;
  if daily_silver>0 then insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,source_id,rule_version)
    values(current_user_id,'focus_daily_40_bonus',daily_silver,0,wallet.silver_balance,wallet.gold_balance,'focus_run','40_5:'||period.local_day,p_run_id,rule.version); end if;
  return public.get_reward_dashboard(30);
end;
$$;

create or replace function public.award_workout_rewards(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid:=auth.uid(); session public.workout_sessions%rowtype; period record; wallet public.reward_wallets%rowtype;
  counter public.reward_monthly_counters%rowtype; rule public.reward_rule_sets%rowtype; mode text; gold_cap integer;
  silver_award integer:=0; gold_award integer:=0; bonus_silver integer:=0; bonus_gold integer:=0; local_count integer;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if exists(select 1 from public.reward_transactions where user_id=current_user_id and reason in ('strength_reward','cardio_reward') and source_key=p_session_id::text) then return public.get_reward_dashboard(30); end if;
  select * into session from public.workout_sessions where id=p_session_id and user_id=current_user_id for update;
  if not found or session.status<>'completed' then raise exception 'A completed workout session is required.'; end if;
  if exists(select 1 from public.reward_transactions where user_id=current_user_id and reason in ('strength_reward','cardio_reward') and source_key=p_session_id::text) then return public.get_reward_dashboard(30); end if;
  select * into rule from public.reward_rule_sets where is_active;
  if session.activity_type='cardio' and session.duration_seconds<(rule.rules #>> '{workout,cardio,minimum_seconds}')::integer then return jsonb_build_object('eligible',false,'reason','cardio_too_short'); end if;
  select * into period from public.reward_local_period(current_user_id);
  insert into public.reward_wallets(user_id) values(current_user_id) on conflict do nothing;
  insert into public.reward_monthly_counters(user_id,local_month) values(current_user_id,period.local_month) on conflict do nothing;
  select * into wallet from public.reward_wallets where user_id=current_user_id for update;
  select * into counter from public.reward_monthly_counters where user_id=current_user_id and local_month=period.local_month for update;
  select count(*)::integer into local_count from public.reward_transactions where user_id=current_user_id
    and reason=case when session.activity_type='strength' then 'strength_reward' else 'cardio_reward' end
    and metadata->>'local_day'=period.local_day::text;
  if local_count>0 then return jsonb_build_object('eligible',false,'reason','daily_limit'); end if;
  if session.activity_type='strength' and counter.strength_rewarded_count>=(rule.rules #>> '{workout,strength,monthly_limit}')::integer then return jsonb_build_object('eligible',false,'reason','monthly_limit'); end if;
  if session.activity_type='cardio' and counter.cardio_rewarded_count>=(rule.rules #>> '{workout,cardio,monthly_limit}')::integer then return jsonb_build_object('eligible',false,'reason','monthly_limit'); end if;
  silver_award:=(rule.rules #>> array['workout',session.activity_type,'silver'])::integer;
  mode:=public.reward_predominant_mode(counter); gold_cap:=(rule.rules #>> array['focus_modes',mode,'gold_cap'])::integer;
  gold_award:=least((rule.rules #>> array['workout',session.activity_type,'gold'])::integer,greatest(0,gold_cap-counter.gold_credited));
  if session.activity_type='cardio' and counter.cardio_rewarded_count=(rule.rules #>> '{workout,cardio,monthly_limit}')::integer-1 and not counter.cardio_monthly_bonus_granted then
    bonus_silver:=(rule.rules #>> '{workout,cardio,monthly_bonus_silver}')::integer;
    bonus_gold:=least((rule.rules #>> '{workout,cardio,monthly_bonus_gold}')::integer,greatest(0,gold_cap-counter.gold_credited-gold_award));
  end if;
  update public.reward_wallets set silver_balance=silver_balance+silver_award+bonus_silver,
    gold_balance=gold_balance+gold_award+bonus_gold,version=version+1 where user_id=current_user_id returning * into wallet;
  update public.reward_monthly_counters set gold_credited=gold_credited+gold_award+bonus_gold,
    strength_rewarded_count=strength_rewarded_count+case when session.activity_type='strength' then 1 else 0 end,
    cardio_rewarded_count=cardio_rewarded_count+case when session.activity_type='cardio' then 1 else 0 end,
    cardio_monthly_bonus_granted=cardio_monthly_bonus_granted or bonus_silver>0
    where id=counter.id;
  insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,source_id,rule_version,metadata)
  values(current_user_id,case when session.activity_type='strength' then 'strength_reward' else 'cardio_reward' end,
    silver_award,gold_award,wallet.silver_balance-bonus_silver,wallet.gold_balance-bonus_gold,'workout_session',p_session_id::text,p_session_id,rule.version,jsonb_build_object('local_day',period.local_day));
  if bonus_silver>0 or bonus_gold>0 then insert into public.reward_transactions(user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,source_type,source_key,source_id,rule_version,metadata)
    values(current_user_id,'cardio_monthly_bonus',bonus_silver,bonus_gold,wallet.silver_balance,wallet.gold_balance,'workout_session','cardio:'||period.local_month,p_session_id,rule.version,jsonb_build_object('local_month',period.local_month)); end if;
  return public.get_reward_dashboard(30);
end;
$$;

create or replace function public.award_completed_workout_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status <> 'completed' and new.status = 'completed' and auth.uid() = new.user_id then
    perform public.award_workout_rewards(new.id);
  end if;
  return new;
end;
$$;

create trigger workout_sessions_award_rewards
after update of status on public.workout_sessions
for each row execute function public.award_completed_workout_trigger();

alter table public.reward_rule_sets enable row level security;
alter table public.reward_wallets enable row level security;
alter table public.reward_monthly_counters enable row level security;
alter table public.reward_transactions enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.focus_runs enable row level security;

create policy "reward_rules_read_active" on public.reward_rule_sets for select to authenticated using (is_active);
create policy "reward_wallets_select_own" on public.reward_wallets for select to authenticated using ((select auth.uid())=user_id);
create policy "reward_counters_select_own" on public.reward_monthly_counters for select to authenticated using ((select auth.uid())=user_id);
create policy "reward_transactions_select_own" on public.reward_transactions for select to authenticated using ((select auth.uid())=user_id);
create policy "reward_redemptions_select_own" on public.reward_redemptions for select to authenticated using ((select auth.uid())=user_id);
create policy "focus_runs_select_own" on public.focus_runs for select to authenticated using ((select auth.uid())=user_id);

grant select on public.reward_rule_sets,public.reward_wallets,public.reward_monthly_counters,public.reward_transactions,public.reward_redemptions,public.focus_runs to authenticated;
revoke all on public.reward_rule_sets,public.reward_wallets,public.reward_monthly_counters,public.reward_transactions,public.reward_redemptions from anon;
revoke insert,update,delete on public.reward_rule_sets,public.reward_wallets,public.reward_monthly_counters,public.reward_transactions,public.reward_redemptions,public.focus_runs from authenticated;
revoke insert,update,delete on public.focus_sessions from authenticated;

revoke all on function public.snapshot_workout_activity_type(),public.protect_workout_activity_type(),public.reject_reward_ledger_mutation(),public.reward_local_period(uuid),public.reward_predominant_mode(public.reward_monthly_counters),public.award_completed_workout_trigger() from public,anon,authenticated;
revoke all on function public.get_reward_dashboard(integer),public.convert_reward_currency(text,integer,uuid),public.redeem_reward_credit(text,uuid),public.start_focus_run(text,text),public.record_focus_session(uuid,uuid,timestamptz,timestamptz,integer,integer,text,boolean),public.abandon_focus_run(uuid),public.complete_focus_run_and_award(uuid),public.award_workout_rewards(uuid) from public,anon;
grant execute on function public.get_reward_dashboard(integer),public.convert_reward_currency(text,integer,uuid),public.redeem_reward_credit(text,uuid),public.start_focus_run(text,text),public.record_focus_session(uuid,uuid,timestamptz,timestamptz,integer,integer,text,boolean),public.abandon_focus_run(uuid),public.complete_focus_run_and_award(uuid),public.award_workout_rewards(uuid) to authenticated;
