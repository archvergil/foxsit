// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authenticateLocalUser, createLocalTestDatabase, createLocalUser, resetLocalRole } from './localDatabase'

const USER_A = 'c1000000-0000-4000-8000-000000000001'
const USER_B = 'c2000000-0000-4000-8000-000000000002'

describe('Workout history deletion', () => {
  let database: PGlite | undefined

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'workout-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'workout-b@local.test' })
  }, 30_000)

  afterAll(async () => database?.close())

  it('deletes only the authenticated owner completed session', async () => {
    const ownId = (await database!.query<{ id: string }>(
      `insert into public.workout_sessions(user_id,routine_name,status,started_at,ended_at,duration_seconds)
       values($1,'Own test','completed',now() - interval '10 minutes',now(),600) returning id`, [USER_A],
    )).rows[0]!.id
    const otherId = (await database!.query<{ id: string }>(
      `insert into public.workout_sessions(user_id,routine_name,status,started_at,ended_at,duration_seconds)
       values($1,'Other test','completed',now() - interval '10 minutes',now(),600) returning id`, [USER_B],
    )).rows[0]!.id

    await authenticateLocalUser(database!, USER_A)
    try {
      await expect(database!.query('select public.delete_workout_session($1)', [otherId])).rejects.toThrow(/not found/i)
      await database!.query('select public.delete_workout_session($1)', [ownId])
    } finally {
      await resetLocalRole(database!)
    }

    const remaining = await database!.query<{ id: string }>('select id from public.workout_sessions order by id')
    expect(remaining.rows).toEqual([{ id: otherId }])
  })

  it('refuses to delete an active session', async () => {
    const activeId = (await database!.query<{ id: string }>(
      "insert into public.workout_sessions(user_id,routine_name) values($1,'Active test') returning id", [USER_A],
    )).rows[0]!.id
    await authenticateLocalUser(database!, USER_A)
    try {
      await expect(database!.query('select public.delete_workout_session($1)', [activeId])).rejects.toThrow(/not found/i)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('deletes a routine while preserving its completed-session snapshot', async () => {
    const routineId = (await database!.query<{ id: string }>(
      `insert into public.workout_routines(user_id,name,color_token,position)
       values($1,'Archived routine','slate',1000) returning id`, [USER_A],
    )).rows[0]!.id
    const sessionId = (await database!.query<{ id: string }>(
      `insert into public.workout_sessions(user_id,routine_id,routine_name,status,started_at,ended_at,duration_seconds)
       values($1,$2,'Archived routine','completed',now() - interval '10 minutes',now(),600) returning id`, [USER_A, routineId],
    )).rows[0]!.id

    await authenticateLocalUser(database!, USER_A)
    try {
      const deleted = await database!.query<{ id: string }>(
        'delete from public.workout_routines where id=$1 and user_id=$2 returning id', [routineId, USER_A],
      )
      expect(deleted.rows).toEqual([{ id: routineId }])
    } finally {
      await resetLocalRole(database!)
    }

    const preserved = await database!.query<{ routine_id: string | null; routine_name: string }>(
      'select routine_id, routine_name from public.workout_sessions where id=$1', [sessionId],
    )
    expect(preserved.rows).toEqual([{ routine_id: null, routine_name: 'Archived routine' }])
  })

  it('still rejects manually detaching a completed session from an existing routine', async () => {
    const routineId = (await database!.query<{ id: string }>(
      `insert into public.workout_routines(user_id,name,color_token,position)
       values($1,'Protected routine','slate',2000) returning id`, [USER_A],
    )).rows[0]!.id
    const sessionId = (await database!.query<{ id: string }>(
      `insert into public.workout_sessions(user_id,routine_id,routine_name,status,started_at,ended_at,duration_seconds)
       values($1,$2,'Protected routine','completed',now() - interval '10 minutes',now(),600) returning id`, [USER_A, routineId],
    )).rows[0]!.id

    await authenticateLocalUser(database!, USER_A)
    try {
      await expect(database!.query(
        'update public.workout_sessions set routine_id=null where id=$1', [sessionId],
      )).rejects.toThrow(/immutable/i)
    } finally {
      await resetLocalRole(database!)
    }
  })
})
