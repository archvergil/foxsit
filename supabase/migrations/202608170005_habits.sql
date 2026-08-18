create function public.is_valid_weekdays(value smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and cardinality(value) between 1 and 7
    and value <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    and cardinality(value) = (select count(distinct day) from unnest(value) as day);
$$;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  icon text not null default 'circle-check-big',
  color_token text not null default 'mint',
  schedule_type text not null default 'daily',
  weekdays smallint[],
  target_count integer not null default 1,
  unit text,
  position numeric not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_owner_identity unique (id, user_id),
  constraint habits_title_not_blank check (char_length(trim(title)) between 1 and 200),
  constraint habits_description_length check (description is null or char_length(description) <= 10000),
  constraint habits_icon_valid check (icon in ('circle-check-big', 'glass-water', 'book-open', 'dumbbell', 'footprints', 'brain')),
  constraint habits_color_token_valid check (color_token in ('mint', 'coral', 'blue', 'sand', 'slate')),
  constraint habits_schedule_type_valid check (schedule_type in ('daily', 'weekdays')),
  constraint habits_schedule_shape_valid check (
    (schedule_type = 'daily' and weekdays is null)
    or (schedule_type = 'weekdays' and public.is_valid_weekdays(weekdays))
  ),
  constraint habits_target_count_valid check (target_count between 1 and 10000),
  constraint habits_unit_valid check (unit is null or char_length(trim(unit)) between 1 and 40),
  constraint habits_position_valid check (position >= 0)
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null,
  local_date date not null,
  count integer not null default 0,
  status text not null default 'in_progress',
  note text,
  source text,
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_logs_habit_owner_fk foreign key (habit_id, user_id)
    references public.habits(id, user_id) on delete cascade,
  constraint habit_logs_habit_date_unique unique (habit_id, local_date),
  constraint habit_logs_count_valid check (count >= 0),
  constraint habit_logs_status_valid check (status in ('in_progress', 'completed', 'skipped')),
  constraint habit_logs_status_shape_valid check (
    (status = 'skipped' and count = 0)
    or (status = 'completed' and count > 0)
    or status = 'in_progress'
  ),
  constraint habit_logs_note_length check (note is null or char_length(note) <= 1000),
  constraint habit_logs_source_valid check (source is null or source in ('manual', 'workout'))
);

create index habits_user_active_position_idx
  on public.habits (user_id, is_active, position, created_at);

create index habit_logs_user_date_idx
  on public.habit_logs (user_id, local_date desc);

create index habit_logs_habit_date_idx
  on public.habit_logs (habit_id, local_date desc);

create function public.validate_habit_log_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target integer;
begin
  select target_count into target
  from public.habits
  where id = new.habit_id and user_id = new.user_id;

  if target is not null and new.status <> 'skipped' then
    if new.count > target then
      raise exception 'Habit progress cannot exceed its target.';
    elsif new.count = target and new.status <> 'completed' then
      raise exception 'Habit progress at target must be completed.';
    elsif new.count < target and new.status <> 'in_progress' then
      raise exception 'Habit progress below target must remain in progress.';
    end if;
  end if;
  return new;
end;
$$;

create trigger habits_set_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

create trigger habit_logs_set_updated_at
before update on public.habit_logs
for each row execute function public.set_updated_at();

create trigger habit_logs_validate_progress
before insert or update on public.habit_logs
for each row execute function public.validate_habit_log_progress();

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits_select_own" on public.habits for select to authenticated
using ((select auth.uid()) = user_id);
create policy "habits_insert_own" on public.habits for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "habits_update_own" on public.habits for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habits_delete_own" on public.habits for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "habit_logs_select_own" on public.habit_logs for select to authenticated
using ((select auth.uid()) = user_id);
create policy "habit_logs_insert_own" on public.habit_logs for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "habit_logs_update_own" on public.habit_logs for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habit_logs_delete_own" on public.habit_logs for delete to authenticated
using ((select auth.uid()) = user_id);

grant execute on function public.is_valid_weekdays(smallint[]) to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;
