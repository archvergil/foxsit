create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references public.workout_routines(id) on delete set null,
  routine_name text not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_owner_identity unique (id, user_id),
  constraint workout_sessions_routine_name_not_blank check (char_length(trim(routine_name)) between 1 and 120),
  constraint workout_sessions_status_valid check (status in ('active', 'completed', 'cancelled')),
  constraint workout_sessions_end_state_valid check (
    (status = 'active' and ended_at is null and duration_seconds is null)
    or (status in ('completed', 'cancelled') and ended_at is not null and duration_seconds is not null)
  ),
  constraint workout_sessions_duration_valid check (duration_seconds is null or duration_seconds >= 0),
  constraint workout_sessions_notes_length check (notes is null or char_length(notes) <= 5000)
);

create unique index workout_sessions_one_active_per_user_idx
  on public.workout_sessions (user_id)
  where status = 'active';

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  source_routine_exercise_id uuid references public.workout_routine_exercises(id) on delete set null,
  exercise_name text not null,
  muscle_group text,
  position numeric not null,
  target_sets integer not null,
  target_reps_min integer not null,
  target_reps_max integer not null,
  rest_seconds integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_session_exercises_owner_identity unique (id, user_id),
  constraint workout_session_exercises_session_owner_fk
    foreign key (session_id, user_id)
    references public.workout_sessions(id, user_id)
    on delete cascade,
  constraint workout_session_exercises_name_not_blank check (char_length(trim(exercise_name)) between 1 and 160),
  constraint workout_session_exercises_muscle_group_length check (muscle_group is null or char_length(trim(muscle_group)) between 1 and 80),
  constraint workout_session_exercises_position_nonnegative check (position >= 0),
  constraint workout_session_exercises_sets_valid check (target_sets between 1 and 20),
  constraint workout_session_exercises_reps_valid check (
    target_reps_min between 1 and 100
    and target_reps_max between target_reps_min and 100
  ),
  constraint workout_session_exercises_rest_valid check (rest_seconds between 0 and 3600),
  constraint workout_session_exercises_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index workout_session_exercises_session_position_idx
  on public.workout_session_exercises (session_id, position, created_at);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  session_exercise_id uuid not null,
  set_number integer not null,
  weight_kg numeric(8, 2),
  reps integer,
  rir smallint,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_session_owner_fk
    foreign key (session_id, user_id)
    references public.workout_sessions(id, user_id)
    on delete cascade,
  constraint workout_sets_exercise_owner_fk
    foreign key (session_exercise_id, user_id)
    references public.workout_session_exercises(id, user_id)
    on delete cascade,
  constraint workout_sets_unique_number unique (session_exercise_id, set_number),
  constraint workout_sets_number_valid check (set_number between 1 and 100),
  constraint workout_sets_weight_valid check (weight_kg is null or weight_kg between 0 and 10000),
  constraint workout_sets_reps_valid check (reps is null or reps between 0 and 1000),
  constraint workout_sets_rir_valid check (rir is null or rir between 0 and 10),
  constraint workout_sets_completion_valid check (completed_at is null or reps is not null)
);

create index workout_sets_session_exercise_idx
  on public.workout_sets (session_id, session_exercise_id, set_number);

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create trigger workout_session_exercises_set_updated_at
before update on public.workout_session_exercises
for each row execute function public.set_updated_at();

create trigger workout_sets_set_updated_at
before update on public.workout_sets
for each row execute function public.set_updated_at();

create or replace function public.validate_workout_session_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.routine_id is not null and not exists (
    select 1
    from public.workout_routines
    where id = new.routine_id and user_id = new.user_id
  ) then
    raise exception 'Workout routine does not belong to the session owner.';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_validate_owner
before insert or update of routine_id, user_id on public.workout_sessions
for each row execute function public.validate_workout_session_owner();

create or replace function public.validate_active_workout_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session_id uuid;
  target_user_id uuid;
begin
  if tg_op = 'DELETE' then
    target_session_id := old.session_id;
    target_user_id := old.user_id;
  else
    target_session_id := new.session_id;
    target_user_id := new.user_id;
  end if;

  if not exists (
    select 1
    from public.workout_sessions
    where id = target_session_id and user_id = target_user_id and status = 'active'
  ) then
    raise exception 'Sets can only be changed while the workout is active.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger workout_sets_require_active_session
before insert or update or delete on public.workout_sets
for each row execute function public.validate_active_workout_set();

alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_sets enable row level security;

create policy "workout_sessions_select_own" on public.workout_sessions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_sessions_insert_own" on public.workout_sessions
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_sessions_update_own" on public.workout_sessions
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_sessions_delete_own" on public.workout_sessions
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "workout_session_exercises_select_own" on public.workout_session_exercises
for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_session_exercises_insert_own" on public.workout_session_exercises
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_session_exercises_update_own" on public.workout_session_exercises
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_session_exercises_delete_own" on public.workout_session_exercises
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "workout_sets_select_own" on public.workout_sets
for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_sets_insert_own" on public.workout_sets
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workout_sets_update_own" on public.workout_sets
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workout_sets_delete_own" on public.workout_sets
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.start_workout_session(p_routine_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_routine public.workout_routines%rowtype;
  active_session_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select id into active_session_id
  from public.workout_sessions
  where user_id = current_user_id and status = 'active'
  limit 1;

  if active_session_id is not null then
    return active_session_id;
  end if;

  select * into selected_routine
  from public.workout_routines
  where id = p_routine_id and user_id = current_user_id and archived_at is null;

  if not found then
    raise exception 'Workout routine was not found.';
  end if;

  if not exists (
    select 1 from public.workout_routine_exercises
    where routine_id = selected_routine.id and user_id = current_user_id
  ) then
    raise exception 'Add at least one exercise before starting the workout.';
  end if;

  insert into public.workout_sessions (user_id, routine_id, routine_name)
  values (current_user_id, selected_routine.id, selected_routine.name)
  returning id into active_session_id;

  insert into public.workout_session_exercises (
    user_id, session_id, source_routine_exercise_id, exercise_name, muscle_group,
    position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes
  )
  select
    current_user_id, active_session_id, id, exercise_name, muscle_group,
    position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes
  from public.workout_routine_exercises
  where routine_id = selected_routine.id and user_id = current_user_id
  order by position, created_at;

  insert into public.workout_sets (
    user_id, session_id, session_exercise_id, set_number
  )
  select current_user_id, active_session_id, exercise.id, set_number
  from public.workout_session_exercises exercise
  cross join lateral generate_series(1, exercise.target_sets) set_number
  where exercise.session_id = active_session_id and exercise.user_id = current_user_id;

  return active_session_id;
end;
$$;

revoke all on function public.validate_workout_session_owner() from public, anon, authenticated;
revoke all on function public.validate_active_workout_set() from public, anon, authenticated;
revoke all on function public.start_workout_session(uuid) from public, anon;
grant execute on function public.start_workout_session(uuid) to authenticated;

grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_session_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
