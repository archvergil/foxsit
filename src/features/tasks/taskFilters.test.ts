import { describe, expect, it } from 'vitest'

import { taskMatchesFilters } from './taskFilters'
import type { Task } from './types'

const task: Task = {
  id: '4ae7f749-e5bc-44db-8de6-67d52c202596',
  userId: '11af0e2c-665e-4774-b6bb-4e97f839c5cb',
  projectId: null,
  title: 'Plan the week',
  notes: null,
  status: 'open',
  priority: 'none',
  scheduledDate: '2026-08-18',
  dueAt: '2026-08-18T18:00:00.000Z',
  estimateMinutes: null,
  position: 1000,
  completedAt: null,
  archivedAt: null,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
}

describe('taskMatchesFilters', () => {
  it('matches Inbox and exact-day filters', () => {
    expect(taskMatchesFilters(task, { status: 'open', projectId: null })).toBe(true)
    expect(taskMatchesFilters(task, { scheduledDate: '2026-08-18' })).toBe(true)
    expect(taskMatchesFilters(task, { scheduledDate: '2026-08-17' })).toBe(false)
  })

  it('matches upcoming ranges without treating unscheduled tasks as upcoming', () => {
    expect(taskMatchesFilters(task, { scheduledAfter: '2026-08-17' })).toBe(true)
    expect(taskMatchesFilters({ ...task, scheduledDate: null }, { scheduledAfter: '2026-08-17' })).toBe(false)
  })

  it('matches any project in a selected nested project branch', () => {
    const nestedTask = { ...task, projectId: '71af0e2c-665e-4774-b6bb-4e97f839c5cb' }
    expect(taskMatchesFilters(nestedTask, { projectIds: [
      '61af0e2c-665e-4774-b6bb-4e97f839c5cb',
      '71af0e2c-665e-4774-b6bb-4e97f839c5cb',
    ] })).toBe(true)
    expect(taskMatchesFilters(nestedTask, { projectIds: ['61af0e2c-665e-4774-b6bb-4e97f839c5cb'] })).toBe(false)
  })
})
