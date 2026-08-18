import type { LocalApiClient } from '@/lib/localApi'
import { habitInputSchema, habitLogInputSchema } from './schemas'
import type { HabitsRepository } from './repository'

export const createLocalHabitsRepository = (client: LocalApiClient): HabitsRepository => ({
  listHabits: (_userId, includeInactive = false) => client.get(`/v1/habits?includeInactive=${includeInactive}`),
  createHabit: (_userId, input) => client.post('/v1/habits', habitInputSchema.parse(input)),
  updateHabit: (_userId, habitId, input) => client.patch(`/v1/habits/${habitId}`, habitInputSchema.parse(input)),
  deleteHabit: (_userId, habitId) => client.delete(`/v1/habits/${habitId}`),
  reorderHabits: (_userId, orderedHabitIds) => client.patch('/v1/habits/reorder', { orderedHabitIds }),
  listLogs: (_userId, range) => {
    const params = new URLSearchParams({ dateStart: range.dateStart, dateEnd: range.dateEnd })
    if (range.habitId) params.set('habitId', range.habitId)
    return client.get(`/v1/habit-logs?${params.toString()}`)
  },
  upsertLog: (_userId, input) => client.put('/v1/habit-logs', habitLogInputSchema.parse(input)),
})
