import { describe, expect, it } from 'vitest'

import type { Habit, HabitLog } from '@/features/habits/types'
import { projectHabitCalendarItems } from './habitCalendarAdapter'

const habit: Habit = {
  id: '84000000-0000-4000-8000-000000000001', userId: '83000000-0000-4000-8000-000000000001',
  title: 'Read', description: null, icon: 'book-open', colorToken: 'sand', scheduleType: 'weekdays',
  weekdays: [1, 3], targetCount: 2, unit: 'chapters', position: 1000, isActive: false,
  archivedAt: '2026-08-19T18:00:00.000Z', createdAt: '2026-08-16T18:00:00.000Z', updatedAt: '2026-08-19T18:00:00.000Z',
}

describe('Habit to Calendar adapter', () => {
  it('projects only scheduled dates inside the timezone-aware activity window', () => {
    const log: HabitLog = {
      id: '85000000-0000-4000-8000-000000000001', userId: habit.userId, habitId: habit.id,
      localDate: '2026-08-17', count: 2, status: 'completed', note: null, source: 'manual', sourceId: null,
      createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
    }
    expect(projectHabitCalendarItems([habit], [log], '2026-08-15', '2026-08-22', 'America/Sao_Paulo')).toEqual([
      expect.objectContaining({ date: '2026-08-17', status: 'completed', count: 2 }),
      expect.objectContaining({ date: '2026-08-19', status: 'pending', count: 0 }),
    ])
  })
})
