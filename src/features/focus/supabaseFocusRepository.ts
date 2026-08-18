import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import type { FocusRepository } from './repository'
import { createFocusSessionSchema, focusPhaseSchema } from './schemas'
import type { FocusSession, FocusSessionFilters } from './types'

type FocusSessionRow = Database['public']['Tables']['focus_sessions']['Row']

export class FocusRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'FocusRepositoryError'
  }
}

const mapSession = (row: FocusSessionRow): FocusSession => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.task_id,
  focusRunId: row.focus_run_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  plannedSeconds: row.planned_seconds,
  focusedSeconds: row.focused_seconds,
  sessionType: focusPhaseSchema.parse(row.session_type),
  completed: row.completed,
  createdAt: row.created_at,
})

const assertData = <T>(data: T | null, error: unknown, action: string): T => {
  if (error) throw new FocusRepositoryError(`Could not ${action}.`, { cause: error })
  if (data === null) throw new FocusRepositoryError(`Could not ${action}: the record was not found.`)
  return data
}

export const createSupabaseFocusRepository = (
  client: SupabaseClient<Database>,
): FocusRepository => ({
  listSessions: async (userId: string, filters: FocusSessionFilters = {}) => {
    let query = client
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (filters.startedAfter) query = query.gte('started_at', filters.startedAfter)
    if (filters.startedBefore) query = query.lte('started_at', filters.startedBefore)
    if (filters.taskId) query = query.eq('task_id', filters.taskId)
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    return assertData(data, error, 'load focus history').map(mapSession)
  },

  createSession: async (_userId, input) => {
    const value = createFocusSessionSchema.parse(input)
    const { data, error } = await client.rpc('record_focus_session', {
      p_focus_run_id: value.focusRunId ?? null,
      p_task_id: value.taskId ?? null,
      p_started_at: value.startedAt,
      p_ended_at: value.endedAt,
      p_planned_seconds: value.plannedSeconds,
      p_focused_seconds: value.focusedSeconds,
      p_session_type: value.sessionType,
      p_completed: value.completed,
    })
    return mapSession(assertData(data, error, 'save the focus session'))
  },

  startRewardRun: async (_userId, mode, description) => {
    const { data, error } = await client.rpc('start_focus_run', { p_mode: mode, p_description: description ?? '' })
    return assertData(data, error, 'start the rewarded Focus run')
  },

  completeRewardRun: async (_userId, runId) => {
    const { error } = await client.rpc('complete_focus_run_and_award', { p_run_id: runId })
    if (error) throw new FocusRepositoryError('Could not award the completed Focus run.', { cause: error })
  },

  abandonRewardRun: async (_userId, runId) => {
    const { error } = await client.rpc('abandon_focus_run', { p_run_id: runId })
    if (error) throw new FocusRepositoryError('Could not stop the Focus run.', { cause: error })
  },
})
