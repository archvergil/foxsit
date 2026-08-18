alter table public.workout_routines
  add column banner_asset text,
  add column banner_monochrome boolean not null default false,
  add constraint workout_routines_banner_asset_valid check (
    banner_asset is null or banner_asset ~ '^workout_([1-9]|1[0-3])[.]gif$'
  );

alter table public.task_projects
  add column parent_project_id uuid,
  add column banner_asset text,
  add column banner_monochrome boolean not null default false,
  add constraint task_projects_parent_not_self check (parent_project_id is null or parent_project_id <> id),
  add constraint task_projects_banner_asset_valid check (
    banner_asset is null or banner_asset ~ '^habits_([1-9]|1[01])[.]gif$'
  ),
  add constraint task_projects_parent_owner_fk
    foreign key (parent_project_id, user_id)
    references public.task_projects(id, user_id)
    on delete set null (parent_project_id);

create function public.validate_task_project_tree()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_project_id is null then return new; end if;
  if exists (
    with recursive ancestors as (
      select project.id, project.parent_project_id
      from public.task_projects as project
      where project.id = new.parent_project_id and project.user_id = new.user_id
      union all
      select project.id, project.parent_project_id
      from public.task_projects as project
      join ancestors on project.id = ancestors.parent_project_id
      where project.user_id = new.user_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A project cannot contain itself.';
  end if;
  return new;
end;
$$;

create trigger task_projects_validate_tree
before insert or update of parent_project_id on public.task_projects
for each row execute function public.validate_task_project_tree();

revoke all on function public.validate_task_project_tree() from public, anon, authenticated;

create index task_projects_parent_position_idx
  on public.task_projects (user_id, parent_project_id, position)
  where archived_at is null;

create table public.habit_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color_token text not null default 'mint',
  custom_color text,
  banner_asset text,
  banner_monochrome boolean not null default false,
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_projects_owner_identity unique (id, user_id),
  constraint habit_projects_name_not_blank check (char_length(trim(name)) between 1 and 120),
  constraint habit_projects_icon_length check (icon is null or char_length(icon) between 1 and 80),
  constraint habit_projects_color_token_valid check (color_token in ('mint', 'coral', 'blue', 'sand', 'slate')),
  constraint habit_projects_custom_color_valid check (custom_color is null or custom_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint habit_projects_banner_asset_valid check (
    banner_asset is null or banner_asset ~ '^habits_([1-9]|1[01])[.]gif$'
  ),
  constraint habit_projects_position_valid check (position >= 0)
);

alter table public.habits
  add column project_id uuid,
  add constraint habits_project_owner_fk
    foreign key (project_id, user_id)
    references public.habit_projects(id, user_id)
    on delete set null (project_id);

create index habit_projects_user_position_idx on public.habit_projects (user_id, position, created_at);
create index habits_user_project_position_idx on public.habits (user_id, project_id, position);

create trigger habit_projects_set_updated_at
before update on public.habit_projects
for each row execute function public.set_updated_at();

alter table public.habit_projects enable row level security;
create policy "habit_projects_select_own" on public.habit_projects for select to authenticated
using ((select auth.uid()) = user_id);
create policy "habit_projects_insert_own" on public.habit_projects for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "habit_projects_update_own" on public.habit_projects for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habit_projects_delete_own" on public.habit_projects for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.habit_projects to authenticated;
