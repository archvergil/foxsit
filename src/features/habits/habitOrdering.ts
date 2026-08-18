import type { Habit } from './types'

export const moveHabitInList = (
  habits: Habit[],
  habitId: string,
  direction: 'up' | 'down',
) => {
  const index = habits.findIndex(({ id }) => id === habitId)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= habits.length) return habits
  const reordered = [...habits]
  const [habit] = reordered.splice(index, 1)
  if (!habit) return habits
  reordered.splice(target, 0, habit)
  return reordered
}

export const mergeVisibleHabitOrder = (allActiveHabits: Habit[], visibleOrder: Habit[]) => {
  const visibleIds = new Set(visibleOrder.map(({ id }) => id))
  const queue = [...visibleOrder]
  return allActiveHabits.map((habit) => visibleIds.has(habit.id) ? queue.shift() ?? habit : habit)
}
