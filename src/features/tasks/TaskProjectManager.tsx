import { zodResolver } from '@hookform/resolvers/zod'
import { FolderPlus, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { BannerPicker } from '@/components/visual/BannerPicker'
import { collectionBannerAssets } from '@/lib/bannerAssets'
import {
  useCreateTaskProject,
  useDeleteTaskProject,
  useUpdateTaskProject,
} from './queries'
import { taskBannerAssetSchema, taskColorTokenSchema } from './schemas'
import { flattenTaskProjects, taskProjectWithDescendants } from './taskProjectTree'
import type { TaskProject } from './types'

const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.').max(120),
  colorToken: taskColorTokenSchema,
  parentProjectId: z.string().uuid().or(z.literal('')),
  bannerAsset: z.union([taskBannerAssetSchema, z.literal('')]),
  bannerMonochrome: z.boolean(),
})
type ProjectForm = z.infer<typeof projectFormSchema>

export function TaskProjectManager({ currentProject, projects }: { currentProject?: TaskProject | undefined; projects: TaskProject[] }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const createProject = useCreateTaskProject()
  const updateProject = useUpdateTaskProject()
  const deleteProject = useDeleteTaskProject()
  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: '', colorToken: 'mint', parentProjectId: '', bannerAsset: '', bannerMonochrome: false },
  })
  const bannerAsset = useWatch({ control: form.control, name: 'bannerAsset' }) ?? ''
  const bannerMonochrome = useWatch({ control: form.control, name: 'bannerMonochrome' }) ?? false

  const open = (nextMode: 'create' | 'edit') => {
    form.reset(nextMode === 'edit' && currentProject
      ? { name: currentProject.name, colorToken: currentProject.colorToken, parentProjectId: currentProject.parentProjectId ?? '', bannerAsset: currentProject.bannerAsset ?? '', bannerMonochrome: currentProject.bannerMonochrome ?? false }
      : { name: '', colorToken: 'mint', parentProjectId: currentProject?.id ?? '', bannerAsset: '', bannerMonochrome: false })
    setMode(nextMode)
  }

  const close = () => {
    setMode('closed')
    form.clearErrors()
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      const input = { ...values, parentProjectId: values.parentProjectId || null, bannerAsset: values.bannerAsset || null }
      if (mode === 'edit' && currentProject) {
        await updateProject.mutateAsync({ projectId: currentProject.id, input })
      } else {
        const project = await createProject.mutateAsync(input)
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
    const excludedParentIds = currentProject ? new Set(taskProjectWithDescendants(projects, currentProject.id)) : new Set<string>()
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
          <span>Inside</span>
          <select {...form.register('parentProjectId')}>
            <option value="">Top level</option>
            {flattenTaskProjects(projects).filter(({ project }) => !excludedParentIds.has(project.id)).map(({ project, depth }) => <option value={project.id} key={project.id}>{`${'— '.repeat(depth)}${project.name}`}</option>)}
          </select>
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
        <BannerPicker assets={collectionBannerAssets} value={bannerAsset || null} monochrome={bannerMonochrome} onChange={(value) => form.setValue('bannerAsset', value ?? '', { shouldDirty: true })} onMonochromeChange={(value) => form.setValue('bannerMonochrome', value, { shouldDirty: true })} />
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
