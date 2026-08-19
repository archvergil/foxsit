create function public.delete_workout_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  delete from public.workout_sessions
  where id = p_session_id
    and user_id = current_user_id
    and status = 'completed'
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Completed workout session was not found.';
  end if;
  return deleted_id;
end;
$$;

revoke all on function public.delete_workout_session(uuid) from public, anon;
grant execute on function public.delete_workout_session(uuid) to authenticated;
