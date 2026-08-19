import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BannerPicker } from '@/components/visual/BannerPicker'
import { collectionBannerAssets } from '@/lib/bannerAssets'
import { HabitProjectGlyph } from './HabitProjectGlyph'
import { habitProjectIconOptions } from './habitProjectIcons'
import { useCreateHabitProject, useDeleteHabitProject, useUpdateHabitProject } from './queries'
import { habitProjectFormSchema, resolveHabitProjectForm, type HabitProjectFormValues } from './schemas'
import type { HabitProject } from './types'

export function HabitProjectEditor({ project, projects, onClose }: {
  project?: HabitProject | undefined
  projects: HabitProject[]
  onClose: () => void
}) {
  const createProject = useCreateHabitProject()
  const updateProject = useUpdateHabitProject()
  const deleteProject = useDeleteHabitProject()
  const [iconDialogOpen, setIconDialogOpen] = useState(false)
  const form = useForm<HabitProjectFormValues>({
    resolver: zodResolver(habitProjectFormSchema),
    defaultValues: {
      name: project?.name ?? '', icon: project?.icon ?? 'folder', colorToken: project?.colorToken ?? 'mint',
      customColor: project?.customColor ?? '', bannerAsset: project?.bannerAsset ?? '', bannerMonochrome: project?.bannerMonochrome ?? false,
    },
  })
  const selectedIcon = useWatch({ control: form.control, name: 'icon' }) ?? 'folder'
  const bannerAsset = useWatch({ control: form.control, name: 'bannerAsset' }) ?? ''
  const bannerMonochrome = useWatch({ control: form.control, name: 'bannerMonochrome' }) ?? false
  const pending = createProject.isPending || updateProject.isPending || deleteProject.isPending
  const error = createProject.error ?? updateProject.error ?? deleteProject.error
  const submit = form.handleSubmit(async (values) => {
    try {
      const position = project?.position ?? Math.max(0, ...projects.map((item) => item.position)) + 1000
      const input = resolveHabitProjectForm(values, position)
      if (project) await updateProject.mutateAsync({ projectId: project.id, input })
      else await createProject.mutateAsync(input)
      onClose()
    } catch { /* Keep the durable error and form available for retry. */ }
  })
  const remove = async () => {
    if (!project) return
    try { await deleteProject.mutateAsync(project.id); onClose() } catch { /* Error stays visible. */ }
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (iconDialogOpen) setIconDialogOpen(false)
      else onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [iconDialogOpen, onClose])

  const chooseIcon = (icon: string) => {
    form.setValue('icon', icon, { shouldDirty: true })
    setIconDialogOpen(false)
  }

  return (
    <div className="habit-project-editor__backdrop">
    <aside className="habit-project-editor" aria-modal="true" role="dialog" aria-label={project ? `Edit habit project ${project.name}` : 'Create habit project'}>
      <header><span><span className="eyebrow">Habit project</span><h2>{project ? 'Edit collection' : 'New collection'}</h2></span><button type="button" aria-label="Close habit project editor" onClick={onClose}><X aria-hidden /></button></header>
      <form onSubmit={(event) => void submit(event)}>
        <label><span>Name</span><input autoFocus {...form.register('name')} />{form.formState.errors.name ? <small role="alert">{form.formState.errors.name.message}</small> : null}</label>
        <fieldset className="habit-project-editor__icons"><legend>Icon</legend><div>{habitProjectIconOptions.slice(0, 5).map(({ value, label }) => <button type="button" className={selectedIcon === value ? 'is-selected' : ''} aria-label={label} aria-pressed={selectedIcon === value} key={value} onClick={() => chooseIcon(value)}><HabitProjectGlyph icon={value} /><small>{label}</small></button>)}<button type="button" aria-label="More project icons" onClick={() => setIconDialogOpen(true)}><MoreHorizontal aria-hidden /><small>More</small></button></div></fieldset>
        <label><span>Accent</span><select {...form.register('colorToken')}><option value="mint">Mint</option><option value="coral">Coral</option><option value="blue">Blue</option><option value="sand">Sand</option><option value="slate">Slate</option></select></label>
        <BannerPicker assets={collectionBannerAssets} value={bannerAsset || null} monochrome={bannerMonochrome} onChange={(value) => form.setValue('bannerAsset', value ?? '', { shouldDirty: true })} onMonochromeChange={(value) => form.setValue('bannerMonochrome', value, { shouldDirty: true })} />
        <Button type="submit" isLoading={createProject.isPending || updateProject.isPending}>{project ? 'Save project' : 'Create project'}</Button>
      </form>
      {error ? <p className="habit-editor__error" role="alert">{error.message}</p> : null}
      {project ? (
        <ConfirmDialog
          actionLabel="Delete project"
          description="The project will be permanently removed. Its habits will be kept and become unfiled."
          onConfirm={remove}
          pending={deleteProject.isPending}
          title={`Delete “${project.name}”?`}
          trigger={<Button variant="quiet" type="button" disabled={pending}><Trash2 aria-hidden />Delete project</Button>}
        />
      ) : null}
    </aside>
    {iconDialogOpen ? <div className="habit-project-icon-dialog__backdrop"><section className="habit-project-icon-dialog" aria-label="More project icons" aria-modal="true" role="dialog"><header><span><span className="eyebrow">Project icon</span><h3>Choose an icon</h3></span><button type="button" aria-label="Close icon picker" onClick={() => setIconDialogOpen(false)}><X aria-hidden /></button></header><div>{habitProjectIconOptions.map(({ value, label }) => <button type="button" className={selectedIcon === value ? 'is-selected' : ''} aria-label={label} aria-pressed={selectedIcon === value} key={value} onClick={() => chooseIcon(value)}><HabitProjectGlyph icon={value} /><small>{label}</small></button>)}</div></section></div> : null}
    </div>
  )
}
