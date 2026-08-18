// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authenticateLocalUser,
  createLocalTestDatabase,
  createLocalUser,
  resetLocalRole,
} from './localDatabase'

const USER_A = '30000000-0000-4000-8000-000000000001'
const USER_B = '40000000-0000-4000-8000-000000000002'

describe('Focus session database migration on local PGlite', () => {
  let database: PGlite | undefined
  let taskA: string
  let taskB: string

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'focus-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'focus-b@local.test' })
    taskA = (await database.query<{ id: string }>(
      `insert into public.tasks (user_id, title) values ($1, 'A task') returning id`,
      [USER_A],
    )).rows[0]!.id
    taskB = (await database.query<{ id: string }>(
      `insert into public.tasks (user_id, title) values ($1, 'B task') returning id`,
      [USER_B],
    )).rows[0]!.id
  }, 30_000)

  afterAll(async () => database?.close())

  it('isolates history with RLS', async () => {
    await database!.query(
      `
        insert into public.focus_sessions
          (user_id, task_id, started_at, ended_at, planned_seconds, focused_seconds, session_type, completed)
        values
          ($1, $2, '2026-08-17T12:00:00Z', '2026-08-17T12:25:00Z', 1500, 1500, 'focus', true),
          ($3, $4, '2026-08-17T13:00:00Z', '2026-08-17T13:25:00Z', 1500, 1500, 'focus', true)
      `,
      [USER_A, taskA, USER_B, taskB],
    )

    await authenticateLocalUser(database!, USER_A)
    try {
      const rows = await database!.query<{ user_id: string }>('select user_id from public.focus_sessions')
      expect(rows.rows).toEqual([{ user_id: USER_A }])
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('rejects cross-user task links and invalid completed durations', async () => {
    await expect(database!.query(
      `
        insert into public.focus_sessions
          (user_id, task_id, started_at, ended_at, planned_seconds, focused_seconds, session_type, completed)
        values ($1, $2, now(), now(), 1500, 1500, 'focus', true)
      `,
      [USER_A, taskB],
    )).rejects.toThrow(/foreign key/i)

    await expect(database!.query(
      `
        insert into public.focus_sessions
          (user_id, started_at, ended_at, planned_seconds, focused_seconds, session_type, completed)
        values ($1, now(), now(), 1500, 300, 'focus', true)
      `,
      [USER_A],
    )).rejects.toThrow(/check constraint/i)
  })

  it('keeps history and detaches it when its task is deleted', async () => {
    const session = await database!.query<{ id: string }>(
      `
        insert into public.focus_sessions
          (user_id, task_id, started_at, ended_at, planned_seconds, focused_seconds, session_type, completed)
        values ($1, $2, now(), now(), 60, 30, 'focus', false) returning id
      `,
      [USER_A, taskA],
    )
    await database!.query('delete from public.tasks where id = $1', [taskA])
    const result = await database!.query<{ task_id: string | null }>(
      'select task_id from public.focus_sessions where id = $1',
      [session.rows[0]!.id],
    )
    expect(result.rows[0]?.task_id).toBeNull()
  })
})
