create table public.focus_phase_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_run_id uuid,
  task_id uuid,
  started_at timestamptz not null,
  due_at timestamptz not null,
  paused_at timestamptz,
  accumulated_paused_seconds integer not null default 0,
  planned_seconds integer not null,
  session_type text not null,
  status text not null default 'running',
  session_id uuid references public.focus_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint focus_phase_jobs_duration_valid check (planned_seconds between 1 and 86400),
  constraint focus_phase_jobs_type_valid check (session_type in ('focus', 'short_break', 'long_break')),
  constraint focus_phase_jobs_status_valid check (status in ('running', 'paused', 'completed', 'cancelled')),
  constraint focus_phase_jobs_due_valid check (due_at >= started_at),
  constraint focus_phase_jobs_pause_valid check ((status = 'paused') = (paused_at is not null)),
  constraint focus_phase_jobs_task_type_valid check (task_id is null or session_type = 'focus'),
  constraint focus_phase_jobs_run_owner_fk foreign key (focus_run_id, user_id)
    references public.focus_runs(id, user_id) on delete cascade,
  constraint focus_phase_jobs_task_owner_fk foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete set null (task_id)
);

create unique index focus_phase_jobs_one_active_per_user
  on public.focus_phase_jobs (user_id)
  where status in ('running', 'paused');

create index focus_phase_jobs_due_idx
  on public.focus_phase_jobs (due_at)
  where status = 'running';

alter table public.focus_phase_jobs enable row level security;

create policy "focus_phase_jobs_select_own"
on public.focus_phase_jobs for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.focus_phase_jobs to authenticated;

create or replace function public.finalize_focus_phase_job(
  p_job_id uuid,
  p_user_id uuid
)
returns public.focus_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job public.focus_phase_jobs%rowtype;
  saved public.focus_sessions%rowtype;
begin
  select * into target_job
  from public.focus_phase_jobs
  where id = p_job_id and user_id = p_user_id
  for update;

  if not found then raise exception 'Focus phase not found.'; end if;

  if target_job.status = 'completed' then
    select * into saved from public.focus_sessions where id = target_job.session_id;
    if found then return saved; end if;
    raise exception 'The completed Focus phase has no durable session.';
  end if;

  if target_job.status = 'cancelled' then raise exception 'The Focus phase was already stopped.'; end if;
  if target_job.status = 'paused' then raise exception 'A paused Focus phase cannot complete.'; end if;
  if clock_timestamp() < target_job.due_at then raise exception 'The Focus phase has not reached its duration.'; end if;

  insert into public.focus_sessions (
    user_id, focus_run_id, task_id, started_at, ended_at, planned_seconds,
    focused_seconds, session_type, completed
  ) values (
    target_job.user_id, target_job.focus_run_id, target_job.task_id,
    target_job.started_at, target_job.due_at, target_job.planned_seconds,
    target_job.planned_seconds, target_job.session_type, true
  )
  on conflict (user_id, focus_run_id, started_at, session_type)
  do update set created_at = public.focus_sessions.created_at
  returning * into saved;

  update public.focus_phase_jobs
  set status = 'completed', session_id = saved.id, paused_at = null,
      updated_at = clock_timestamp()
  where id = target_job.id;

  return saved;
end;
$$;

