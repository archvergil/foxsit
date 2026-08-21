import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { BannerPicker } from '@/components/visual/BannerPicker'
import { defaultWorkoutBannerAsset, workoutBannerAssets } from '@/lib/bannerAssets'
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
      colorToken: 'slate',
      activityType: routine?.activityType ?? 'strength',
      crossfitTimeCapMinutes: Math.round((routine?.crossfitTimeCapSeconds ?? 1200) / 60),
      bannerAsset: routine?.bannerAsset ?? defaultWorkoutBannerAsset,
      bannerMonochrome: routine?.bannerAsset ? (routine.bannerMonochrome ?? true) : true,
    },
  })
  const bannerAsset = useWatch({ control: form.control, name: 'bannerAsset' }) ?? ''
  const bannerMonochrome = useWatch({ control: form.control, name: 'bannerMonochrome' }) ?? false
  const activityType = useWatch({ control: form.control, name: 'activityType' })
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
        <div className="workout-editor__wide">
          <BannerPicker assets={workoutBannerAssets} value={bannerAsset || defaultWorkoutBannerAsset} monochrome={bannerMonochrome} allowNone={false} onChange={(value) => form.setValue('bannerAsset', value ?? defaultWorkoutBannerAsset, { shouldDirty: true, shouldValidate: true })} onMonochromeChange={(value) => form.setValue('bannerMonochrome', value, { shouldDirty: true })} />
        </div>
        <input type="hidden" {...form.register('colorToken')} />
        <label>
          <span>Activity</span>
          <select {...form.register('activityType')} disabled={Boolean(routine?.exercises.length)}>
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="crossfit">CrossFit</option>
          </select>
          <small>{routine?.exercises.length ? 'Remove existing exercises before changing the modality.' : 'The modality is copied to every completed session.'}</small>
        </label>
        {activityType === 'crossfit' ? <label>
          <span>AMRAP time cap (minutes)</span>
          <input type="number" min="1" max="180" inputMode="numeric" {...form.register('crossfitTimeCapMinutes', { valueAsNumber: true })} />
          {form.formState.errors.crossfitTimeCapMinutes ? <small role="alert">{form.formState.errors.crossfitTimeCapMinutes.message}</small> : <small>The countdown automatically completes the WOD.</small>}
        </label> : null}
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
