// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { habitIconSchema } from '@/features/habits/schemas'
import { authenticateLocalUser, createLocalTestDatabase, createLocalUser, resetLocalRole } from './localDatabase'

const USER_A = '93000000-0000-4000-8000-000000000001'
const USER_B = '94000000-0000-4000-8000-000000000002'

describe('Habits database migration', () => {
  let database: PGlite | undefined
  let habitA = ''
  let habitB = ''

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'habits-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'habits-b@local.test' })
    habitA = (await database.query<{ id: string }>(
      `insert into public.habits (user_id, title, schedule_type, weekdays, target_count)
       values ($1, 'Read', 'weekdays', array[1,3,5]::smallint[], 5) returning id`,
      [USER_A],
    )).rows[0]!.id
    habitB = (await database.query<{ id: string }>(
      `insert into public.habits (user_id, title) values ($1, 'Walk') returning id`,
      [USER_B],
    )).rows[0]!.id
  }, 30_000)

  afterAll(async () => database?.close())

  it('enforces schedule and log shapes', async () => {
    await expect(database!.query(
      `insert into public.habits (user_id, title, schedule_type, weekdays)
       values ($1, 'Duplicate days', 'weekdays', array[1,1]::smallint[])`,
      [USER_A],
    )).rejects.toThrow(/habits_schedule_shape_valid/i)
    await expect(database!.query(
      `insert into public.habit_logs (user_id, habit_id, local_date, count, status)
       values ($1, $2, '2026-08-17', 1, 'skipped')`,
      [USER_A, habitA],
    )).rejects.toThrow(/habit_logs_status_shape_valid/i)

    const result = await database!.query<{ local_date: Date; count: number }>(
      `insert into public.habit_logs (user_id, habit_id, local_date, count, status, source)
       values ($1, $2, '2026-08-17', 5, 'completed', 'manual') returning local_date, count`,
      [USER_A, habitA],
    )
    expect(result.rows[0]).toMatchObject({ count: 5 })
  })

  it('accepts every icon exposed by the Habit editor and rejects malformed icon slugs', async () => {
    try {
      for (const [index, icon] of habitIconSchema.options.entries()) {
        const created = await database!.query<{ icon: string }>(
          `insert into public.habits (user_id, title, icon, position)
           values ($1, $2, $3, $4) returning icon`,
          [USER_A, `Icon contract ${index}`, icon, 10_000 + index],
        )
        expect(created.rows[0]?.icon).toBe(icon)
      }

      await expect(database!.query(
        `insert into public.habits (user_id, title, icon)
         values ($1, 'Invalid icon', 'not a valid icon')`,
        [USER_A],
      )).rejects.toThrow(/habits_icon_valid/i)
    } finally {
      await database!.query("delete from public.habits where user_id = $1 and title like 'Icon contract %'", [USER_A])
    }
  })

  it('isolates habits/logs and rejects cross-owner relationships', async () => {
    await authenticateLocalUser(database!, USER_A)
    try {
      const visible = await database!.query<{ id: string }>('select id from public.habits')
      expect(visible.rows.map(({ id }) => id)).toEqual([habitA])
      await expect(database!.query(
        `insert into public.habit_logs (user_id, habit_id, local_date)
         values ($1, $2, '2026-08-18')`,
        [USER_A, habitB],
      )).rejects.toThrow()
      await expect(database!.query(
        `insert into public.habits (user_id, title) values ($1, 'Forbidden')`,
        [USER_B],
      )).rejects.toThrow(/row-level security/i)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('records and clears the durable archive boundary', async () => {
    const archived = await database!.query<{ archived_at: Date | null }>(
      'update public.habits set is_active = false where id = $1 returning archived_at',
      [habitA],
    )
    expect(archived.rows[0]?.archived_at).toBeInstanceOf(Date)

    const restored = await database!.query<{ archived_at: Date | null }>(
      'update public.habits set is_active = true where id = $1 returning archived_at',
      [habitA],
    )
    expect(restored.rows[0]?.archived_at).toBeNull()
  })

  it('reorders the complete active set atomically and rejects stale input', async () => {
    const second = (await database!.query<{ id: string }>(
      `insert into public.habits (user_id, title, position) values ($1, 'Stretch', 2000) returning id`,
      [USER_A],
    )).rows[0]!.id
    await authenticateLocalUser(database!, USER_A)
    try {
      const reordered = await database!.query<{ id: string; position: number }>(
        'select id, position from public.reorder_habits($1::uuid[])',
        [[second, habitA]],
      )
      expect(reordered.rows).toEqual([
        { id: second, position: '1000' }, { id: habitA, position: '2000' },
      ])
      await expect(database!.query(
        'select id from public.reorder_habits($1::uuid[])',
        [[habitA]],
      )).rejects.toThrow(/stale|inaccessible/i)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('isolates visual habit projects and detaches habits when a project is deleted', async () => {
    const ownProject = (await database!.query<{ id: string }>(
      `insert into public.habit_projects (user_id, name, icon, banner_asset, banner_monochrome)
       values ($1, 'Fitness', 'dumbbell', 'habits_4.gif', true) returning id`,
      [USER_A],
    )).rows[0]!.id
    const foreignProject = (await database!.query<{ id: string }>(
      `insert into public.habit_projects (user_id, name) values ($1, 'Private') returning id`,
      [USER_B],
    )).rows[0]!.id

    await expect(database!.query(
      'update public.habits set project_id = $1 where id = $2',
      [foreignProject, habitA],
    )).rejects.toThrow(/foreign key/i)
    await database!.query('update public.habits set project_id = $1 where id = $2', [ownProject, habitA])

    await authenticateLocalUser(database!, USER_A)
    try {
      const visible = await database!.query<{ name: string }>('select name from public.habit_projects')
      expect(visible.rows).toEqual([{ name: 'Fitness' }])
    } finally {
      await resetLocalRole(database!)
    }

    await database!.query('delete from public.habit_projects where id = $1', [ownProject])
    const detached = await database!.query<{ user_id: string; project_id: string | null }>(
      'select user_id, project_id from public.habits where id = $1',
      [habitA],
    )
    expect(detached.rows[0]).toEqual({ user_id: USER_A, project_id: null })
  })
})
