import {
  CalendarRange,
  CheckCircle2,
  Folder,
  Inbox,
  ListChecks,
  Sun,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { addLocalDays, localDateKey } from '@/lib/dates'
import { tasksCopy } from './copy'
import {
  useSetTaskStatus,
  useTaskDateContext,
  useTaskList,
  useTaskProjects,
  useReorderTasks,
  useUpdateTask,
} from './queries'
import { TaskListPanel } from './TaskListPanel'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TaskProjectManager } from './TaskProjectManager'
import { TaskQuickAdd } from './TaskQuickAdd'
import { mergeVisibleTaskOrder } from './taskOrdering'
import type { Task, TaskFilters } from './types'

type TaskView = keyof typeof tasksCopy.views

const primaryViews = [
  { label: 'Inbox', to: '/tasks', icon: Inbox, end: true },
  { label: 'Today', to: '/tasks/today', icon: Sun, end: false },
  { label: 'Upcoming', to: '/tasks/upcoming', icon: CalendarRange, end: false },
  { label: 'Completed', to: '/tasks/completed', icon: CheckCircle2, end: false },
] as const

const getView = (pathname: string): TaskView => {
  if (pathname === '/tasks/today') return 'today'
  if (pathname === '/tasks/upcoming') return 'upcoming'
  if (pathname === '/tasks/completed') return 'completed'
  if (pathname.startsWith('/tasks/project/')) return 'project'
  return 'inbox'
}

const getFilters = (view: TaskView, today: string, projectId?: string): TaskFilters => {
  switch (view) {
    case 'today': return { status: 'open', scheduledDate: today }
    case 'upcoming': return { status: 'open', scheduledAfter: today }
    case 'completed': return { status: 'completed' }
    case 'project': return projectId
      ? { status: 'open', projectId }
      : { status: 'open', projectId: null }
    case 'inbox': return { status: 'open', projectId: null }
  }
}

export default function TasksPage() {
  const { pathname } = useLocation()
  const { projectId } = useParams()
  const view = getView(pathname)
  const { timeZone } = useTaskDateContext()
  const today = localDateKey(new Date(), timeZone)
  const projectsQuery = useTaskProjects()
  const tasksQuery = useTaskList(getFilters(view, today, projectId))
  const allOpenTasksQuery = useTaskList({ status: 'open' })
  const statusMutation = useSetTaskStatus()
  const updateMutation = useUpdateTask()
  const reorderMutation = useReorderTasks()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const currentProject = projectsQuery.data?.find((project) => project.id === projectId)
  const copy = tasksCopy.views[view]
  const title = currentProject?.name ?? copy.title
  const defaultDate = view === 'today'
    ? today
    : view === 'upcoming'
      ? addLocalDays(today, 1)
      : ''

  const mutationError = statusMutation.error ?? updateMutation.error ?? reorderMutation.error
  const pendingTaskId = statusMutation.isPending
    ? statusMutation.variables?.task.id
    : updateMutation.isPending
      ? updateMutation.variables?.taskId
      : undefined
  const canReorder = view !== 'completed'
    && Boolean(allOpenTasksQuery.data)
    && (tasksQuery.data?.length ?? 0) > 1

  return (
    <section className="page-stack tasks-page">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={title}
        description={copy.description}
        actions={
          <span className="task-count" aria-live="polite">
            <ListChecks aria-hidden />
            {tasksQuery.data?.length ?? 0} {tasksQuery.data?.length === 1 ? 'task' : 'tasks'}
          </span>
        }
      />

      <div className="tasks-layout">
        <aside className="tasks-navigation" aria-label="Task lists">
          <nav>
            {primaryViews.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                className={({ isActive }) => `tasks-navigation__item${isActive ? ' tasks-navigation__item--active' : ''}`}
                to={to}
                end={end}
                key={to}
                onClick={() => setSelectedTask(null)}
              >
                <Icon aria-hidden /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="tasks-navigation__projects">
            <span className="tasks-navigation__label">Projects</span>
            {projectsQuery.isPending ? <span className="tasks-navigation__muted">Loading…</span> : null}
            {projectsQuery.error ? (
              <button type="button" onClick={() => void projectsQuery.refetch()}>Retry projects</button>
            ) : null}
            {projectsQuery.data?.map((project) => (
              <NavLink
                className={({ isActive }) => `tasks-navigation__item${isActive ? ' tasks-navigation__item--active' : ''}`}
                to={`/tasks/project/${project.id}`}
                key={project.id}
                onClick={() => setSelectedTask(null)}
              >
                <span className={`tasks-navigation__dot tasks-navigation__dot--${project.colorToken}`} />
                <span>{project.name}</span>
              </NavLink>
            ))}
            {projectsQuery.data?.length === 0 ? (
              <span className="tasks-navigation__muted"><Folder aria-hidden />No projects yet</span>
            ) : null}
            <TaskProjectManager key={currentProject?.id ?? 'project-create'} currentProject={currentProject} />
          </div>
        </aside>

        <section className={`tasks-workspace${selectedTask ? ' tasks-workspace--detail' : ''}`} aria-label={`${title} tasks`}>
          <div className="tasks-workspace__main">
            {view !== 'completed' ? (
              <TaskQuickAdd
                key={`${view}-${projectId ?? 'none'}`}
                defaultDate={defaultDate}
                defaultProjectId={view === 'project' ? projectId ?? '' : ''}
                projects={projectsQuery.data ?? []}
              />
            ) : null}
            <TaskListPanel
              tasks={tasksQuery.data}
              projects={projectsQuery.data ?? []}
              today={today}
              timeZone={timeZone}
              isLoading={tasksQuery.isPending}
              error={tasksQuery.error}
              mutationError={mutationError}
              emptyTitle={copy.emptyTitle}
              emptyBody={copy.emptyBody}
              pendingTaskId={pendingTaskId}
              onRetry={() => void tasksQuery.refetch()}
              onStatusChange={(task, status) => statusMutation.mutate({ task, status })}
              onMoveToToday={(task) => updateMutation.mutate({
                taskId: task.id,
                input: { scheduledDate: today },
              })}
              onOpenTask={setSelectedTask}
              onReorder={canReorder ? (visibleOrder) => {
                if (!allOpenTasksQuery.data) return
                reorderMutation.mutate({
                  orderedTasks: mergeVisibleTaskOrder(allOpenTasksQuery.data, visibleOrder),
                })
              } : undefined}
              isReordering={reorderMutation.isPending}
            />
          </div>
          {selectedTask ? (
            <TaskDetailPanel
              key={selectedTask.id}
              task={selectedTask}
              projects={projectsQuery.data ?? []}
              timeZone={timeZone}
              onClose={() => setSelectedTask(null)}
              onUpdated={setSelectedTask}
              onDeleted={() => setSelectedTask(null)}
            />
          ) : null}
        </section>
      </div>
    </section>
  )
}
