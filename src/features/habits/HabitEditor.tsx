import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, Trash2, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { useCreateHabit, useDeleteHabit, useUpdateHabit } from './queries'
import { habitFormSchema, habitToInput, resolveHabitForm, type HabitFormValues } from './schemas'
import type { Habit } from './types'

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
  scheduleType: habit?.scheduleType ?? 'daily',
  weekdays: habit?.weekdays ?? [],
  targetCount: habit?.targetCount ?? 1,
  unit: habit?.unit ?? '',
})

export function HabitEditor({ habit, newPosition = 1000, onClose, onSaved }: {
  habit?: Habit | undefined
  newPosition?: number | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const deleteHabit = useDeleteHabit()
  const form = useForm<HabitFormValues>({ resolver: zodResolver(habitFormSchema), defaultValues: formDefaults(habit) })
  const scheduleType = useWatch({ control: form.control, name: 'scheduleType' })
  const pending = createHabit.isPending || updateHabit.isPending || deleteHabit.isPending
  const writeError = createHabit.error ?? updateHabit.error ?? deleteHabit.error

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
    if (!habit || !window.confirm(`Delete “${habit.title}” and its history? This cannot be undone.`)) return
    try {
      await deleteHabit.mutateAsync(habit.id)
      onSaved()
    } catch {
      // The durable-write error remains visible.
    }
  }

  return (
    <aside className="habit-editor" aria-label={habit ? `Edit habit ${habit.title}` : 'Create habit'}>
      <header>
        <span><span className="eyebrow">{habit ? 'Habit details' : 'New habit'}</span><h2>{habit ? 'Edit habit' : 'Build a rhythm'}</h2></span>
        <button type="button" aria-label="Close habit editor" onClick={onClose}><X aria-hidden /></button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <label className="habit-editor__wide"><span>Title</span><input autoFocus {...form.register('title')} aria-invalid={Boolean(form.formState.errors.title)} />{form.formState.errors.title ? <small role="alert">{form.formState.errors.title.message}</small> : null}</label>
        <label><span>Icon</span><select {...form.register('icon')}><option value="circle-check-big">Check</option><option value="glass-water">Water</option><option value="book-open">Book</option><option value="dumbbell">Dumbbell</option><option value="footprints">Steps</option><option value="brain">Mind</option></select></label>
        <label><span>Color</span><select {...form.register('colorToken')}><option value="mint">Mint</option><option value="coral">Coral</option><option value="blue">Blue</option><option value="sand">Sand</option><option value="slate">Slate</option></select></label>
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
      {habit ? <div className="habit-editor__danger-actions"><Button variant="quiet" type="button" disabled={pending} onClick={() => void archive()}><Archive aria-hidden />Archive</Button><Button variant="quiet" type="button" disabled={pending} onClick={() => void remove()}><Trash2 aria-hidden />Delete</Button></div> : null}
    </aside>
  )
}
