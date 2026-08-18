insert into public.profiles (id, display_name, timezone)
select
  user_record.id,
  nullif(trim(user_record.raw_user_meta_data ->> 'display_name'), ''),
  coalesce(nullif(trim(user_record.raw_user_meta_data ->> 'timezone'), ''), 'UTC')
from auth.users as user_record
on conflict (id) do nothing;
