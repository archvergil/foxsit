create table public.task_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color_token text not null default 'mint',
  icon text,
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_projects_name_not_blank check (char_length(trim(name)) between 1 and 120),
  constraint task_projects_color_token_valid check (color_token in ('mint', 'coral', 'blue', 'sand', 'slate')),
  constraint task_projects_position_nonnegative check (position >= 0),
  constraint task_projects_id_user_unique unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  title text not null,
  notes text,
  status text not null default 'open',
  priority text not null default 'none',
  scheduled_date date,
  due_at timestamptz,
  estimate_minutes integer,
  position numeric not null default 1000,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (char_length(trim(title)) between 1 and 500),
  constraint tasks_status_valid check (status in ('open', 'completed', 'archived')),
  constraint tasks_priority_valid check (priority in ('none', 'low', 'medium', 'high')),
  constraint tasks_estimate_positive check (estimate_minutes is null or estimate_minutes between 1 and 1440),
  constraint tasks_position_nonnegative check (position >= 0),
  constraint tasks_completed_state_valid check (
    (status = 'open' and completed_at is null and archived_at is null)
    or (status = 'completed' and completed_at is not null and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  ),
  constraint tasks_project_owner_fk
    foreign key (project_id, user_id)
    references public.task_projects(id, user_id)
    on delete set null (project_id),
  constraint tasks_id_user_unique unique (id, user_id)
);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  title text not null,
  completed boolean not null default false,
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_checklist_title_not_blank check (char_length(trim(title)) between 1 and 500),
  constraint task_checklist_position_nonnegative check (position >= 0),
  constraint task_checklist_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete cascade
);

create index task_projects_user_position_idx
  on public.task_projects (user_id, position)
  where archived_at is null;

create index tasks_user_scheduled_status_idx
  on public.tasks (user_id, scheduled_date, status);

create index tasks_user_project_position_idx
  on public.tasks (user_id, project_id, position);

create index tasks_user_due_at_idx
  on public.tasks (user_id, due_at)
  where due_at is not null and status = 'open';

create index task_checklist_task_position_idx
  on public.task_checklist_items (task_id, position);

create trigger task_projects_set_updated_at
before update on public.task_projects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger task_checklist_items_set_updated_at
before update on public.task_checklist_items
for each row execute function public.set_updated_at();

alter table public.task_projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;

create policy "task_projects_select_own"
on public.task_projects for select to authenticated
using ((select auth.uid()) = user_id);

create policy "task_projects_insert_own"
on public.task_projects for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "task_projects_update_own"
on public.task_projects for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "task_projects_delete_own"
on public.task_projects for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_select_own"
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_insert_own"
on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "tasks_update_own"
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own"
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "task_checklist_select_own"
on public.task_checklist_items for select to authenticated
using ((select auth.uid()) = user_id);

create policy "task_checklist_insert_own"
on public.task_checklist_items for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "task_checklist_update_own"
on public.task_checklist_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "task_checklist_delete_own"
on public.task_checklist_items for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.task_projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_checklist_items to authenticated;

grant select, update on public.profiles to authenticated;
