export type FocusPhase = 'focus' | 'short_break' | 'long_break'

export interface FocusSession {
  id: string
  userId: string
  taskId: string | null
  startedAt: string
  endedAt: string
  plannedSeconds: number
  focusedSeconds: number
  sessionType: FocusPhase
  completed: boolean
  createdAt: string
}

export interface FocusSessionFilters {
  startedAfter?: string
  startedBefore?: string
  taskId?: string
  limit?: number
}

export interface CreateFocusSessionInput {
  taskId?: string | null
  startedAt: string
  endedAt: string
  plannedSeconds: number
  focusedSeconds: number
  sessionType: FocusPhase
  completed: boolean
}
