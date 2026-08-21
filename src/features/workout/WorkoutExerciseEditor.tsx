import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { useCreateWorkoutExercise } from './queries'
import {
  resolveWorkoutExerciseForm,
  workoutExerciseFormSchema,
  type WorkoutExerciseFormValues,
} from './schemas'
import type { WorkoutActivityType } from './types'

const defaults: WorkoutExerciseFormValues = {
  exerciseName: '', muscleGroup: '', targetSets: 3, targetRepsMin: 8,
  targetRepsMax: 12, restSeconds: 90, notes: '',
  crossfitUsesWeight: false, crossfitWeightKg: null, crossfitReps: 10,
}

export function WorkoutExerciseEditor({ routineId, activityType }: { routineId: string; activityType: WorkoutActivityType }) {
  const createExercise = useCreateWorkoutExercise()
  const [expanded, setExpanded] = useState(() => !window.matchMedia('(max-width: 640px)').matches)
  const form = useForm<WorkoutExerciseFormValues>({
    resolver: zodResolver(workoutExerciseFormSchema),
    defaultValues: defaults,
  })

  const submit = form.handleSubmit(async (values) => {
    try {
      await createExercise.mutateAsync(resolveWorkoutExerciseForm(routineId, activityType, values))
      form.reset(defaults)
    } catch {
      // Keep the exercise draft available for retry.
    }
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const sync = () => setExpanded(!media.matches)
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <form className={`workout-exercise-editor${expanded ? ' is-expanded' : ''}`} aria-label="Add exercise" onSubmit={(event) => void submit(event)}>
      <button className="workout-exercise-editor__toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
        <Plus aria-hidden /><span><strong>Add exercise</strong><small>Manual entry until the authorized catalog is available.</small></span>
      </button>
      <div className="workout-exercise-editor__fields" hidden={!expanded}>
        <label className="workout-exercise-editor__name"><span>Exercise</span><input placeholder="e.g. Bench press" {...form.register('exerciseName')} aria-invalid={Boolean(form.formState.errors.exerciseName)} />{form.formState.errors.exerciseName ? <small role="alert">{form.formState.errors.exerciseName.message}</small> : null}</label>
        {activityType === 'crossfit' ? <>
          <label className="workout-exercise-editor__checkbox"><input type="checkbox" {...form.register('crossfitUsesWeight')} /><span>Uses weight (kg)</span></label>
          {form.watch('crossfitUsesWeight') ? <label><span>Weight (kg)</span><input type="number" inputMode="decimal" min="0" max="10000" step="0.25" {...form.register('crossfitWeightKg', { setValueAs: (value) => value === '' ? null : Number(value) })} />{form.formState.errors.crossfitWeightKg ? <small role="alert">{form.formState.errors.crossfitWeightKg.message}</small> : null}</label> : null}
          <label><span>Repetitions</span><input type="number" inputMode="numeric" min="1" max="1000" {...form.register('crossfitReps', { setValueAs: (value) => value === '' ? null : Number(value) })} />{form.formState.errors.crossfitReps ? <small role="alert">{form.formState.errors.crossfitReps.message}</small> : null}</label>
        </> : <>
          <label><span>Muscle group</span><input placeholder="Optional" {...form.register('muscleGroup')} /></label>
          <label><span>Sets</span><input type="number" min="1" max="20" {...form.register('targetSets', { valueAsNumber: true })} /></label>
          <label><span>Min reps</span><input type="number" min="1" max="100" {...form.register('targetRepsMin', { valueAsNumber: true })} /></label>
          <label><span>Max reps</span><input type="number" min="1" max="100" {...form.register('targetRepsMax', { valueAsNumber: true })} />{form.formState.errors.targetRepsMax ? <small role="alert">{form.formState.errors.targetRepsMax.message}</small> : null}</label>
          <label><span>Rest (seconds)</span><input type="number" min="0" max="3600" {...form.register('restSeconds', { valueAsNumber: true })} /></label>
          <label className="workout-exercise-editor__notes"><span>Notes</span><textarea rows={2} placeholder="Tempo, setup or substitutions" {...form.register('notes')} /></label>
        </>}
        <div className="workout-exercise-editor__actions">
          <Button type="submit" isLoading={createExercise.isPending}><Plus aria-hidden />Add exercise</Button>
        </div>
        {createExercise.error ? <p role="alert">{createExercise.error.message}</p> : null}
      </div>
    </form>
  )
}
