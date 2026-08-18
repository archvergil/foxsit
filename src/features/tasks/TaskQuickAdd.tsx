import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { localDateSchema } from './schemas'
import { useCreateTask } from './queries'
import type { TaskProject } from './types'

const quickTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').max(500),
  scheduledDate: z.union([z.literal(''), localDateSchema]),
  projectId: z.union([z.literal(''), z.string().uuid()]),
})

type QuickTaskValues = z.infer<typeof quickTaskSchema>

export function TaskQuickAdd({
  defaultDate = '',
  defaultProjectId = '',
  projects,
}: {
  defaultDate?: string | undefined
  defaultProjectId?: string | undefined
  projects: TaskProject[]
}) {
  const createTask = useCreateTask()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickTaskValues>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: { title: '', scheduledDate: defaultDate, projectId: defaultProjectId },
  })

  useEffect(() => {
    reset({ title: '', scheduledDate: defaultDate, projectId: defaultProjectId })
  }, [defaultDate, defaultProjectId, reset])

  const submit = handleSubmit(async (values) => {
    try {
      await createTask.mutateAsync({
        title: values.title,
        scheduledDate: values.scheduledDate || null,
        projectId: values.projectId || null,
      })
      reset({ title: '', scheduledDate: defaultDate, projectId: defaultProjectId })
    } catch {
      // The mutation error remains visible below the form.
    }
  })

  return (
    <form className="task-quick-add" onSubmit={(event) => void submit(event)}>
      <div className="task-quick-add__title">
        <Plus aria-hidden />
        <label className="visually-hidden" htmlFor="quick-task-title">Task title</label>
        <input
          id="quick-task-title"
          placeholder="Add a task and press Enter"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'quick-task-title-error' : undefined}
          autoComplete="off"
          {...register('title')}
        />
      </div>
      <label className="task-quick-add__field">
        <span>Date</span>
        <input type="date" aria-label="Scheduled date" {...register('scheduledDate')} />
      </label>
      <label className="task-quick-add__field">
        <span>Project</span>
        <select aria-label="Project" {...register('projectId')}>
          <option value="">Inbox</option>
          {projects.map((project) => (
            <option value={project.id} key={project.id}>{project.name}</option>
          ))}
        </select>
      </label>
      <Button type="submit" isLoading={createTask.isPending}>Add task</Button>
      {errors.title ? (
        <p className="task-quick-add__error" id="quick-task-title-error">{errors.title.message}</p>
      ) : null}
      {createTask.error ? (
        <p className="task-quick-add__error" role="alert">{createTask.error.message}</p>
      ) : null}
    </form>
  )
}
