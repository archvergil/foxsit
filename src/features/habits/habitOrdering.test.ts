import { describe, expect, it } from 'vitest'

import type { Habit } from './types'
import { mergeVisibleHabitOrder, moveHabitInList } from './habitOrdering'

const habit = (id: string, position: number): Habit => ({
  id, userId: '83000000-0000-4000-8000-000000000001', title: id, description: null,
  icon: 'circle-check-big', colorToken: 'mint', scheduleType: 'daily', weekdays: null,
  targetCount: 1, unit: null, position, isActive: true, archivedAt: null,
  createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
})

describe('habit ordering', () => {
  it('moves a visible habit one slot without mutating the source', () => {
    const habits = [habit('a', 1000), habit('b', 2000)]
    expect(moveHabitInList(habits, 'b', 'up').map(({ id }) => id)).toEqual(['b', 'a'])
    expect(habits.map(({ id }) => id)).toEqual(['a', 'b'])
  })

  it('preserves unscheduled slots while merging the visible order', () => {
    const all = [habit('a', 1000), habit('hidden', 2000), habit('b', 3000)]
    expect(mergeVisibleHabitOrder(all, [all[2]!, all[0]!]).map(({ id }) => id)).toEqual(['b', 'hidden', 'a'])
  })
})
