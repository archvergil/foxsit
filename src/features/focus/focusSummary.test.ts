import { describe, expect, it } from 'vitest'

import { focusedMinutesForTask, focusSummary } from './focusSummary'
import type { FocusSession } from './types'

const session = (overrides: Partial<FocusSession>): FocusSession => ({
  id: crypto.randomUUID(),
  userId: '10000000-0000-4000-8000-000000000001',
  taskId: null,
  startedAt: '2026-08-17T12:00:00.000Z',
  endedAt: '2026-08-17T12:25:00.000Z',
  plannedSeconds: 1500,
  focusedSeconds: 1500,
  sessionType: 'focus',
  completed: true,
  createdAt: '2026-08-17T12:25:00.000Z',
  ...overrides,
})

describe('focusSummary', () => {
  it('uses the profile timezone for Today and groups minutes by task', () => {
    const taskId = '20000000-0000-4000-8000-000000000002'
    const result = focusSummary([
      session({ taskId, startedAt: '2026-08-18T01:30:00.000Z', focusedSeconds: 1200 }),
      session({ taskId, startedAt: '2026-08-17T18:00:00.000Z', focusedSeconds: 600 }),
      session({ sessionType: 'short_break', focusedSeconds: 300, plannedSeconds: 300 }),
    ], 'America/Sao_Paulo', new Date('2026-08-18T02:00:00.000Z'))

    expect(result).toEqual({
      todayMinutes: 30,
      weekMinutes: 30,
      completedCount: 2,
      taskTotals: [{ taskId, minutes: 30 }],
    })
    expect(focusedMinutesForTask([
      session({ taskId, focusedSeconds: 1200 }),
      session({ taskId, focusedSeconds: 600 }),
      session({ sessionType: 'short_break', focusedSeconds: 300, plannedSeconds: 300 }),
    ])).toBe(30)
  })
})
