// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authenticateLocalUser, createLocalTestDatabase, createLocalUser, resetLocalRole } from './localDatabase'

const USER_A = 'cf000000-0000-4000-8000-000000000001'
const USER_B = 'cf000000-0000-4000-8000-000000000002'

describe('CrossFit AMRAP database contract', () => {
  let database: PGlite | undefined
  let routineId = ''

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'crossfit-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'crossfit-b@local.test' })

    routineId = (await database.query<{ id: string }>(
      `insert into public.workout_routines
        (user_id,name,color_token,position,activity_type,crossfit_time_cap_seconds)
       values($1,'Cindy','slate',1000,'crossfit',1200) returning id`,
      [USER_A],
    )).rows[0]!.id
    await database.query(
      `insert into public.workout_routine_exercises
        (user_id,routine_id,exercise_name,position,target_sets,target_reps_min,target_reps_max,
         rest_seconds,crossfit_uses_weight,crossfit_weight_kg,crossfit_reps)
       values
        ($1,$2,'Pull-up',1000,1,1,1,0,false,null,5),
        ($1,$2,'Kettlebell swing',2000,1,1,1,0,true,24,15)`,
      [USER_A, routineId],
    )
  }, 30_000)

  afterAll(async () => database?.close())

  it('snapshots one timed circuit, creates no sets and records only an owner round', async () => {
    await authenticateLocalUser(database!, USER_A)
    try {
      const sessionId = (await database!.query<{ id: string }>(
        'select public.start_workout_session($1) as id', [routineId],
      )).rows[0]!.id

      const session = await database!.query<{
        activity_type: string
        crossfit_time_cap_seconds: number
        due_matches: boolean
      }>(
        `select activity_type,crossfit_time_cap_seconds,
          crossfit_due_at = started_at + make_interval(secs => crossfit_time_cap_seconds) as due_matches
         from public.workout_sessions where id=$1`,
        [sessionId],
      )
      expect(session.rows).toEqual([{
        activity_type: 'crossfit', crossfit_time_cap_seconds: 1200, due_matches: true,
      }])

      const snapshots = await database!.query<{ exercise_count: number; set_count: number }>(
        `select
          (select count(*)::integer from public.workout_session_exercises where session_id=$1) as exercise_count,
          (select count(*)::integer from public.workout_sets where session_id=$1) as set_count`,
        [sessionId],
      )
      expect(snapshots.rows).toEqual([{ exercise_count: 2, set_count: 0 }])

      await expect(database!.query(
        'update public.workout_sessions set crossfit_rounds_completed=1 where id=$1', [sessionId],
      )).rejects.toThrow(/increment_crossfit_round/i)

      const round = await database!.query<{ result: { status: string; rounds_completed: number } }>(
        'select public.increment_crossfit_round($1) as result', [sessionId],
      )
      expect(round.rows[0]?.result).toEqual({ status: 'active', rounds_completed: 1 })

      await database!.query(
        `update public.workout_sessions
         set status='cancelled',ended_at=clock_timestamp(),
             duration_seconds=greatest(0,extract(epoch from clock_timestamp()-started_at)::integer)
         where id=$1`,
        [sessionId],
      )
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('prevents changing modality underneath existing movements', async () => {
    await expect(database!.query(
      `update public.workout_routines
       set activity_type='strength',crossfit_time_cap_seconds=null where id=$1`,
      [routineId],
    )).rejects.toThrow(/remove existing exercises/i)
  })

  it('atomically closes an expired AMRAP and rejects another user', async () => {
    const expiredId = (await database!.query<{ id: string }>(
      `insert into public.workout_sessions
        (user_id,routine_id,routine_name,activity_type,started_at,crossfit_time_cap_seconds,crossfit_due_at)
       select $1,$2,'Expired Cindy','crossfit',started_at,60,started_at + interval '60 seconds'
       from (select clock_timestamp() - interval '2 minutes' as started_at) timing
       returning id`,
      [USER_A, routineId],
    )).rows[0]!.id

    await authenticateLocalUser(database!, USER_B)
    try {
      await expect(database!.query(
        'select public.increment_crossfit_round($1)', [expiredId],
      )).rejects.toThrow(/not found/i)
    } finally {
      await resetLocalRole(database!)
    }

    await authenticateLocalUser(database!, USER_A)
    try {
      const result = await database!.query<{ result: { status: string; rounds_completed: number } }>(
        'select public.increment_crossfit_round($1) as result', [expiredId],
      )
      expect(result.rows[0]?.result).toEqual({ status: 'completed', rounds_completed: 0 })
    } finally {
      await resetLocalRole(database!)
    }

    const finished = await database!.query<{
      status: string
      duration_seconds: number
      ended_at_matches_due_at: boolean
    }>(
      `select status,duration_seconds,ended_at=crossfit_due_at as ended_at_matches_due_at
       from public.workout_sessions where id=$1`,
      [expiredId],
    )
    expect(finished.rows).toEqual([{
      status: 'completed', duration_seconds: 60, ended_at_matches_due_at: true,
    }])
  })
})
