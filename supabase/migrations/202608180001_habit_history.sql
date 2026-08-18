alter table public.habits add column archived_at timestamptz;

update public.habits
set archived_at = updated_at
where not is_active;

alter table public.habits
  add constraint habits_archive_shape_valid check (
    (is_active and archived_at is null)
    or (not is_active and archived_at is not null)
  );

create function public.sync_habit_archive_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_active then
    new.archived_at = null;
  elsif new.archived_at is null then
    new.archived_at = now();
  end if;
  return new;
end;
$$;

create trigger habits_sync_archive_state
before insert or update on public.habits
for each row execute function public.sync_habit_archive_state();

create index habits_user_archived_at_idx
  on public.habits (user_id, archived_at desc)
  where archived_at is not null;
