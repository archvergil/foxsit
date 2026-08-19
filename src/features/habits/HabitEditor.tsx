import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, Check, Trash2, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useClearHabitHistory, useCreateHabit, useDeleteHabit, useUpdateHabit } from './queries'
import { habitFormSchema, habitToInput, resolveHabitForm, type HabitFormValues } from './schemas'
import { HabitGlyph } from './HabitGlyph'
import { colorOptionForHabit, habitAccentStyle, habitColorOptions, habitIconOptions } from './habitVisuals'
import type { Habit, HabitProject } from './types'

const weekdays = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

const formDefaults = (habit?: Habit): HabitFormValues => ({
  title: habit?.title ?? '',
  description: habit?.description ?? '',
  icon: habit?.icon ?? 'circle-check-big',
  colorToken: habit?.colorToken ?? 'mint',
  customColor: habit?.customColor ?? '',
  projectId: habit?.projectId ?? '',
  scheduleType: habit?.scheduleType ?? 'daily',
  weekdays: habit?.weekdays ?? [],
  targetCount: habit?.targetCount ?? 1,
  unit: habit?.unit ?? '',
})

export function HabitEditor({ habit, projects, newPosition = 1000, onClose, onSaved }: {
  habit?: Habit | undefined
  projects: HabitProject[]
  newPosition?: number | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const deleteHabit = useDeleteHabit()
  const clearHistory = useClearHabitHistory()
  const form = useForm<HabitFormValues>({ resolver: zodResolver(habitFormSchema), defaultValues: formDefaults(habit) })
  const scheduleType = useWatch({ control: form.control, name: 'scheduleType' })
  const selectedIcon = useWatch({ control: form.control, name: 'icon' }) ?? 'circle-check-big'
  const selectedColor = useWatch({ control: form.control, name: 'colorToken' }) ?? 'mint'
  const customColor = useWatch({ control: form.control, name: 'customColor' }) ?? ''
  const title = useWatch({ control: form.control, name: 'title' }) ?? ''
  const previewHabit = { customColor: customColor || null }
  const pending = createHabit.isPending || updateHabit.isPending || deleteHabit.isPending || clearHistory.isPending
  const writeError = createHabit.error ?? updateHabit.error ?? deleteHabit.error ?? clearHistory.error

  const submit = form.handleSubmit(async (values) => {
    try {
      const input = resolveHabitForm(values, habit?.position ?? newPosition)
      if (habit) await updateHabit.mutateAsync({ habitId: habit.id, input: { ...input, isActive: habit.isActive } })
      else await createHabit.mutateAsync(input)
      onSaved()
    } catch {
      // Keep the editor and values available for retry.
    }
  })

  const archive = async () => {
    if (!habit) return
    try {
      await updateHabit.mutateAsync({ habitId: habit.id, input: habitToInput(habit, false) })
      onSaved()
    } catch {
      // The durable-write error remains visible.
    }
  }

  const remove = async () => {
    if (!habit) return
    await deleteHabit.mutateAsync(habit.id)
    onSaved()
  }

  const clear = async () => {
    if (!habit) return
    await clearHistory.mutateAsync(habit.id)
  }

  return (
    <aside className="habit-editor" aria-label={habit ? `Edit habit ${habit.title}` : 'Create habit'}>
      <header>
        <span><span className="eyebrow">{habit ? 'Habit details' : 'New habit'}</span><h2>{habit ? 'Edit habit' : 'Build a rhythm'}</h2></span>
        <button type="button" aria-label="Close habit editor" onClick={onClose}><X aria-hidden /></button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <div className="habit-editor__preview habit-editor__wide" style={habitAccentStyle(previewHabit)}>
          <span><HabitGlyph icon={selectedIcon} /></span>
          <p><strong>{title || 'Your new habit'}</strong><small>{customColor ? customColor.toUpperCase() : colorOptionForHabit(selectedColor).label}</small></p>
        </div>
        <label className="habit-editor__wide"><span>Title</span><input autoFocus {...form.register('title')} aria-invalid={Boolean(form.formState.errors.title)} />{form.formState.errors.title ? <small role="alert">{form.formState.errors.title.message}</small> : null}</label>
        <label className="habit-editor__wide"><span>Project</span><select {...form.register('projectId')}><option value="">Unfiled</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
        <fieldset className="habit-editor__icon-picker habit-editor__wide">
          <legend>Icon</legend>
          <div>{habitIconOptions.map(({ value, label }) => <button className={selectedIcon === value ? 'is-selected' : ''} key={value} type="button" aria-label={label} aria-pressed={selectedIcon === value} onClick={() => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })}><HabitGlyph icon={value} /><small>{label}</small></button>)}</div>
        </fieldset>
        <fieldset className="habit-editor__color-picker habit-editor__wide">
          <legend>Color</legend>
          <div className="habit-editor__color-options">
            {habitColorOptions.map(({ value, label }) => <button className={!customColor && selectedColor === value ? 'is-selected' : ''} key={value} type="button" aria-label={label} aria-pressed={!customColor && selectedColor === value} onClick={() => { form.setValue('colorToken', value, { shouldDirty: true }); form.setValue('customColor', '', { shouldDirty: true, shouldValidate: true }) }}><i className={`habit-editor__swatch habit-editor__swatch--${value}`} aria-hidden /> <span>{label}</span>{!customColor && selectedColor === value ? <Check aria-hidden /> : null}</button>)}
          </div>
          <div className="habit-editor__custom-color">
            <label><span>Custom</span><input type="color" aria-label="Choose a custom habit color" value={customColor || colorOptionForHabit(selectedColor).valueHex} onChange={(event) => form.setValue('customColor', event.target.value, { shouldDirty: true, shouldValidate: true })} /></label>
            <input aria-label="Custom habit color hex code" value={customColor} placeholder="#8EB9A7" onChange={(event) => form.setValue('customColor', event.target.value, { shouldDirty: true, shouldValidate: true })} />
            {customColor ? <button type="button" onClick={() => form.setValue('customColor', '', { shouldDirty: true, shouldValidate: true })}>Use palette</button> : null}
          </div>
          {form.formState.errors.customColor ? <small role="alert">{form.formState.errors.customColor.message}</small> : null}
        </fieldset>
        <label className="habit-editor__wide"><span>Schedule</span><select {...form.register('scheduleType')}><option value="daily">Every day</option><option value="weekdays">Specific days</option></select></label>
        {scheduleType === 'weekdays' ? (
          <fieldset className="habit-editor__weekdays habit-editor__wide">
            <legend>Days</legend>
            <div>{weekdays.map((day) => <label key={day.value}><input type="checkbox" value={day.value} {...form.register('weekdays')} /><span>{day.label}</span></label>)}</div>
            {form.formState.errors.weekdays ? <small role="alert">{form.formState.errors.weekdays.message}</small> : null}
          </fieldset>
        ) : null}
        <label><span>Daily target</span><input type="number" min="1" max="10000" {...form.register('targetCount')} /></label>
        <label><span>Unit</span><input placeholder="times, pages…" {...form.register('unit')} /></label>
        <label className="habit-editor__wide"><span>Description</span><textarea rows={3} placeholder="Optional context" {...form.register('description')} /></label>
        <Button className="habit-editor__wide" type="submit" isLoading={createHabit.isPending || updateHabit.isPending}>{habit ? 'Save habit' : 'Create habit'}</Button>
      </form>
      {writeError ? <p className="habit-editor__error" role="alert">{writeError.message}</p> : null}
      {habit ? <div className="habit-editor__danger-actions"><Button variant="quiet" type="button" disabled={pending} onClick={() => void archive()}><Archive aria-hidden />Archive</Button><ConfirmDialog actionLabel="Delete habit" description="Delete the habit and all its records, or clear only its completion history and keep the habit." onConfirm={remove} pending={deleteHabit.isPending} secondaryAction={{ label: 'Clear history only', onAction: clear, pending: clearHistory.isPending }} title={`Delete “${habit.title}”?`} trigger={<Button variant="quiet" type="button" disabled={pending}><Trash2 aria-hidden />Delete</Button>} /></div> : null}
    </aside>
  )
}