create or replace function public.finalize_due_focus_phase_jobs(
  p_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  completed_count integer := 0;
begin
  for candidate in
    select id, user_id
    from public.focus_phase_jobs
    where status = 'running'
      and due_at <= clock_timestamp()
      and (p_user_id is null or user_id = p_user_id)
    order by due_at, id
    for update skip locked
  loop
    perform public.finalize_focus_phase_job(candidate.id, candidate.user_id);
    completed_count := completed_count + 1;
  end loop;
  return completed_count;
end;
$$;

create or replace function public.schedule_focus_phase(
  p_focus_run_id uuid,
  p_task_id uuid,
  p_started_at timestamptz,
  p_planned_seconds integer,
  p_session_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_run public.focus_runs%rowtype;
  expected_seconds integer;
  job_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_session_type not in ('focus', 'short_break', 'long_break') then raise exception 'Focus phase is invalid.'; end if;
  if p_planned_seconds < 1 or p_planned_seconds > 86400 then raise exception 'Focus duration is invalid.'; end if;
  if p_started_at > clock_timestamp() + interval '1 minute' or p_started_at < clock_timestamp() - interval '5 minutes' then
    raise exception 'Focus start time is invalid.';
  end if;
  if p_task_id is not null and p_session_type <> 'focus' then raise exception 'Only Focus phases can link a task.'; end if;
  if p_task_id is not null and not exists (
    select 1 from public.tasks where id = p_task_id and user_id = current_user_id and status = 'open'
  ) then raise exception 'Linked task not found.'; end if;

  perform public.finalize_due_focus_phase_jobs(current_user_id);

  if p_focus_run_id is not null then
    select * into target_run
    from public.focus_runs
    where id = p_focus_run_id and user_id = current_user_id
      and completed_at is null and abandoned_at is null
    for update;
    if not found then raise exception 'The Focus run is not active.'; end if;
    expected_seconds := case when p_session_type = 'focus'
      then target_run.focus_seconds_per_stack else target_run.break_seconds end;
    if p_planned_seconds <> expected_seconds then
      raise exception 'The phase duration does not match its durable Focus run.';
    end if;
  end if;

  insert into public.focus_phase_jobs (
    user_id, focus_run_id, task_id, started_at, due_at,
    planned_seconds, session_type
  ) values (
    current_user_id, p_focus_run_id, p_task_id, p_started_at,
    p_started_at + make_interval(secs => p_planned_seconds),
    p_planned_seconds, p_session_type
  ) returning id into job_id;

  return job_id;
end;
$$;

create or replace function public.settle_focus_phase(p_job_id uuid)
returns public.focus_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  return public.finalize_focus_phase_job(p_job_id, current_user_id);
end;
$$;

create or replace function public.pause_focus_phase(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_job public.focus_phase_jobs%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into target_job from public.focus_phase_jobs
  where id = p_job_id and user_id = current_user_id for update;
  if not found then raise exception 'Focus phase not found.'; end if;
  if target_job.status = 'completed' then return 'completed'; end if;
  if target_job.status <> 'running' then return target_job.status; end if;
  if target_job.due_at <= clock_timestamp() then
    perform public.finalize_focus_phase_job(target_job.id, current_user_id);
    return 'completed';
  end if;
  update public.focus_phase_jobs
  set status = 'paused', paused_at = clock_timestamp(), updated_at = clock_timestamp()
  where id = target_job.id;
  return 'paused';
end;
$$;

create or replace function public.resume_focus_phase(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_job public.focus_phase_jobs%rowtype;
  paused_seconds integer;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into target_job from public.focus_phase_jobs
  where id = p_job_id and user_id = current_user_id for update;
  if not found then raise exception 'Focus phase not found.'; end if;
  if target_job.status <> 'paused' then return target_job.status; end if;
  paused_seconds := greatest(0, extract(epoch from (clock_timestamp() - target_job.paused_at))::integer);
  update public.focus_phase_jobs
  set status = 'running', due_at = due_at + make_interval(secs => paused_seconds),
      accumulated_paused_seconds = accumulated_paused_seconds + paused_seconds,
      paused_at = null, updated_at = clock_timestamp()
  where id = target_job.id;
  return 'running';
end;
$$;

create or replace function public.cancel_focus_phase(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_job public.focus_phase_jobs%rowtype;
  stopped_at timestamptz := clock_timestamp();
  current_pause_seconds integer := 0;
  focused_seconds integer;
  saved_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  select * into target_job from public.focus_phase_jobs
  where id = p_job_id and user_id = current_user_id for update;
  if not found then raise exception 'Focus phase not found.'; end if;
  if target_job.status = 'completed' then return 'completed'; end if;
  if target_job.status = 'cancelled' then return 'cancelled'; end if;
  if target_job.status = 'running' and target_job.due_at <= stopped_at then
    perform public.finalize_focus_phase_job(target_job.id, current_user_id);
    return 'completed';
  end if;
  if target_job.paused_at is not null then
    current_pause_seconds := greatest(0, extract(epoch from (stopped_at - target_job.paused_at))::integer);
  end if;
  focused_seconds := least(
    target_job.planned_seconds,
    greatest(0, extract(epoch from (stopped_at - target_job.started_at))::integer
      - target_job.accumulated_paused_seconds - current_pause_seconds)
  );
  if focused_seconds > 0 then
    insert into public.focus_sessions (
      user_id, focus_run_id, task_id, started_at, ended_at, planned_seconds,
      focused_seconds, session_type, completed
    ) values (
      target_job.user_id, target_job.focus_run_id, target_job.task_id,
      target_job.started_at, stopped_at, target_job.planned_seconds,
      focused_seconds, target_job.session_type, false
    )
    on conflict (user_id, focus_run_id, started_at, session_type)
    do update set created_at = public.focus_sessions.created_at
    returning id into saved_id;
  end if;
  update public.focus_phase_jobs
  set status = 'cancelled', session_id = saved_id, paused_at = null,
      updated_at = stopped_at
  where id = target_job.id;
  return 'cancelled';
end;
$$;

revoke all on function public.finalize_focus_phase_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_due_focus_phase_jobs(uuid) from public, anon, authenticated;
revoke all on function public.schedule_focus_phase(uuid, uuid, timestamptz, integer, text) from public, anon;
revoke all on function public.settle_focus_phase(uuid) from public, anon;
revoke all on function public.pause_focus_phase(uuid) from public, anon;
revoke all on function public.resume_focus_phase(uuid) from public, anon;
revoke all on function public.cancel_focus_phase(uuid) from public, anon;
grant execute on function public.schedule_focus_phase(uuid, uuid, timestamptz, integer, text) to authenticated;
grant execute on function public.settle_focus_phase(uuid) to authenticated;
grant execute on function public.pause_focus_phase(uuid) to authenticated;
grant execute on function public.resume_focus_phase(uuid) to authenticated;
grant execute on function public.cancel_focus_phase(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    if exists (select 1 from cron.job where jobname = 'finalize-due-focus-phases') then
      perform cron.unschedule('finalize-due-focus-phases');
    end if;
    perform cron.schedule(
      'finalize-due-focus-phases',
      '10 seconds',
      'select public.finalize_due_focus_phase_jobs(null);'
    );
  else
    raise notice 'pg_cron is unavailable; clients will settle durable Focus phases on synchronization.';
  end if;
exception when others then
  raise notice 'Could not schedule the Focus finalizer: %', sqlerrm;
end;
$$;
