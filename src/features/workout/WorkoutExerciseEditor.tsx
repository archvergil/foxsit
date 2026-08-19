import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { useCreateWorkoutExercise } from './queries'
import {
  resolveWorkoutExerciseForm,
  workoutExerciseFormSchema,
  type WorkoutExerciseFormValues,
} from './schemas'

const defaults: WorkoutExerciseFormValues = {
  exerciseName: '', muscleGroup: '', targetSets: 3, targetRepsMin: 8,
  targetRepsMax: 12, restSeconds: 90, notes: '',
}

export function WorkoutExerciseEditor({ routineId }: { routineId: string }) {
  const createExercise = useCreateWorkoutExercise()
  const form = useForm<WorkoutExerciseFormValues>({
    resolver: zodResolver(workoutExerciseFormSchema),
    defaultValues: defaults,
  })

  const submit = form.handleSubmit(async (values) => {
    try {
      await createExercise.mutateAsync(resolveWorkoutExerciseForm(routineId, values))
      form.reset(defaults)
    } catch {
      // Keep the exercise draft available for retry.
    }
  })

  return (
    <form className="workout-exercise-editor" aria-label="Add exercise" onSubmit={(event) => void submit(event)}>
      <header><Plus aria-hidden /><span><strong>Add exercise</strong><small>Manual entry until the authorized catalog is available.</small></span></header>
      <label className="workout-exercise-editor__name"><span>Exercise</span><input placeholder="e.g. Bench press" {...form.register('exerciseName')} aria-invalid={Boolean(form.formState.errors.exerciseName)} />{form.formState.errors.exerciseName ? <small role="alert">{form.formState.errors.exerciseName.message}</small> : null}</label>
      <label><span>Muscle group</span><input placeholder="Optional" {...form.register('muscleGroup')} /></label>
      <label><span>Sets</span><input type="number" min="1" max="20" {...form.register('targetSets', { valueAsNumber: true })} /></label>
      <label><span>Min reps</span><input type="number" min="1" max="100" {...form.register('targetRepsMin', { valueAsNumber: true })} /></label>
      <label><span>Max reps</span><input type="number" min="1" max="100" {...form.register('targetRepsMax', { valueAsNumber: true })} />{form.formState.errors.targetRepsMax ? <small role="alert">{form.formState.errors.targetRepsMax.message}</small> : null}</label>
      <label><span>Rest (seconds)</span><input type="number" min="0" max="3600" {...form.register('restSeconds', { valueAsNumber: true })} /></label>
      <label className="workout-exercise-editor__notes"><span>Notes</span><textarea rows={2} placeholder="Tempo, setup or substitutions" {...form.register('notes')} /></label>
      <div className="workout-exercise-editor__actions">
        <Button type="submit" isLoading={createExercise.isPending}><Plus aria-hidden />Add exercise</Button>
      </div>
      {createExercise.error ? <p role="alert">{createExercise.error.message}</p> : null}
    </form>
  )
}
