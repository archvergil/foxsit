drop trigger workout_sets_require_active_session on public.workout_sets;

create trigger workout_sets_require_active_session
before insert or update on public.workout_sets
for each row execute function public.validate_active_workout_set();

revoke delete on public.workout_sessions from authenticated;
revoke delete on public.workout_session_exercises from authenticated;
revoke delete on public.workout_sets from authenticated;
