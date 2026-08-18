import { localDateKey } from '@/lib/dates'
import type { FocusSession } from './types'

const minutes = (seconds: number) => Math.round(seconds / 60)

export const focusedMinutesForTask = (sessions: FocusSession[]) => minutes(sessions
  .filter(({ sessionType }) => sessionType === 'focus')
  .reduce((total, focusSession) => total + focusSession.focusedSeconds, 0))

export const focusSummary = (sessions: FocusSession[], timeZone: string, now = new Date()) => {
  const today = localDateKey(now, timeZone)
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60_000
  const focusSessions = sessions.filter((focusSession) => focusSession.sessionType === 'focus')
  const todaySeconds = focusSessions
    .filter((focusSession) => localDateKey(new Date(focusSession.startedAt), timeZone) === today)
    .reduce((total, focusSession) => total + focusSession.focusedSeconds, 0)
  const weekSeconds = focusSessions
    .filter((focusSession) => new Date(focusSession.startedAt).getTime() >= weekAgo)
    .reduce((total, focusSession) => total + focusSession.focusedSeconds, 0)
  const taskSeconds = new Map<string, number>()
  for (const focusSession of focusSessions) {
    if (focusSession.taskId) {
      taskSeconds.set(
        focusSession.taskId,
        (taskSeconds.get(focusSession.taskId) ?? 0) + focusSession.focusedSeconds,
      )
    }
  }
  return {
    todayMinutes: minutes(todaySeconds),
    weekMinutes: minutes(weekSeconds),
    completedCount: focusSessions.filter((focusSession) => focusSession.completed).length,
    taskTotals: [...taskSeconds]
      .map(([taskId, seconds]) => ({ taskId, minutes: minutes(seconds) }))
      .sort((left, right) => right.minutes - left.minutes),
  }
}
