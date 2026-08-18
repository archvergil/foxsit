import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { useCreateWorkoutRoutine, useUpdateWorkoutRoutine } from './queries'
import {
  resolveWorkoutRoutineForm,
  workoutRoutineFormSchema,
  type WorkoutRoutineFormValues,
} from './schemas'
import type { WorkoutRoutine } from './types'

export function WorkoutRoutineEditor({
  routine,
  onClose,
  onSaved,
}: {
  routine?: WorkoutRoutine | undefined
  onClose: () => void
  onSaved: (routineId: string) => void
}) {
  const createRoutine = useCreateWorkoutRoutine()
  const updateRoutine = useUpdateWorkoutRoutine()
  const form = useForm<WorkoutRoutineFormValues>({
    resolver: zodResolver(workoutRoutineFormSchema),
    defaultValues: {
      name: routine?.name ?? '',
      description: routine?.description ?? '',
      colorToken: routine?.colorToken ?? 'coral',
    },
  })
  const error = createRoutine.error ?? updateRoutine.error

  const submit = form.handleSubmit(async (values) => {
    try {
      const input = resolveWorkoutRoutineForm(values)
      const saved = routine
        ? await updateRoutine.mutateAsync({ routineId: routine.id, input })
        : await createRoutine.mutateAsync(input)
      onSaved(saved.id)
    } catch {
      // Keep the form and durable-write error visible for retry.
    }
  })

  return (
    <aside className="workout-editor" aria-label={routine ? `Edit routine ${routine.name}` : 'Create workout routine'}>
      <header>
        <span><span className="eyebrow">{routine ? 'Routine details' : 'New routine'}</span><h2>{routine ? 'Edit routine' : 'Plan your training'}</h2></span>
        <button type="button" aria-label="Close routine editor" onClick={onClose}><X aria-hidden /></button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <label className="workout-editor__wide">
          <span>Name</span>
          <input autoFocus {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} />
          {form.formState.errors.name ? <small role="alert">{form.formState.errors.name.message}</small> : null}
        </label>
        <label>
          <span>Color</span>
          <select {...form.register('colorToken')}>
            <option value="coral">Coral</option><option value="mint">Mint</option>
            <option value="blue">Blue</option><option value="sand">Sand</option><option value="slate">Slate</option>
          </select>
        </label>
        <label className="workout-editor__wide">
          <span>Description</span>
          <textarea rows={4} placeholder="Goal, split or useful context" {...form.register('description')} />
        </label>
        <Button className="workout-editor__wide" type="submit" isLoading={createRoutine.isPending || updateRoutine.isPending}>
          {routine ? 'Save routine' : 'Create routine'}
        </Button>
      </form>
      {error ? <p className="workout-editor__error" role="alert">{error.message}</p> : null}
    </aside>
  )
}
