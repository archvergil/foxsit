import type { CreateFocusSessionInput, FocusPhaseJobStatus, FocusSession, FocusSessionFilters, RewardFocusMode, ScheduleFocusPhaseInput } from './types'

export interface FocusRepository {
  listSessions(userId: string, filters?: FocusSessionFilters): Promise<FocusSession[]>
  createSession(userId: string, input: CreateFocusSessionInput): Promise<FocusSession>
  schedulePhase?: (userId: string, input: ScheduleFocusPhaseInput) => Promise<string>
  settlePhase?: (userId: string, jobId: string) => Promise<FocusSession>
  pausePhase?: (userId: string, jobId: string) => Promise<FocusPhaseJobStatus>
  resumePhase?: (userId: string, jobId: string) => Promise<FocusPhaseJobStatus>
  cancelPhase?: (userId: string, jobId: string) => Promise<FocusPhaseJobStatus>
  deleteSession(userId: string, sessionId: string): Promise<void>
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
