create table public.workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color_token text not null default 'coral',
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_routines_owner_identity unique (id, user_id),
  constraint workout_routines_name_not_blank check (char_length(trim(name)) between 1 and 120),
  constraint workout_routines_description_length check (description is null or char_length(description) <= 5000),
  constraint workout_routines_color_token_valid check (color_token in ('mint', 'coral', 'blue', 'sand', 'slate')),
  constraint workout_routines_position_nonnegative check (position >= 0)
);

create table public.workout_routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null,
  exercise_name text not null,
  muscle_group text,
  position numeric not null default 1000,
  target_sets integer not null default 3,
  target_reps_min integer not null default 8,
  target_reps_max integer not null default 12,
  rest_seconds integer not null default 90,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_routine_exercises_owner_fk
    foreign key (routine_id, user_id)
    references public.workout_routines(id, user_id)
    on delete cascade,
  constraint workout_routine_exercises_name_not_blank check (char_length(trim(exercise_name)) between 1 and 160),
  constraint workout_routine_exercises_muscle_group_length check (muscle_group is null or char_length(trim(muscle_group)) between 1 and 80),
  constraint workout_routine_exercises_position_nonnegative check (position >= 0),
  constraint workout_routine_exercises_sets_valid check (target_sets between 1 and 20),
  constraint workout_routine_exercises_reps_valid check (
    target_reps_min between 1 and 100
    and target_reps_max between target_reps_min and 100
  ),
  constraint workout_routine_exercises_rest_valid check (rest_seconds between 0 and 3600),
  constraint workout_routine_exercises_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index workout_routines_user_position_idx
  on public.workout_routines (user_id, position, created_at)
  where archived_at is null;

create index workout_routine_exercises_routine_position_idx
  on public.workout_routine_exercises (routine_id, position, created_at);

create trigger workout_routines_set_updated_at
before update on public.workout_routines
for each row execute function public.set_updated_at();

create trigger workout_routine_exercises_set_updated_at
before update on public.workout_routine_exercises
for each row execute function public.set_updated_at();

alter table public.workout_routines enable row level security;
alter table public.workout_routine_exercises enable row level security;

create policy "workout_routines_select_own"
on public.workout_routines for select to authenticated
using ((select auth.uid()) = user_id);

create policy "workout_routines_insert_own"
on public.workout_routines for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "workout_routines_update_own"
on public.workout_routines for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "workout_routines_delete_own"
on public.workout_routines for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "workout_routine_exercises_select_own"
on public.workout_routine_exercises for select to authenticated
using ((select auth.uid()) = user_id);

create policy "workout_routine_exercises_insert_own"
on public.workout_routine_exercises for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.workout_routines
    where id = routine_id and user_id = (select auth.uid())
  )
);

create policy "workout_routine_exercises_update_own"
on public.workout_routine_exercises for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.workout_routines
    where id = routine_id and user_id = (select auth.uid())
  )
);

create policy "workout_routine_exercises_delete_own"
on public.workout_routine_exercises for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.workout_routines to authenticated;
grant select, insert, update, delete on public.workout_routine_exercises to authenticated;
