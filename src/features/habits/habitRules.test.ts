import { describe, expect, it } from 'vitest'

import type { Habit, HabitLog } from './types'
import {
  buildHabitHistoryDays,
  calculateHabitInsightSummary,
  calculateHabitStreaks,
  habitCompletionRate,
  isHabitScheduledOn,
  nextHabitLog,
  startOfHabitWeek,
} from './habitRules'

const habit: Habit = {
  id: '91000000-0000-4000-8000-000000000001',
  userId: '92000000-0000-4000-8000-000000000002',
  title: 'Read',
  description: null,
  icon: 'book-open',
  colorToken: 'sand',
  scheduleType: 'weekdays',
  weekdays: [1, 3, 5],
  targetCount: 2,
  unit: 'pages',
  position: 1000,
  isActive: true,
  archivedAt: null,
  createdAt: '2026-08-10T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
}

const log = (date: string, count: number, status: HabitLog['status'] = 'completed'): HabitLog => ({
  id: crypto.randomUUID(), userId: habit.userId, habitId: habit.id, localDate: date,
  count, status, note: null, source: 'manual', sourceId: null,
  createdAt: '2026-08-10T12:00:00.000Z', updatedAt: '2026-08-10T12:00:00.000Z',
})

describe('habit recurrence and count rules', () => {
  it('schedules only configured weekdays', () => {
    expect(isHabitScheduledOn(habit, '2026-08-17')).toBe(true)
    expect(isHabitScheduledOn(habit, '2026-08-18')).toBe(false)
  })

  it('clamps count progress, supports undo and treats skip separately', () => {
    const first = nextHabitLog(habit, undefined, '2026-08-17', 'increment')
    expect(first).toMatchObject({ count: 1, status: 'in_progress' })
    const second = nextHabitLog(habit, first, '2026-08-17', 'increment')
    expect(second).toMatchObject({ count: 2, status: 'completed' })
    expect(nextHabitLog(habit, second, '2026-08-17', 'increment').count).toBe(2)
    expect(nextHabitLog(habit, second, '2026-08-17', 'decrement')).toMatchObject({ count: 1, status: 'in_progress' })
    expect(nextHabitLog(habit, second, '2026-08-17', 'skip')).toMatchObject({ count: 0, status: 'skipped' })
  })

  it('does not let unscheduled days break streaks and lets an open today remain neutral', () => {
    const logs = [
      log('2026-08-10', 2),
      log('2026-08-12', 2),
      log('2026-08-14', 2),
    ]
    expect(calculateHabitStreaks(habit, logs, '2026-08-10', '2026-08-17')).toEqual({ current: 3, longest: 3 })
    expect(habitCompletionRate(habit, logs, '2026-08-10', '2026-08-17')).toEqual({
      completed: 3,
      scheduled: 4,
      rate: 0.75,
    })
  })

  it('makes skipped and under-target scheduled days break streaks', () => {
    const logs = [
      log('2026-08-10', 2),
      log('2026-08-12', 1, 'in_progress'),
      log('2026-08-14', 2),
      log('2026-08-17', 0, 'skipped'),
    ]
    expect(calculateHabitStreaks(habit, logs, '2026-08-10', '2026-08-17')).toEqual({ current: 0, longest: 1 })
  })

  it('builds factual history states without treating unscheduled days as misses', () => {
    const history = buildHabitHistoryDays(habit, [
      log('2026-08-10', 2),
      log('2026-08-12', 1, 'in_progress'),
      { ...log('2026-08-14', 0, 'skipped'), note: 'Travel' },
    ], '2026-08-10', '2026-08-16')

    expect(history.map(({ state }) => state)).toEqual([
      'completed', 'unscheduled', 'in_progress', 'unscheduled', 'skipped', 'unscheduled', 'unscheduled',
    ])
    expect(history[4]).toMatchObject({ scheduled: true, note: 'Travel', progress: 0 })
  })

  it('limits archived metrics to the real activity window', () => {
    const dailyHabit: Habit = {
      ...habit,
      scheduleType: 'daily',
      weekdays: null,
      isActive: false,
      archivedAt: '2026-08-13T18:00:00.000Z',
    }
    const logs = [
      log('2026-08-10', 2),
      log('2026-08-11', 2),
      log('2026-08-12', 0, 'skipped'),
    ]
    expect(calculateHabitInsightSummary(dailyHabit, logs, {
      today: '2026-08-17',
      createdOn: '2026-08-10',
      archivedOn: '2026-08-13',
      weekStartsOn: 1,
    })).toEqual({
      streaks: { current: 0, longest: 2 },
      week: { completed: 0, scheduled: 0, rate: 0 },
      month: { completed: 2, scheduled: 4, rate: 0.5 },
    })
  })

  it('uses the configured first weekday for weekly insight ranges', () => {
    expect(startOfHabitWeek('2026-08-18', 1)).toBe('2026-08-17')
    expect(startOfHabitWeek('2026-08-18', 0)).toBe('2026-08-16')
  })
})
