alter table public.workout_sessions
  drop constraint workout_sessions_routine_id_fkey,
  add constraint workout_sessions_routine_owner_fk
    foreign key (routine_id, user_id)
    references public.workout_routines(id, user_id)
    on delete set null (routine_id);

alter table public.workout_routine_exercises
  add constraint workout_routine_exercises_source_owner_identity
    unique (id, user_id);

alter table public.workout_session_exercises
  drop constraint workout_session_exercises_source_routine_exercise_id_fkey,
  add constraint workout_session_exercises_source_owner_fk
    foreign key (source_routine_exercise_id, user_id)
    references public.workout_routine_exercises(id, user_id)
    on delete set null (source_routine_exercise_id),
  add constraint workout_session_exercises_session_identity
    unique (id, session_id, user_id);

alter table public.workout_sets
  drop constraint workout_sets_exercise_owner_fk,
  add constraint workout_sets_exercise_session_owner_fk
    foreign key (session_exercise_id, session_id, user_id)
    references public.workout_session_exercises(id, session_id, user_id)
    on delete cascade;
