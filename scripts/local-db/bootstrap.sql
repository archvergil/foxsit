do $$
begin
  create role anon nologin;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create role authenticated nologin;
exception
  when duplicate_object then null;
end
$$;

create schema if not exists auth;
create schema if not exists extensions;
create schema if not exists local_dev;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists local_dev.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_normalized text not null unique,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint local_accounts_email_not_blank check (char_length(trim(email_normalized)) > 3)
);

create table if not exists local_dev.sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists local_sessions_user_idx
  on local_dev.sessions (user_id);

create index if not exists local_sessions_expiry_idx
  on local_dev.sessions (expires_at);

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
