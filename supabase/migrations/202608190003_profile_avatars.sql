do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('profile-avatars', 'profile-avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

    execute 'create policy "profile avatars are publicly readable" on storage.objects for select using (bucket_id = ''profile-avatars'')';
    execute 'create policy "users upload their own profile avatar" on storage.objects for insert to authenticated with check (bucket_id = ''profile-avatars'' and (storage.foldername(name))[1] = (select auth.uid()::text))';
    execute 'create policy "users update their own profile avatar" on storage.objects for update to authenticated using (bucket_id = ''profile-avatars'' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = ''profile-avatars'' and (storage.foldername(name))[1] = (select auth.uid()::text))';
    execute 'create policy "users delete their own profile avatar" on storage.objects for delete to authenticated using (bucket_id = ''profile-avatars'' and (storage.foldername(name))[1] = (select auth.uid()::text))';
  end if;
end $$;
