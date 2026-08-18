// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authenticateLocalUser,
  createLocalTestDatabase,
  createLocalUser,
  resetLocalRole,
} from './localDatabase'

const USER_A = '10000000-0000-4000-8000-000000000001'
const USER_B = '20000000-0000-4000-8000-000000000002'

describe('Tasks database migrations on local PGlite', () => {
  let database: PGlite | undefined

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'user-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'user-b@local.test' })
  }, 30_000)

  afterAll(async () => {
    await database?.close()
  })

  it('applies every migration and creates the normalized task tables', async () => {
    const result = await database!.query<{ tablename: string }>(`
      select tablename
      from pg_tables
      where schemaname = 'public'
        and tablename in ('profiles', 'task_projects', 'tasks', 'task_checklist_items')
      order by tablename
    `)

    expect(result.rows.map((row) => row.tablename)).toEqual([
      'profiles',
      'task_checklist_items',
      'task_projects',
      'tasks',
    ])
  })

  it('isolates project rows through RLS and rejects a cross-user write', async () => {
    await database!.query(
      'insert into public.task_projects (user_id, name) values ($1, $2), ($3, $4)',
      [USER_A, 'User A project', USER_B, 'User B project'],
    )

    await authenticateLocalUser(database!, USER_A)
    try {
      const ownProjects = await database!.query<{ name: string }>(
        'select name from public.task_projects order by name',
      )
      expect(ownProjects.rows).toEqual([{ name: 'User A project' }])

      await expect(
        database!.query(
          'insert into public.task_projects (user_id, name) values ($1, $2)',
          [USER_B, 'Forbidden project'],
        ),
      ).rejects.toThrow(/row-level security/i)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('prevents linking a task to another user project', async () => {
    const project = await database!.query<{ id: string }>(
      'select id from public.task_projects where user_id = $1 limit 1',
      [USER_B],
    )
    const projectId = project.rows[0]?.id
    expect(projectId).toBeDefined()

    await expect(
      database!.query(
        `
          insert into public.tasks (user_id, project_id, title)
          values ($1, $2, 'Invalid ownership')
        `,
        [USER_A, projectId],
      ),
    ).rejects.toThrow(/foreign key/i)
  })

  it('stores local-day scheduling separately from a timestamped deadline', async () => {
    const inserted = await database!.query<{
      id: string
      scheduled_date: string
      due_at: Date
    }>(
      `
        insert into public.tasks (user_id, title, scheduled_date, due_at)
        values ($1, 'Timezone contract', $2::date, $3::timestamptz)
        returning id, to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date, due_at
      `,
      [USER_A, '2026-08-17', '2026-08-18T01:30:00-03:00'],
    )

    expect(inserted.rows[0]?.scheduled_date).toBe('2026-08-17')
    expect(inserted.rows[0]?.due_at.toISOString()).toBe('2026-08-18T04:30:00.000Z')
  })

  it('detaches tasks when a project is deleted without clearing task ownership', async () => {
    const project = await database!.query<{ id: string }>(
      `insert into public.task_projects (user_id, name) values ($1, 'Disposable') returning id`,
      [USER_A],
    )
    const projectId = project.rows[0]?.id
    const task = await database!.query<{ id: string }>(
      `insert into public.tasks (user_id, project_id, title) values ($1, $2, 'Keep me') returning id`,
      [USER_A, projectId],
    )

    await database!.query('delete from public.task_projects where id = $1', [projectId])
    const remaining = await database!.query<{ user_id: string; project_id: string | null }>(
      'select user_id, project_id from public.tasks where id = $1',
      [task.rows[0]?.id],
    )

    expect(remaining.rows[0]).toEqual({ user_id: USER_A, project_id: null })
  })
})
