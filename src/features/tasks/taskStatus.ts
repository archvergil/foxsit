import type { TaskStatus } from './types'

export interface TaskStatusState {
  status: TaskStatus
  completedAt: string | null
  archivedAt: string | null
}

export const transitionTaskStatus = (
  current: TaskStatusState,
  nextStatus: TaskStatus,
  now: Date,
): TaskStatusState => {
  const timestamp = now.toISOString()

  if (nextStatus === 'open') {
    return { status: 'open', completedAt: null, archivedAt: null }
  }

  if (nextStatus === 'completed') {
    return { status: 'completed', completedAt: current.completedAt ?? timestamp, archivedAt: null }
  }

  return {
    status: 'archived',
    completedAt: current.completedAt,
    archivedAt: current.archivedAt ?? timestamp,
  }
}
