create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  all_day boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  start_date date,
  end_date date,
  category text,
  color_token text not null default 'blue',
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_not_blank check (char_length(trim(title)) between 1 and 200),
  constraint calendar_events_description_length check (description is null or char_length(description) <= 10000),
  constraint calendar_events_category_length check (category is null or char_length(trim(category)) between 1 and 120),
  constraint calendar_events_location_length check (location is null or char_length(trim(location)) between 1 and 240),
  constraint calendar_events_color_token_valid check (color_token in ('mint', 'coral', 'blue', 'sand', 'slate')),
  constraint calendar_events_temporal_shape_valid check (
    (
      all_day
      and start_date is not null
      and end_date is not null
      and end_date >= start_date
      and start_at is null
      and end_at is null
    )
    or
    (
      not all_day
      and start_at is not null
      and end_at is not null
      and end_at > start_at
      and start_date is null
      and end_date is null
    )
  )
);

create index calendar_events_user_start_at_idx
  on public.calendar_events (user_id, start_at)
  where not all_day;

create index calendar_events_user_start_date_idx
  on public.calendar_events (user_id, start_date, end_date)
  where all_day;

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own"
on public.calendar_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "calendar_events_insert_own"
on public.calendar_events for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "calendar_events_update_own"
on public.calendar_events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "calendar_events_delete_own"
on public.calendar_events for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.calendar_events to authenticated;
