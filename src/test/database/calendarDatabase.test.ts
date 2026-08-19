// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authenticateLocalUser, createLocalTestDatabase, createLocalUser, resetLocalRole } from './localDatabase'

const USER_A = '71000000-0000-4000-8000-000000000001'
const USER_B = '72000000-0000-4000-8000-000000000002'

describe('Calendar database migration', () => {
  let database: PGlite | undefined

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'calendar-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'calendar-b@local.test' })
  }, 30_000)

  afterAll(async () => database?.close())

  it('stores per-user Calendar display preferences with safe defaults', async () => {
    const defaults = await database!.query<{ calendar_show_events: boolean; calendar_show_tasks: boolean; calendar_show_habits: boolean }>(
      'select calendar_show_events,calendar_show_tasks,calendar_show_habits from public.profiles where id=$1', [USER_A],
    )
    expect(defaults.rows[0]).toEqual({ calendar_show_events: true, calendar_show_tasks: true, calendar_show_habits: true })

    await authenticateLocalUser(database!, USER_A)
    try {
      await database!.query('update public.profiles set calendar_show_tasks=false where id=$1', [USER_A])
      await database!.query('update public.profiles set calendar_show_tasks=false where id=$1', [USER_B])
    } finally {
      await resetLocalRole(database!)
    }
    const preferences = await database!.query<{ id: string; calendar_show_tasks: boolean }>(
      'select id,calendar_show_tasks from public.profiles where id in ($1,$2) order by id', [USER_A, USER_B],
    )
    expect(preferences.rows).toEqual([
      { id: USER_A, calendar_show_tasks: false },
      { id: USER_B, calendar_show_tasks: true },
    ])
  })

  it('stores timed and all-day events with exclusive shapes', async () => {
    const timed = await database!.query<{ start_at: Date }>(
      `insert into public.calendar_events (user_id, title, start_at, end_at)
       values ($1, 'Timed', $2::timestamptz, $3::timestamptz) returning start_at`,
      [USER_A, '2026-08-17T09:00:00-03:00', '2026-08-17T10:00:00-03:00'],
    )
    expect(timed.rows[0]?.start_at.toISOString()).toBe('2026-08-17T12:00:00.000Z')

    await database!.query(
      `insert into public.calendar_events (user_id, title, all_day, start_date, end_date)
       values ($1, 'Trip', true, '2026-08-20', '2026-08-22')`,
      [USER_A],
    )
    await expect(database!.query(
      `insert into public.calendar_events (user_id, title, all_day, start_at, end_at, start_date, end_date)
       values ($1, 'Mixed', true, now(), now() + interval '1 hour', '2026-08-20', '2026-08-20')`,
      [USER_A],
    )).rejects.toThrow(/calendar_events_temporal_shape_valid/i)
  })

  it('isolates reads and rejects cross-user inserts through RLS', async () => {
    await database!.query(
      `insert into public.calendar_events (user_id, title, all_day, start_date, end_date)
       values ($1, 'Other event', true, '2026-08-17', '2026-08-17')`,
      [USER_B],
    )
    await authenticateLocalUser(database!, USER_A)
    try {
      const visible = await database!.query<{ title: string }>('select title from public.calendar_events order by title')
      expect(visible.rows.map(({ title }) => title)).not.toContain('Other event')
      await expect(database!.query(
        `insert into public.calendar_events (user_id, title, all_day, start_date, end_date)
         values ($1, 'Forbidden', true, '2026-08-17', '2026-08-17')`,
        [USER_B],
      )).rejects.toThrow(/row-level security/i)
    } finally {
      await resetLocalRole(database!)
    }
  })
})
