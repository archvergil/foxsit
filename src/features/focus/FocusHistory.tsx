import { Check, Clock3, Link2, TimerOff } from 'lucide-react'

import type { Task } from '@/features/tasks/types'
import type { FocusSession } from './types'

const phaseLabel = {
  focus: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break',
} as const

const minutes = (seconds: number) => Math.round(seconds / 60)

export function FocusHistory({
  sessions,
  tasks,
  timeZone,
  isLoading,
  error,
  onRetry,
}: {
  sessions: FocusSession[] | undefined
  tasks: Task[]
  timeZone: string
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}) {
  if (isLoading) return <div className="focus-history__state" role="status">Loading focus history…</div>
  if (error) {
    return (
      <div className="focus-history__state focus-history__state--error" role="alert">
        <span>History could not be loaded.</span>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
    )
  }
  if (!sessions?.length) {
    return (
      <div className="focus-history__state">
        <span className="focus-history__empty-icon"><Clock3 aria-hidden /></span>
        <strong>No sessions yet.</strong>
        <p>Complete or stop a timer and its durable record will appear here.</p>
      </div>
    )
  }

  const taskMap = new Map(tasks.map((task) => [task.id, task.title]))
  return (
    <div className="focus-history__list">
      {sessions.slice(0, 8).map((focusSession) => (
        <article className="focus-history__row" key={focusSession.id}>
          <span className={`focus-history__status${focusSession.completed ? ' focus-history__status--complete' : ''}`}>
            {focusSession.completed ? <Check aria-hidden /> : <TimerOff aria-hidden />}
          </span>
          <span className="focus-history__content">
            <strong>{phaseLabel[focusSession.sessionType]}</strong>
            <small>
              {new Intl.DateTimeFormat('en-US', {
                timeZone,
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(focusSession.startedAt))}
            </small>
          </span>
          {focusSession.taskId ? (
            <span className="focus-history__task"><Link2 aria-hidden />{taskMap.get(focusSession.taskId) ?? 'Linked task'}</span>
          ) : null}
          <strong className="focus-history__minutes">{minutes(focusSession.focusedSeconds)} min</strong>
        </article>
      ))}
    </div>
  )
}
