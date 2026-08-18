import { zodResolver } from '@hookform/resolvers/zod'
import { FolderPlus, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import {
  useCreateTaskProject,
  useDeleteTaskProject,
  useUpdateTaskProject,
} from './queries'
import { taskColorTokenSchema } from './schemas'
import type { TaskProject } from './types'

const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.').max(120),
  colorToken: taskColorTokenSchema,
})
type ProjectForm = z.infer<typeof projectFormSchema>

export function TaskProjectManager({ currentProject }: { currentProject?: TaskProject | undefined }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const createProject = useCreateTaskProject()
  const updateProject = useUpdateTaskProject()
  const deleteProject = useDeleteTaskProject()
  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: '', colorToken: 'mint' },
  })

  const open = (nextMode: 'create' | 'edit') => {
    form.reset(nextMode === 'edit' && currentProject
      ? { name: currentProject.name, colorToken: currentProject.colorToken }
      : { name: '', colorToken: 'mint' })
    setMode(nextMode)
  }

  const close = () => {
    setMode('closed')
    form.clearErrors()
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      if (mode === 'edit' && currentProject) {
        await updateProject.mutateAsync({ projectId: currentProject.id, input: values })
      } else {
        const project = await createProject.mutateAsync(values)
        await navigate(`/tasks/project/${project.id}`)
      }
      close()
    } catch {
      // The mutation error remains visible and the form stays open.
    }
  })

  const remove = async () => {
    if (!currentProject || !window.confirm(`Delete “${currentProject.name}”? Its tasks will move to Inbox.`)) return
    try {
      await deleteProject.mutateAsync(currentProject.id)
      await navigate('/tasks')
    } catch {
      // The project remains selected and the durable-write error is shown.
    }
  }

  if (mode !== 'closed') {
    const pending = createProject.isPending || updateProject.isPending
    const error = createProject.error ?? updateProject.error
    return (
      <form className="project-editor" aria-label={mode === 'edit' ? 'Edit project' : 'Create project'} onSubmit={(event) => void submit(event)}>
        <header>
          <strong>{mode === 'edit' ? 'Edit project' : 'New project'}</strong>
          <button type="button" aria-label="Close project form" onClick={close}><X aria-hidden /></button>
        </header>
        <label>
          <span>Name</span>
          <input autoFocus {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} />
        </label>
        <label>
          <span>Color</span>
          <select {...form.register('colorToken')}>
            <option value="mint">Mint</option>
            <option value="coral">Coral</option>
            <option value="blue">Blue</option>
            <option value="sand">Sand</option>
            <option value="slate">Slate</option>
          </select>
        </label>
        {form.formState.errors.name ? <small role="alert">{form.formState.errors.name.message}</small> : null}
        {error ? <small role="alert">{error.message}</small> : null}
        <Button type="submit" isLoading={pending}>Save project</Button>
      </form>
    )
  }

  return (
    <div className="project-manager">
      <button type="button" onClick={() => open('create')}><FolderPlus aria-hidden />New project</button>
      {currentProject ? (
        <span>
          <button type="button" aria-label={`Edit ${currentProject.name}`} onClick={() => open('edit')}><Pencil aria-hidden /></button>
          <button type="button" aria-label={`Delete ${currentProject.name}`} onClick={() => void remove()} disabled={deleteProject.isPending}><Trash2 aria-hidden /></button>
        </span>
      ) : null}
      {deleteProject.error ? <small role="alert">{deleteProject.error.message}</small> : null}
    </div>
  )
}
