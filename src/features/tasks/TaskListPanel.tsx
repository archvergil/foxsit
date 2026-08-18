import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, CalendarPlus, Check, Clock3, Folder, GripVertical, RotateCcw, TimerReset } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { formatLocalDateLabel, formatTaskTimestamp } from '@/lib/dates'
import { moveTaskInList } from './taskOrdering'
import type { Task, TaskProject, TaskStatus } from './types'

interface TaskListPanelProps {
  tasks: Task[] | undefined
  projects: TaskProject[]
  today: string
  timeZone: string
  isLoading: boolean
  error: Error | null
  mutationError?: Error | null | undefined
  emptyTitle: string
  emptyBody: string
  pendingTaskId?: string | undefined
  compact?: boolean | undefined
  onRetry: () => void
  onStatusChange: (task: Task, status: TaskStatus) => void
  onMoveToToday?: ((task: Task) => void) | undefined
  onOpenTask?: ((task: Task) => void) | undefined
  onReorder?: ((tasks: Task[]) => void) | undefined
  isReordering?: boolean | undefined
}

const TaskMetadata = ({
  task,
  project,
  today,
  timeZone,
}: {
  task: Task
  project?: TaskProject | undefined
  today: string
  timeZone: string
}) => {
  const items = [
    project ? { key: 'project', icon: Folder, label: project.name } : null,
    task.scheduledDate
      ? { key: 'scheduled', icon: CalendarPlus, label: task.scheduledDate === today ? 'Today' : formatLocalDateLabel(task.scheduledDate) }
      : null,
    task.dueAt ? { key: 'due', icon: Clock3, label: formatTaskTimestamp(task.dueAt, timeZone) } : null,
  ].filter((item) => item !== null)

  if (items.length === 0 && task.priority === 'none') return null

  return (
    <span className="task-row__metadata">
      {items.map(({ key, icon: Icon, label }) => (
        <span key={key}><Icon aria-hidden />{label}</span>
      ))}
      {task.priority !== 'none' ? (
        <span className={`task-priority task-priority--${task.priority}`}>
          <span aria-hidden />{task.priority} priority
        </span>
      ) : null}
    </span>
  )
}

interface TaskRowProps {
  task: Task
  project?: TaskProject | undefined
  today: string
  timeZone: string
  pending: boolean
  index: number
  taskCount: number
  compact: boolean
  isReordering: boolean
  onStatusChange: (task: Task, status: TaskStatus) => void
  onMoveToToday?: ((task: Task) => void) | undefined
  onOpenTask?: ((task: Task) => void) | undefined
  onMove?: ((task: Task, direction: 'up' | 'down') => void) | undefined
}

