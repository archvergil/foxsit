// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authenticateLocalUser,
  createLocalTestDatabase,
  createLocalUser,
  resetLocalRole,
} from './localDatabase'

const USER_A = '50000000-0000-4000-8000-000000000001'
const USER_B = '60000000-0000-4000-8000-000000000002'

describe('transactional task ordering migration', () => {
  let database: PGlite | undefined
  let openIds: string[] = []
  let otherTaskId = ''

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'ordering-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'ordering-b@local.test' })
    const inserted = await database.query<{ id: string }>(
      `
        insert into public.tasks (user_id, title, position)
        values ($1, 'First', 1000), ($1, 'Second', 2000), ($1, 'Third', 3000)
        returning id
      `,
      [USER_A],
    )
    openIds = inserted.rows.map(({ id }) => id)
    otherTaskId = (await database.query<{ id: string }>(
      `insert into public.tasks (user_id, title, position) values ($1, 'Other user', 1000) returning id`,
      [USER_B],
    )).rows[0]!.id
  }, 30_000)

  afterAll(async () => database?.close())

  it('reorders every open task atomically for the authenticated owner', async () => {
    const orderedIds = [openIds[2]!, openIds[0]!, openIds[1]!]
    await authenticateLocalUser(database!, USER_A)
    try {
      const result = await database!.query<{ id: string; position: number }>(
        'select id, position from public.reorder_tasks($1::uuid[]) order by position',
        [orderedIds],
      )
      expect(result.rows.map(({ id }) => id)).toEqual(orderedIds)
      expect(result.rows.map(({ position }) => Number(position))).toEqual([1000, 2000, 3000])
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('rejects stale, duplicate and cross-user orders without partial writes', async () => {
    await authenticateLocalUser(database!, USER_A)
    try {
      const before = await database!.query<{ id: string }>(
        `select id from public.tasks where user_id = $1 and status = 'open' order by position`,
        [USER_A],
      )
      await expect(database!.query(
        'select * from public.reorder_tasks($1::uuid[])',
        [[openIds[0], openIds[1]]],
      )).rejects.toThrow(/stale|inaccessible/i)
      await expect(database!.query(
        'select * from public.reorder_tasks($1::uuid[])',
        [[openIds[0], openIds[0], otherTaskId]],
      )).rejects.toThrow(/stale|inaccessible/i)
      const after = await database!.query<{ id: string }>(
        `select id from public.tasks where user_id = $1 and status = 'open' order by position`,
        [USER_A],
      )
      expect(after.rows).toEqual(before.rows)
    } finally {
      await resetLocalRole(database!)
    }
  })
})
