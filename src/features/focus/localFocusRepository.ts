import type { LocalApiClient } from '@/lib/localApi'
import type { FocusRepository } from './repository'
import { createFocusSessionSchema } from './schemas'
import type { FocusSessionFilters } from './types'

const sessionPath = (filters: FocusSessionFilters) => {
  const params = new URLSearchParams()
  if (filters.startedAfter) params.set('startedAfter', filters.startedAfter)
  if (filters.startedBefore) params.set('startedBefore', filters.startedBefore)
  if (filters.taskId) params.set('taskId', filters.taskId)
  if (filters.limit) params.set('limit', String(filters.limit))
  const query = params.toString()
  return query ? `/v1/focus-sessions?${query}` : '/v1/focus-sessions'
}

export const createLocalFocusRepository = (client: LocalApiClient): FocusRepository => ({
  listSessions: (_userId, filters = {}) => client.get(sessionPath(filters)),
  createSession: (_userId, input) =>
    client.post('/v1/focus-sessions', createFocusSessionSchema.parse(input)),
})
