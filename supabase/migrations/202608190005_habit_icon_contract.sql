alter table public.habits
  drop constraint if exists habits_icon_valid;

alter table public.habits
  add constraint habits_icon_valid check (
    char_length(icon) between 1 and 80
    and icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );
