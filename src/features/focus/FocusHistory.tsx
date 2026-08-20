import { Check, Clock3, Link2, TimerOff, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
  onDelete,
  deletingSessionId,
}: {
  sessions: FocusSession[] | undefined
  tasks: Task[]
  timeZone: string
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onDelete: (sessionId: string) => Promise<void>
  deletingSessionId: string | null
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
      {sessions.map((focusSession) => (
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
          <ConfirmDialog
            actionLabel="Delete session"
            description="This Focus history entry will be permanently removed. Earned reward transactions, if any, remain in the immutable reward ledger."
            onConfirm={() => onDelete(focusSession.id)}
            pending={deletingSessionId === focusSession.id}
            title="Delete this Focus session?"
            trigger={<button className="focus-history__delete" type="button" aria-label={`Delete ${phaseLabel[focusSession.sessionType]} session`}><Trash2 aria-hidden /></button>}
          />
        </article>
      ))}
    </div>
  )
}
