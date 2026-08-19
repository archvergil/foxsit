alter table public.profiles
  add column if not exists calendar_show_events boolean not null default true,
  add column if not exists calendar_show_tasks boolean not null default true,
  add column if not exists calendar_show_habits boolean not null default true;

