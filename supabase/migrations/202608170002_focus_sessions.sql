create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  planned_seconds integer not null,
  focused_seconds integer not null,
  session_type text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint focus_sessions_duration_valid check (
    planned_seconds between 1 and 86400
    and focused_seconds between 0 and planned_seconds
  ),
  constraint focus_sessions_timestamp_order_valid check (ended_at >= started_at),
  constraint focus_sessions_type_valid check (
    session_type in ('focus', 'short_break', 'long_break')
  ),
  constraint focus_sessions_completion_valid check (
    not completed or focused_seconds = planned_seconds
  ),
  constraint focus_sessions_task_type_valid check (
    task_id is null or session_type = 'focus'
  ),
  constraint focus_sessions_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete set null (task_id)
);

create index focus_sessions_user_started_at_idx
  on public.focus_sessions (user_id, started_at desc);

create index focus_sessions_user_task_started_at_idx
  on public.focus_sessions (user_id, task_id, started_at desc)
  where task_id is not null;

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_select_own"
on public.focus_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "focus_sessions_insert_own"
on public.focus_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "focus_sessions_update_own"
on public.focus_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "focus_sessions_delete_own"
on public.focus_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.focus_sessions to authenticated;
