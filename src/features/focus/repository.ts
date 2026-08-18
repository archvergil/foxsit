import type { CreateFocusSessionInput, FocusSession, FocusSessionFilters, RewardFocusMode } from './types'

export interface FocusRepository {
  listSessions(userId: string, filters?: FocusSessionFilters): Promise<FocusSession[]>
  createSession(userId: string, input: CreateFocusSessionInput): Promise<FocusSession>
  startRewardRun?: (userId: string, mode: RewardFocusMode, description: string | null) => Promise<string>
  completeRewardRun?: (userId: string, runId: string) => Promise<void>
  abandonRewardRun?: (userId: string, runId: string) => Promise<void>
}

export const focusQueryKeys = {
  all: ['focus'] as const,
  sessions: (userId: string) => ['focus', 'sessions', userId] as const,
  sessionList: (userId: string, filters: FocusSessionFilters) =>
    ['focus', 'sessions', userId, filters] as const,
}
