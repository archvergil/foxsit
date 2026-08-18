import { ArrowRight, CheckSquare2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { localDateKey } from '@/lib/dates'
import { useSetTaskStatus, useTaskDateContext, useTaskList, useTaskProjects } from './queries'
import { TaskListPanel } from './TaskListPanel'

export function TodayTasksCard() {
  const { timeZone } = useTaskDateContext()
  const today = localDateKey(new Date(), timeZone)
  const tasksQuery = useTaskList({ status: 'open', scheduledDate: today })
  const projectsQuery = useTaskProjects()
  const statusMutation = useSetTaskStatus()

  return (
    <article className="today-tasks-card">
      <header className="today-tasks-card__header">
        <span className="today-tasks-card__icon"><CheckSquare2 aria-hidden /></span>
        <span>
          <span className="eyebrow">Tasks for today</span>
          <strong>{tasksQuery.isPending ? 'Loading…' : `${tasksQuery.data?.length ?? 0} open`}</strong>
        </span>
        <Link to="/tasks/today" aria-label="Open all tasks for Today"><ArrowRight aria-hidden /></Link>
      </header>
      <TaskListPanel
        compact
        tasks={tasksQuery.data}
        projects={projectsQuery.data ?? []}
        today={today}
        timeZone={timeZone}
        isLoading={tasksQuery.isPending}
        error={tasksQuery.error}
        mutationError={statusMutation.error}
        emptyTitle="Today is clear."
        emptyBody="Add a task when the day needs one."
        pendingTaskId={statusMutation.isPending ? statusMutation.variables?.task.id : undefined}
        onRetry={() => void tasksQuery.refetch()}
        onStatusChange={(task, status) => statusMutation.mutate({ task, status })}
      />
    </article>
  )
}
