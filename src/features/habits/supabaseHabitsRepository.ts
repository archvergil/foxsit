import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import {
  habitColorTokenSchema,
  habitIconSchema,
  habitInputSchema,
  habitLogInputSchema,
  habitLogStatusSchema,
  habitScheduleTypeSchema,
} from './schemas'
import type { HabitLogRange, HabitsRepository } from './repository'
import type { Habit, HabitInput, HabitLog } from './types'

type HabitRow = Database['public']['Tables']['habits']['Row']
type HabitLogRow = Database['public']['Tables']['habit_logs']['Row']

export class HabitsRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HabitsRepositoryError'
  }
}

const assertData = <T>(data: T | null, error: unknown, action: string): T => {
  if (error || data === null) throw new HabitsRepositoryError(`Could not ${action}.`, { cause: error })
  return data
}

const mapHabit = (row: HabitRow): Habit => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  icon: habitIconSchema.parse(row.icon),
  colorToken: habitColorTokenSchema.parse(row.color_token),
  scheduleType: habitScheduleTypeSchema.parse(row.schedule_type),
  weekdays: row.weekdays,
  targetCount: row.target_count,
  unit: row.unit,
  position: row.position,
  isActive: row.is_active,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapLog = (row: HabitLogRow): HabitLog => ({
  id: row.id,
  userId: row.user_id,
  habitId: row.habit_id,
  localDate: row.local_date,
  count: row.count,
  status: habitLogStatusSchema.parse(row.status),
  note: row.note,
  source: row.source === null ? null : row.source === 'manual' || row.source === 'workout'
    ? row.source
    : (() => { throw new HabitsRepositoryError('Habit log source is invalid.') })(),
  sourceId: row.source_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const habitRowFromInput = (input: HabitInput) => {
  const value = habitInputSchema.parse(input)
  return {
    title: value.title,
    description: value.description,
    icon: value.icon,
    color_token: value.colorToken,
    schedule_type: value.scheduleType,
    weekdays: value.weekdays,
    target_count: value.targetCount,
    unit: value.unit,
    position: value.position,
    is_active: value.isActive,
  }
}

const sortHabits = (habits: Habit[]) => [...habits].sort((left, right) =>
  left.position - right.position || left.createdAt.localeCompare(right.createdAt))

export const createSupabaseHabitsRepository = (
  client: SupabaseClient<Database>,
): HabitsRepository => ({
  listHabits: async (userId, includeInactive = false) => {
    let query = client.from('habits').select('*').eq('user_id', userId)
    if (!includeInactive) query = query.eq('is_active', true)
    const { data, error } = await query.order('position').order('created_at')
    return sortHabits(assertData(data, error, 'load habits').map(mapHabit))
  },
  createHabit: async (userId, input) => {
    const { data, error } = await client.from('habits')
      .insert({ user_id: userId, ...habitRowFromInput(input) }).select('*').single()
    return mapHabit(assertData(data, error, 'create the habit'))
  },
  updateHabit: async (userId, habitId, input) => {
    const { data, error } = await client.from('habits').update(habitRowFromInput(input))
      .eq('id', habitId).eq('user_id', userId).select('*').single()
    return mapHabit(assertData(data, error, 'update the habit'))
  },
  deleteHabit: async (userId, habitId) => {
    const { data, error } = await client.from('habits').delete()
      .eq('id', habitId).eq('user_id', userId).select('id').maybeSingle()
    assertData(data, error, 'delete the habit')
  },
  reorderHabits: async (_userId, orderedHabitIds) => {
    const { data, error } = await client.rpc('reorder_habits', { p_habit_ids: orderedHabitIds })
    return sortHabits(assertData(data, error, 'reorder habits').map(mapHabit))
  },
  listLogs: async (userId, range: HabitLogRange) => {
    let query = client.from('habit_logs').select('*').eq('user_id', userId)
      .gte('local_date', range.dateStart).lte('local_date', range.dateEnd)
    if (range.habitId) query = query.eq('habit_id', range.habitId)
    const { data, error } = await query.order('local_date')
    return assertData(data, error, 'load habit progress').map(mapLog)
  },
  upsertLog: async (userId, input) => {
    const value = habitLogInputSchema.parse(input)
    const { data, error } = await client.from('habit_logs').upsert({
      user_id: userId,
      habit_id: value.habitId,
      local_date: value.localDate,
      count: value.count,
      status: value.status,
      note: value.note,
      source: 'manual',
      source_id: null,
    }, { onConflict: 'habit_id,local_date' }).select('*').single()
    return mapLog(assertData(data, error, 'save habit progress'))
  },
})
