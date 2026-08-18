import { describe, expect, it } from 'vitest'

import { todayHabitProgress, todayMetrics } from './todayOverview'

describe('Today overview', () => {
  it('counts profile-local completions and only scheduled habits', () => {
    const progress = todayHabitProgress([
      { id: 'daily', userId: 'u', title: 'Read', description: null, icon: 'book-open', colorToken: 'mint', scheduleType: 'daily', weekdays: null, targetCount: 1, unit: null, position: 1, isActive: true, archivedAt: null, createdAt: '', updatedAt: '' },
      { id: 'weekend', userId: 'u', title: 'Walk', description: null, icon: 'footprints', colorToken: 'blue', scheduleType: 'weekdays', weekdays: [0], targetCount: 1, unit: null, position: 2, isActive: true, archivedAt: null, createdAt: '', updatedAt: '' },
    ], [{ id: 'log', userId: 'u', habitId: 'daily', localDate: '2026-08-17', count: 1, status: 'completed', note: null, source: 'manual', sourceId: null, createdAt: '', updatedAt: '' }], '2026-08-17')
    expect(progress).toMatchObject({ completed: 1 })

    expect(todayMetrics({ tasks: [{ id: 'task', userId: 'u', projectId: null, title: 'Done', notes: null, status: 'completed', priority: 'none', scheduledDate: null, dueAt: null, estimateMinutes: null, position: 1, completedAt: '2026-08-17T02:30:00.000Z', archivedAt: null, createdAt: '', updatedAt: '' }], habitsCompleted: 1, habitsScheduled: 2, focusSessions: [], workouts: [], timeZone: 'America/Sao_Paulo', now: new Date('2026-08-17T12:00:00.000Z') })).toMatchObject({ tasksCompleted: 0, habitsCompleted: 1, habitsScheduled: 2 })
  })
})
