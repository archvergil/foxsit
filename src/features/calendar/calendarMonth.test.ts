import { describe, expect, it } from 'vitest'

import type { Task } from '@/features/tasks/types'
import { buildCalendarMonth, eventOccursOnDate, shiftMonthKey, taskOccursOnDate } from './calendarMonth'
import type { CalendarEvent } from './types'

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: '10000000-0000-4000-8000-000000000001',
  userId: '20000000-0000-4000-8000-000000000002',
  title: 'Event',
  description: null,
  allDay: false,
  startAt: '2026-08-18T02:30:00.000Z',
  endAt: '2026-08-18T04:30:00.000Z',
  startDate: null,
  endDate: null,
  category: null,
  colorToken: 'blue',
  location: null,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
  ...overrides,
})

const task = (overrides: Partial<Task> = {}): Task => ({
  id: '30000000-0000-4000-8000-000000000003',
  userId: '20000000-0000-4000-8000-000000000002',
  projectId: null,
  title: 'Task',
  notes: null,
  status: 'open',
  priority: 'none',
  scheduledDate: null,
  dueAt: null,
  estimateMinutes: null,
  position: 1000,
  completedAt: null,
  archivedAt: null,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
  ...overrides,
})

describe('Calendar month model', () => {
  it('builds a stable six-week grid using the profile week start', () => {
    const month = buildCalendarMonth('2026-08', 1)
    expect(month.label).toBe('August 2026')
    expect(month.gridStart).toBe('2026-07-27')
    expect(month.gridEnd).toBe('2026-09-06')
    expect(month.days).toHaveLength(42)
  })

  it('navigates through year boundaries', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
  })

  it('projects timed/all-day events and tasks into local dates', () => {
    expect(eventOccursOnDate(event(), '2026-08-17', 'America/Sao_Paulo')).toBe(true)
    expect(eventOccursOnDate(event(), '2026-08-18', 'America/Sao_Paulo')).toBe(true)
    expect(eventOccursOnDate(event({ allDay: true, startAt: null, endAt: null, startDate: '2026-08-20', endDate: '2026-08-22' }), '2026-08-21', 'UTC')).toBe(true)
    expect(taskOccursOnDate(task({ scheduledDate: '2026-08-21' }), '2026-08-21', 'UTC')).toBe(true)
    expect(taskOccursOnDate(task({ dueAt: '2026-08-22T01:00:00.000Z' }), '2026-08-21', 'America/Sao_Paulo')).toBe(true)
  })
})