const TaskRow = ({
  task,
  project,
  today,
  timeZone,
  pending,
  index,
  taskCount,
  compact,
  isReordering,
  onStatusChange,
  onMoveToToday,
  onOpenTask,
  onMove,
}: TaskRowProps) => {
  const completed = task.status === 'completed'
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id, disabled: !onMove || isReordering })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-row${completed ? ' task-row--completed' : ''}${isDragging ? ' task-row--dragging' : ''}`}
    >
      <button
        className="task-row__check"
        type="button"
        aria-label={`${completed ? 'Reopen' : 'Complete'} ${task.title}`}
        aria-pressed={completed}
        disabled={pending || isReordering}
        onClick={() => onStatusChange(task, completed ? 'open' : 'completed')}
      >
        {completed ? <Check aria-hidden /> : null}
      </button>
      {onOpenTask ? (
        <button
          className="task-row__content"
          type="button"
          aria-label={`Open details for ${task.title}`}
          onClick={() => onOpenTask(task)}
        >
          <strong>{task.title}</strong>
          <TaskMetadata task={task} project={project} today={today} timeZone={timeZone} />
        </button>
      ) : (
        <span className="task-row__content">
          <strong>{task.title}</strong>
          <TaskMetadata task={task} project={project} today={today} timeZone={timeZone} />
        </span>
      )}
      {!compact && !completed ? (
        <span className="task-row__actions">
          {onMove ? (
            <span className="task-row__reorder-actions">
              <button
                ref={setActivatorNodeRef}
                className="task-row__action task-row__action--icon task-row__drag-handle"
                type="button"
                aria-label={`Drag to reorder ${task.title}`}
                disabled={isReordering}
                {...attributes}
                {...listeners}
              >
                <GripVertical aria-hidden />
              </button>
              <button
                className="task-row__action task-row__action--icon"
                type="button"
                aria-label={`Move ${task.title} up`}
                disabled={index === 0 || isReordering}
                onClick={() => onMove(task, 'up')}
              >
                <ArrowUp aria-hidden />
              </button>
              <button
                className="task-row__action task-row__action--icon"
                type="button"
                aria-label={`Move ${task.title} down`}
                disabled={index === taskCount - 1 || isReordering}
                onClick={() => onMove(task, 'down')}
              >
                <ArrowDown aria-hidden />
              </button>
            </span>
          ) : null}
          <Link
            className="task-row__action"
            to={`/focus?taskId=${task.id}`}
            aria-label={`Start focus for ${task.title}`}
          >
            <TimerReset aria-hidden /><span>Focus</span>
          </Link>
          {task.scheduledDate !== today && onMoveToToday ? (
            <button
              className="task-row__action"
              type="button"
              disabled={pending || isReordering}
              onClick={() => onMoveToToday(task)}
              aria-label={`Add ${task.title} to Today`}
            >
              <CalendarPlus aria-hidden /><span>Add to Today</span>
            </button>
          ) : null}
        </span>
      ) : null}
      {!compact && completed ? (
        <span className="task-row__completed-label"><RotateCcw aria-hidden />Can be reopened</span>
      ) : null}
    </article>
  )
}

export function TaskListPanel({
  tasks,
  projects,
  today,
  timeZone,
  isLoading,
  error,
  mutationError,
  emptyTitle,
  emptyBody,
  pendingTaskId,
  compact = false,
  onRetry,
  onStatusChange,
  onMoveToToday,
  onOpenTask,
  onReorder,
  isReordering = false,
}: TaskListPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (isLoading) {
    return (
      <div className="task-list-state" role="status" aria-label="Loading tasks">
        <span className="task-list-skeleton" />
        <span className="task-list-skeleton" />
        <span className="task-list-skeleton" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="task-list-state task-list-state--error" role="alert">
        <strong>Tasks could not be loaded.</strong>
        <p>Your data was not changed. Check the connection and try again.</p>
        <Button variant="secondary" type="button" onClick={onRetry}>Try again</Button>
      </div>
    )
  }

  if (!tasks?.length) {
    return (
      <div className="task-list-state task-list-state--empty">
        <span className="task-list-state__mark"><Check aria-hidden /></span>
        <strong>{emptyTitle}</strong>
        <p>{emptyBody}</p>
        {mutationError ? <p className="task-list-state__mutation-error" role="alert">{mutationError.message}</p> : null}
      </div>
    )
  }

  const visibleTasks = compact ? tasks.slice(0, 4) : tasks
  const projectMap = new Map(projects.map((project) => [project.id, project]))
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!onReorder || !over || active.id === over.id) return
    const from = visibleTasks.findIndex(({ id }) => id === active.id)
    const to = visibleTasks.findIndex(({ id }) => id === over.id)
    if (from >= 0 && to >= 0) onReorder(arrayMove(visibleTasks, from, to))
  }

  const moveTask = (task: Task, direction: 'up' | 'down') => {
    if (!onReorder) return
    const orderedTasks = moveTaskInList(visibleTasks, task.id, direction)
    if (orderedTasks !== visibleTasks) onReorder(orderedTasks)
  }

  return (
    <div className={`task-list${compact ? ' task-list--compact' : ''}`}>
      {mutationError ? (
        <p className="task-list-state__mutation-error" role="alert">{mutationError.message}</p>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleTasks.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              project={task.projectId ? projectMap.get(task.projectId) : undefined}
              today={today}
              timeZone={timeZone}
              pending={pendingTaskId === task.id}
              index={index}
              taskCount={visibleTasks.length}
              compact={compact}
              isReordering={isReordering}
              onStatusChange={onStatusChange}
              onMoveToToday={onMoveToToday}
              onOpenTask={onOpenTask}
              onMove={onReorder ? moveTask : undefined}
            />
          ))}
        </SortableContext>
      </DndContext>
      {compact && tasks.length > visibleTasks.length ? (
        <p className="task-list__overflow">+{tasks.length - visibleTasks.length} more in Today</p>
      ) : null}
    </div>
  )
}
