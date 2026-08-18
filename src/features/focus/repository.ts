import type { CreateFocusSessionInput, FocusSession, FocusSessionFilters } from './types'

export interface FocusRepository {
  listSessions(userId: string, filters?: FocusSessionFilters): Promise<FocusSession[]>
  createSession(userId: string, input: CreateFocusSessionInput): Promise<FocusSession>
}

export const focusQueryKeys = {
  all: ['focus'] as const,
  sessions: (userId: string) => ['focus', 'sessions', userId] as const,
  sessionList: (userId: string, filters: FocusSessionFilters) =>
    ['focus', 'sessions', userId, filters] as const,
}
