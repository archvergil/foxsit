import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Circle, Plus, TimerReset, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { focusedMinutesForTask } from '@/features/focus/focusSummary'
import { useFocusSessions } from '@/features/focus/queries'
import { formatTimestampForInput, localDateTimeToTimestamp } from '@/lib/dates'
import {
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useDeleteTask,
  useSetTaskStatus,
  useTaskChecklist,
  useUpdateChecklistItem,
  useUpdateTask,
} from './queries'
import { isValidLocalDate, taskPrioritySchema } from './schemas'
import type { Task, TaskProject } from './types'

const taskDetailSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').max(500),
  notes: z.string().max(10_000),
  projectId: z.string(),
  priority: taskPrioritySchema,
  scheduledDate: z.string().refine((value) => value === '' || isValidLocalDate(value), 'Enter a valid date.'),
  dueAt: z.string().refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
    'Enter a valid deadline.',
  ),
  estimateMinutes: z.string().refine((value) => {
    if (value === '') return true
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1440
  }, 'Use 1–1440 minutes.'),
})
type TaskDetailForm = z.infer<typeof taskDetailSchema>

const checklistSchema = z.object({ title: z.string().trim().min(1).max(500) })
type ChecklistForm = z.infer<typeof checklistSchema>

export function TaskDetailPanel({
  task,
  projects,
  timeZone,
  onClose,
  onUpdated,
  onDeleted,
}: {
  task: Task
  projects: TaskProject[]
  timeZone: string
  onClose: () => void
  onUpdated: (task: Task) => void
  onDeleted: () => void
}) {
  const panelRef = useRef<HTMLElement>(null)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const statusMutation = useSetTaskStatus()
  const focusQuery = useFocusSessions({ taskId: task.id, limit: 200 })
  const checklistQuery = useTaskChecklist(task.id)
  const createChecklist = useCreateChecklistItem()
  const updateChecklist = useUpdateChecklistItem()
  const deleteChecklist = useDeleteChecklistItem()
  const form = useForm<TaskDetailForm>({
    resolver: zodResolver(taskDetailSchema),
    defaultValues: {
      title: task.title,
      notes: task.notes ?? '',
      projectId: task.projectId ?? '',
      priority: task.priority,
      scheduledDate: task.scheduledDate ?? '',
      dueAt: formatTimestampForInput(task.dueAt, timeZone),
      estimateMinutes: task.estimateMinutes ? String(task.estimateMinutes) : '',
    },
  })
  const checklistForm = useForm<ChecklistForm>({
    resolver: zodResolver(checklistSchema),
    defaultValues: { title: '' },
  })

  const save = form.handleSubmit(async (values) => {
    const dueAt = values.dueAt ? localDateTimeToTimestamp(values.dueAt, timeZone) : null
    if (values.dueAt && !dueAt) {
      form.setError('dueAt', { message: 'This time does not exist in your profile timezone.' })
      return
    }
    try {
      const updated = await updateTask.mutateAsync({
        taskId: task.id,
        input: {
          title: values.title,
          notes: values.notes.trim() || null,
          projectId: values.projectId || null,
          priority: values.priority,
          scheduledDate: values.scheduledDate || null,
          dueAt,
          estimateMinutes: values.estimateMinutes ? Number(values.estimateMinutes) : null,
        },
      })
      onUpdated(updated)
      form.reset(values)
    } catch {
      // Keep edits in the form and expose the durable-write error.
    }
  })

  const addChecklist = checklistForm.handleSubmit(async ({ title }) => {
    try {
      await createChecklist.mutateAsync({ taskId: task.id, title })
      checklistForm.reset()
    } catch {
      // Keep the input for retry.
    }
  })

  const changeStatus = async () => {
    try {
      const updated = await statusMutation.mutateAsync({
        task,
        status: task.status === 'completed' ? 'open' : 'completed',
      })
      onUpdated(updated)
    } catch {
      // Optimistic rollback and error handling live in the mutation hook.
    }
  }

  const removeTask = async () => {
    try {
      await deleteTask.mutateAsync(task.id)
      onDeleted()
    } catch {
      // Keep the panel open and show the write error.
    }
  }

  const error = updateTask.error ?? deleteTask.error ?? statusMutation.error
    ?? createChecklist.error ?? updateChecklist.error ?? deleteChecklist.error
  const focusedMinutes = focusedMinutesForTask(focusQuery.data ?? [])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return (
    <aside ref={panelRef} className="task-detail-panel" aria-label={`Details for ${task.title}`} tabIndex={-1}>
      <header className="task-detail-panel__header">
        <span>
          <span className="eyebrow">Task details</span>
          <strong>{task.status === 'completed' ? 'Completed' : 'Open'}</strong>
          <small>{focusQuery.isPending ? 'Loading focus…' : `${focusedMinutes} focused min`}</small>
        </span>
        <button type="button" onClick={onClose} aria-label="Close task details"><X aria-hidden /></button>
      </header>

      <form className="task-detail-form" onSubmit={(event) => void save(event)}>
        <label className="task-detail-form__wide">
          <span>Title</span>
          <input {...form.register('title')} aria-invalid={Boolean(form.formState.errors.title)} />
          {form.formState.errors.title ? <small role="alert">{form.formState.errors.title.message}</small> : null}
        </label>
        <label className="task-detail-form__wide">
          <span>Notes</span>
          <textarea rows={4} placeholder="Optional context" {...form.register('notes')} />
        </label>
        <label>
          <span>Project</span>
          <select {...form.register('projectId')}>
            <option value="">Inbox</option>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select {...form.register('priority')}>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>Scheduled</span>
          <input type="date" {...form.register('scheduledDate')} />
        </label>
        <label>
          <span>Focus estimate</span>
          <input type="number" min="1" max="1440" placeholder="Minutes" {...form.register('estimateMinutes')} />
          {form.formState.errors.estimateMinutes ? <small role="alert">{form.formState.errors.estimateMinutes.message}</small> : null}
        </label>
        <label className="task-detail-form__wide">
          <span>Deadline · {timeZone}</span>
          <input type="datetime-local" {...form.register('dueAt')} />
          {form.formState.errors.dueAt ? <small role="alert">{form.formState.errors.dueAt.message}</small> : null}
        </label>
        <Button className="task-detail-form__wide" type="submit" isLoading={updateTask.isPending}>Save changes</Button>
      </form>

      <section className="task-checklist" aria-labelledby="task-checklist-title">
        <header><strong id="task-checklist-title">Checklist</strong><small>{checklistQuery.data?.filter(({ completed }) => completed).length ?? 0}/{checklistQuery.data?.length ?? 0}</small></header>
        <form onSubmit={(event) => void addChecklist(event)}>
          <input aria-label="New checklist item" placeholder="Add a step" {...checklistForm.register('title')} />
          <button type="submit" aria-label="Add checklist item" disabled={createChecklist.isPending}><Plus aria-hidden /><span>Add step</span></button>
        </form>
        {checklistForm.formState.errors.title ? <small role="alert">Enter a checklist item.</small> : null}
        {checklistQuery.isPending ? <p role="status">Loading checklist…</p> : null}
        {checklistQuery.error ? <p role="alert">Checklist could not be loaded.</p> : null}
        <div className="task-checklist__items">
          {checklistQuery.data?.map((item) => (
            <span key={item.id}>
              <button
                type="button"
                aria-label={`${item.completed ? 'Reopen' : 'Complete'} ${item.title}`}
                aria-pressed={item.completed}
                onClick={() => updateChecklist.mutate({ taskId: task.id, itemId: item.id, input: { completed: !item.completed } })}
              >
                {item.completed ? <Check aria-hidden /> : <Circle aria-hidden />}
              </button>
              <span className={item.completed ? 'task-checklist__completed' : ''}>{item.title}</span>
              <ConfirmDialog
                actionLabel="Delete step"
                description="This checklist step will be permanently removed from the task."
                onConfirm={() => deleteChecklist.mutate({ taskId: task.id, itemId: item.id })}
                pending={deleteChecklist.isPending}
                title={`Delete “${item.title}”?`}
                trigger={<button type="button" aria-label={`Delete ${item.title}`}><Trash2 aria-hidden /></button>}
              />
            </span>
          ))}
        </div>
      </section>

      {error ? <p className="task-detail-panel__error" role="alert">{error.message}</p> : null}
      <footer className="task-detail-panel__actions">
        <Link className="button button--secondary" to={`/focus?taskId=${task.id}`}><TimerReset aria-hidden /><span>Start focus</span></Link>
        <Button variant="quiet" type="button" onClick={() => void changeStatus()}>{task.status === 'completed' ? 'Reopen task' : 'Complete task'}</Button>
        <ConfirmDialog
          actionLabel="Delete task"
          description="This task and its checklist will be permanently removed. This action cannot be undone."
          onConfirm={removeTask}
          pending={deleteTask.isPending}
          title={`Delete “${task.title}”?`}
          trigger={<Button variant="quiet" type="button" disabled={deleteTask.isPending}><Trash2 aria-hidden />Delete</Button>}
        />
      </footer>
    </aside>
  )
}
