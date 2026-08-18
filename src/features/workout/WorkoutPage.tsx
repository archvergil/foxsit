import { ArrowLeft, ChevronRight, Dumbbell, Pencil, Plus, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useDeleteWorkoutExercise, useDeleteWorkoutRoutine, useWorkoutRoutines } from './queries'
import type { WorkoutRoutine } from './types'
import { WorkoutExerciseEditor } from './WorkoutExerciseEditor'
import { WorkoutRoutineEditor } from './WorkoutRoutineEditor'

const RoutineCard = ({ routine }: { routine: WorkoutRoutine }) => (
  <Link className={`workout-routine-card workout-routine-card--${routine.colorToken}`} to={`/workout/routine/${routine.id}`}>
    <span className="workout-routine-card__icon"><Dumbbell aria-hidden /></span>
    <span><span className="eyebrow">{routine.exercises.length} exercises</span><strong>{routine.name}</strong><small>{routine.description ?? 'Ready for exercise planning.'}</small></span>
    <ChevronRight aria-hidden />
  </Link>
)

function WorkoutRoutineDetail({ routine, onEdit }: { routine: WorkoutRoutine; onEdit: () => void }) {
  const navigate = useNavigate()
  const deleteRoutine = useDeleteWorkoutRoutine()
  const deleteExercise = useDeleteWorkoutExercise()

  const removeRoutine = async () => {
    if (!window.confirm(`Delete “${routine.name}” and all of its exercises?`)) return
    try {
      await deleteRoutine.mutateAsync(routine.id)
      await navigate('/workout/routines')
    } catch {
      // The durable-write error remains visible.
    }
  }

  return (
    <div className="workout-detail">
      <div className="workout-detail__toolbar">
        <Link to="/workout/routines"><ArrowLeft aria-hidden />All routines</Link>
        <span>
          <Button variant="secondary" onClick={onEdit}><Pencil aria-hidden />Edit</Button>
          <Button variant="quiet" isLoading={deleteRoutine.isPending} onClick={() => void removeRoutine()}><Trash2 aria-hidden />Delete</Button>
        </span>
      </div>
      <section className={`workout-detail__hero workout-detail__hero--${routine.colorToken}`}>
        <span className="eyebrow">Workout routine</span><h2>{routine.name}</h2>
        <p>{routine.description ?? 'Add exercises below to turn this routine into a repeatable plan.'}</p>
        <dl><div><dt>Exercises</dt><dd>{routine.exercises.length}</dd></div><div><dt>Planned sets</dt><dd>{routine.exercises.reduce((total, exercise) => total + exercise.targetSets, 0)}</dd></div></dl>
      </section>
      <section className="workout-exercise-list" aria-label="Routine exercises">
        <header><div><span className="eyebrow">Exercise order</span><h2>Training blocks</h2></div></header>
        {routine.exercises.length === 0 ? <div className="workout-empty"><Dumbbell aria-hidden /><strong>No exercises yet.</strong><p>Add the first movement below. It is saved directly to Supabase.</p></div> : (
          <ol>{routine.exercises.map((exercise, index) => (
            <li key={exercise.id}>
              <span className="workout-exercise-list__position">{String(index + 1).padStart(2, '0')}</span>
              <span><strong>{exercise.exerciseName}</strong><small>{exercise.muscleGroup ?? 'Uncategorized'} · {exercise.targetSets} × {exercise.targetRepsMin}–{exercise.targetRepsMax}</small>{exercise.notes ? <p>{exercise.notes}</p> : null}</span>
              <span className="workout-exercise-list__rest"><Timer aria-hidden />{exercise.restSeconds}s</span>
              <button type="button" aria-label={`Remove ${exercise.exerciseName}`} disabled={deleteExercise.isPending} onClick={() => deleteExercise.mutate(exercise.id)}><Trash2 aria-hidden /></button>
            </li>
          ))}</ol>
        )}
        {deleteExercise.error ? <p className="workout-write-error" role="alert">{deleteExercise.error.message}</p> : null}
      </section>
      <WorkoutExerciseEditor routineId={routine.id} />
      {deleteRoutine.error ? <p className="workout-write-error" role="alert">{deleteRoutine.error.message}</p> : null}
    </div>
  )
}

export default function WorkoutPage() {
  const { routineId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routines = useWorkoutRoutines()
  const [editorRoutine, setEditorRoutine] = useState<WorkoutRoutine | 'new' | null>(null)
  const selectedRoutine = routines.data?.find((routine) => routine.id === routineId)
  const historyView = location.pathname === '/workout/history'

  return (
    <div className="workout-page">
      <PageHeader eyebrow="Workout · production" title={selectedRoutine?.name ?? (historyView ? 'Workout history' : 'Train with context.')} description={selectedRoutine ? 'Build the repeatable plan before starting an active session.' : 'Routines are stored in Supabase and isolated by your account.'} actions={!routineId && !historyView ? <Button onClick={() => setEditorRoutine('new')}><Plus aria-hidden />New routine</Button> : undefined} />
      <nav className="workout-view-switch" aria-label="Workout views"><Link className={!historyView ? 'is-active' : ''} to="/workout/routines">Routines</Link><Link className={historyView ? 'is-active' : ''} to="/workout/history">History</Link></nav>
      {routines.isLoading ? <div className="workout-state" role="status">Loading workout routines…</div> : null}
      {routines.error ? <div className="workout-state workout-state--error"><strong>Workout routines could not be loaded.</strong><p>{routines.error.message}</p><Button variant="secondary" onClick={() => void routines.refetch()}>Try again</Button></div> : null}
      {!routines.isLoading && !routines.error && historyView ? <div className="workout-state"><Dumbbell aria-hidden /><strong>No workout sessions yet.</strong><p>Session history will become available in the next Workout slice; this release persists routine planning only.</p></div> : null}
      {!routines.isLoading && !routines.error && routineId && selectedRoutine ? <WorkoutRoutineDetail routine={selectedRoutine} onEdit={() => setEditorRoutine(selectedRoutine)} /> : null}
      {!routines.isLoading && !routines.error && routineId && !selectedRoutine ? <div className="workout-state workout-state--error"><strong>Routine not found.</strong><Link to="/workout/routines">Return to routines</Link></div> : null}
      {!routines.isLoading && !routines.error && !routineId && !historyView ? (
        routines.data?.length ? <section className="workout-routine-grid" aria-label="Workout routines">{routines.data.map((routine) => <RoutineCard key={routine.id} routine={routine} />)}</section>
          : <div className="workout-state"><Dumbbell aria-hidden /><strong>No routines yet.</strong><p>Create your first split or full-body plan. Every save is durable in Supabase.</p><Button onClick={() => setEditorRoutine('new')}><Plus aria-hidden />Create routine</Button></div>
      ) : null}
      {editorRoutine ? <WorkoutRoutineEditor routine={editorRoutine === 'new' ? undefined : editorRoutine} onClose={() => setEditorRoutine(null)} onSaved={(savedId) => { setEditorRoutine(null); void navigate(`/workout/routine/${savedId}`) }} /> : null}
    </div>
  )
}
