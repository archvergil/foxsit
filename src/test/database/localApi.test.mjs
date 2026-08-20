// @vitest-environment node

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { URLSearchParams } from 'node:url'

import { createDatabaseAccess } from '../../../scripts/local-db/database-access.mjs'
import { createLocalHttpServer } from '../../../scripts/local-db/local-http-server.mjs'
import { applyLocalMigrations } from '../../../scripts/local-db/migrate.mjs'

const localFetch = globalThis.fetch

const signup = async (baseUrl, email) => {
  const response = await localFetch(`${baseUrl}/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'LocalTest!2026',
      displayName: 'Local Tester',
      timezone: 'America/Sao_Paulo',
    }),
  })
  expect(response.status).toBe(200)
  return (await response.json()).data
}

const request = (baseUrl, token, path, init = {}) => localFetch(`${baseUrl}${path}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...init.headers,
  },
})

describe('local account and data API', () => {
  let database
  let server

  beforeAll(async () => {
    database = new PGlite()
    await applyLocalMigrations(database)
    const access = createDatabaseAccess(database)
    server = createLocalHttpServer({ database, ...access, port: 0 })
    await server.start()
  }, 30_000)

  afterAll(async () => {
    await server?.stop()
    await database?.close()
  })

  it('allows browser preflights for every local API write method', async () => {
    const response = await localFetch(`${server.url}/v1/habit-logs`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5174',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-methods')).toContain('PUT')
  })

  it('creates a durable local account, restores its session and persists tasks', async () => {
    const session = await signup(server.url, 'first-user@local.test')
    const sessionResponse = await request(server.url, session.accessToken, '/v1/auth/session')
    expect(sessionResponse.status).toBe(200)

    const createResponse = await request(server.url, session.accessToken, '/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Persist locally', scheduledDate: '2026-08-17' }),
    })
    expect(createResponse.status).toBe(200)
    const task = (await createResponse.json()).data

    const listResponse = await request(
      server.url,
      session.accessToken,
      '/v1/tasks?status=open&scheduledDate=2026-08-17',
    )
    const list = (await listResponse.json()).data
    expect(list.map((task) => task.title)).toEqual(['Persist locally'])

    const focusResponse = await request(server.url, session.accessToken, '/v1/focus-sessions', {
      method: 'POST',
      body: JSON.stringify({
        taskId: task.id,
        startedAt: '2026-08-17T12:00:00.000Z',
        endedAt: '2026-08-17T12:25:00.000Z',
        plannedSeconds: 1500,
        focusedSeconds: 1500,
        sessionType: 'focus',
        completed: true,
      }),
    })
    expect(focusResponse.status).toBe(200)
    const focusSession = (await focusResponse.json()).data

    const historyResponse = await request(server.url, session.accessToken, '/v1/focus-sessions?limit=10')
    expect(historyResponse.status).toBe(200)
    expect((await historyResponse.json()).data).toMatchObject([
      { taskId: task.id, focusedSeconds: 1500, completed: true },
    ])

    const deleteFocusResponse = await request(server.url, session.accessToken, `/v1/focus-sessions/${focusSession.id}`, {
      method: 'DELETE',
    })
    expect(deleteFocusResponse.status).toBe(200)
    const emptyHistoryResponse = await request(server.url, session.accessToken, '/v1/focus-sessions?limit=10')
    expect((await emptyHistoryResponse.json()).data).toEqual([])
  })

  it('isolates local API reads by the authenticated session', async () => {
    const secondSession = await signup(server.url, 'second-user@local.test')
    const response = await request(server.url, secondSession.accessToken, '/v1/tasks?status=open')
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual([])

    const focusResponse = await request(server.url, secondSession.accessToken, '/v1/focus-sessions')
    expect(focusResponse.status).toBe(200)
    expect((await focusResponse.json()).data).toEqual([])
  })

  it('persists project management, task details and checklist writes', async () => {
    const session = await signup(server.url, 'task-details@local.test')
    const projectResponse = await request(server.url, session.accessToken, '/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Launch', colorToken: 'blue' }),
    })
    expect(projectResponse.status).toBe(200)
    const project = (await projectResponse.json()).data

    const taskResponse = await request(server.url, session.accessToken, '/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Prepare launch', projectId: project.id }),
    })
    const task = (await taskResponse.json()).data
    const updateResponse = await request(server.url, session.accessToken, `/v1/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        notes: 'Durable details',
        priority: 'high',
        estimateMinutes: 45,
        dueAt: '2026-08-18T04:30:00.000Z',
      }),
    })
    expect(updateResponse.status).toBe(200)
    expect((await updateResponse.json()).data).toMatchObject({
      notes: 'Durable details',
      priority: 'high',
      estimateMinutes: 45,
      dueAt: '2026-08-18T04:30:00.000Z',
    })

    const checklistResponse = await request(server.url, session.accessToken, '/v1/checklist', {
      method: 'POST',
      body: JSON.stringify({ taskId: task.id, title: 'Run checks' }),
    })
    const checklist = (await checklistResponse.json()).data
    const completeResponse = await request(server.url, session.accessToken, `/v1/checklist/${checklist.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    })
    expect(completeResponse.status).toBe(200)
    expect((await completeResponse.json()).data.completed).toBe(true)

    const deleteProjectResponse = await request(
      server.url,
      session.accessToken,
      `/v1/projects/${project.id}`,
      { method: 'DELETE' },
    )
    expect(deleteProjectResponse.status).toBe(200)
    const tasksResponse = await request(server.url, session.accessToken, '/v1/tasks?status=open')
    expect((await tasksResponse.json()).data).toMatchObject([{ id: task.id, projectId: null }])
  })

  it('reorders the complete open-task set and rejects stale orders', async () => {
    const session = await signup(server.url, 'task-order@local.test')
    const created = []
    for (const title of ['First', 'Second', 'Third']) {
      const response = await request(server.url, session.accessToken, '/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })
      created.push((await response.json()).data)
    }
    const orderedTaskIds = [created[2].id, created[0].id, created[1].id]
    const reorderResponse = await request(server.url, session.accessToken, '/v1/tasks/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedTaskIds }),
    })
    expect(reorderResponse.status).toBe(200)
    expect((await reorderResponse.json()).data.map(({ id }) => id)).toEqual(orderedTaskIds)

    const staleResponse = await request(server.url, session.accessToken, '/v1/tasks/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedTaskIds: orderedTaskIds.slice(0, 2) }),
    })
    expect(staleResponse.status).toBe(409)
    const listResponse = await request(server.url, session.accessToken, '/v1/tasks?status=open')
    expect((await listResponse.json()).data.map(({ id }) => id)).toEqual(orderedTaskIds)
  })

  it('persists Calendar CRUD and returns only events overlapping the requested range', async () => {
    const session = await signup(server.url, 'calendar-api@local.test')
    const createResponse = await request(server.url, session.accessToken, '/v1/calendar-events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Local planning',
        description: null,
        allDay: false,
        startAt: '2026-08-17T12:00:00.000Z',
        endAt: '2026-08-17T13:00:00.000Z',
        startDate: null,
        endDate: null,
        category: 'Work',
        colorToken: 'mint',
        location: null,
      }),
    })
    expect(createResponse.status).toBe(200)
    const event = (await createResponse.json()).data

    const params = new URLSearchParams({
      rangeStart: '2026-08-17T03:00:00.000Z',
      rangeEnd: '2026-08-18T03:00:00.000Z',
      localDateStart: '2026-08-17',
      localDateEnd: '2026-08-17',
    })
    const listResponse = await request(server.url, session.accessToken, `/v1/calendar-events?${params}`)
    expect(listResponse.status).toBe(200)
    expect((await listResponse.json()).data).toMatchObject([{ id: event.id, title: 'Local planning' }])

    const updateResponse = await request(server.url, session.accessToken, `/v1/calendar-events/${event.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: 'Updated planning',
        description: 'Bring the roadmap',
        allDay: true,
        startAt: null,
        endAt: null,
        startDate: '2026-08-20',
        endDate: '2026-08-20',
        category: null,
        colorToken: 'sand',
        location: 'Studio',
      }),
    })
    expect(updateResponse.status).toBe(200)
    expect((await updateResponse.json()).data).toMatchObject({ title: 'Updated planning', allDay: true })

    const deleteResponse = await request(server.url, session.accessToken, `/v1/calendar-events/${event.id}`, { method: 'DELETE' })
    expect(deleteResponse.status).toBe(200)
  })

  it('persists Habits schedules and count progress through the local API', async () => {
    const session = await signup(server.url, 'habits-api@local.test')
    const createResponse = await request(server.url, session.accessToken, '/v1/habits', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Drink water',
        description: 'Keep a bottle nearby',
        icon: 'glass-water',
        colorToken: 'blue',
        scheduleType: 'daily',
        weekdays: null,
        targetCount: 2,
        unit: 'glasses',
        position: 1000,
        isActive: true,
      }),
    })
    expect(createResponse.status).toBe(200)
    const habit = (await createResponse.json()).data

    const secondResponse = await request(server.url, session.accessToken, '/v1/habits', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Stretch', description: null, icon: 'footprints', colorToken: 'mint', scheduleType: 'daily',
        weekdays: null, targetCount: 1, unit: null, position: 2000, isActive: true,
      }),
    })
    expect(secondResponse.status).toBe(200)
    const secondHabit = (await secondResponse.json()).data

    const reorderResponse = await request(server.url, session.accessToken, '/v1/habits/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedHabitIds: [secondHabit.id, habit.id] }),
    })
    expect(reorderResponse.status).toBe(200)
    expect((await reorderResponse.json()).data.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: secondHabit.id, position: 1000 }, { id: habit.id, position: 2000 },
    ])

    const staleOrderResponse = await request(server.url, session.accessToken, '/v1/habits/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedHabitIds: [habit.id] }),
    })
    expect(staleOrderResponse.status).toBe(409)

    const listResponse = await request(server.url, session.accessToken, '/v1/habits')
    expect(listResponse.status).toBe(200)
    expect((await listResponse.json()).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: habit.id, targetCount: 2 }),
      expect.objectContaining({ id: secondHabit.id }),
    ]))

    const progressResponse = await request(server.url, session.accessToken, '/v1/habit-logs', {
      method: 'PUT',
      body: JSON.stringify({
        habitId: habit.id,
        localDate: '2026-08-17',
        count: 1,
        status: 'in_progress',
        note: null,
      }),
    })
    expect(progressResponse.status).toBe(200)
    expect((await progressResponse.json()).data).toMatchObject({ count: 1, status: 'in_progress' })

    const completeResponse = await request(server.url, session.accessToken, '/v1/habit-logs', {
      method: 'PUT',
      body: JSON.stringify({
        habitId: habit.id,
        localDate: '2026-08-17',
        count: 2,
        status: 'completed',
        note: null,
      }),
    })
    expect(completeResponse.status).toBe(200)

    const params = new URLSearchParams({ dateStart: '2026-08-17', dateEnd: '2026-08-17' })
    const logsResponse = await request(server.url, session.accessToken, `/v1/habit-logs?${params}`)
    expect(logsResponse.status).toBe(200)
    expect((await logsResponse.json()).data).toMatchObject([{
      habitId: habit.id, localDate: '2026-08-17', count: 2, status: 'completed',
    }])

    const clearHistoryResponse = await request(server.url, session.accessToken, `/v1/habits/${habit.id}/history`, { method: 'DELETE' })
    expect(clearHistoryResponse.status).toBe(200)
    const clearedLogsResponse = await request(server.url, session.accessToken, `/v1/habit-logs?${params}`)
    expect((await clearedLogsResponse.json()).data).toEqual([])
    const habitsAfterClear = await request(server.url, session.accessToken, '/v1/habits')
    expect((await habitsAfterClear.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: habit.id })]))

    const archiveResponse = await request(server.url, session.accessToken, `/v1/habits/${habit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...habit, isActive: false }),
    })
    expect(archiveResponse.status).toBe(200)
    expect((await archiveResponse.json()).data.archivedAt).toEqual(expect.any(String))
    const activeResponse = await request(server.url, session.accessToken, '/v1/habits')
    expect((await activeResponse.json()).data).toMatchObject([{ id: secondHabit.id }])
  })
})
