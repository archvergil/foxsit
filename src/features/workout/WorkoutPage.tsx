import { ArrowLeft, ChevronRight, Dumbbell, Pencil, Play, Plus, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { VisualBanner } from '@/components/visual/VisualBanner'
import { ActiveWorkoutSession } from './ActiveWorkoutSession'
import { useActiveWorkoutSession, useDeleteWorkoutExercise, useDeleteWorkoutRoutine, useStartWorkoutSession, useWorkoutRoutines } from './queries'
import type { WorkoutRoutine } from './types'
import { WorkoutExerciseEditor } from './WorkoutExerciseEditor'
import { WorkoutHistory } from './WorkoutHistory'
import { WorkoutRoutineEditor } from './WorkoutRoutineEditor'

const RoutineCard = ({ routine }: { routine: WorkoutRoutine }) => (
  <VisualBanner assetId={routine.bannerAsset} monochrome={routine.bannerMonochrome} className="workout-routine-card workout-routine-card--slate">
    <Link className="workout-routine-card__link" to={`/workout/routine/${routine.id}`}>
      <span className="workout-routine-card__icon"><Dumbbell aria-hidden /></span>
      <span><span className="eyebrow">{routine.exercises.length} exercises</span><strong>{routine.name}</strong><small>{routine.description ?? 'Ready for exercise planning.'}</small></span>
      <ChevronRight aria-hidden />
    </Link>
  </VisualBanner>
)

function WorkoutRoutineDetail({ routine, onEdit }: { routine: WorkoutRoutine; onEdit: () => void }) {
  const navigate = useNavigate()
  const deleteRoutine = useDeleteWorkoutRoutine()
  const deleteExercise = useDeleteWorkoutExercise()
  const startSession = useStartWorkoutSession()

  const removeRoutine = async () => {
    await deleteRoutine.mutateAsync(routine.id)
    await navigate('/workout/routines', { replace: true })
  }

  const startWorkout = async () => {
    try {
      await startSession.mutateAsync(routine.id)
      await navigate('/workout/session/active')
    } catch {
      // The durable-write error remains visible.
    }
  }

  return (
    <div className="workout-detail">
      <div className="workout-detail__toolbar">
        <Link to="/workout/routines"><ArrowLeft aria-hidden />All routines</Link>
        <span>
          <Button disabled={routine.exercises.length === 0} isLoading={startSession.isPending} onClick={() => void startWorkout()}><Play aria-hidden />Start workout</Button>
          <Button variant="secondary" onClick={onEdit}><Pencil aria-hidden />Edit</Button>
          <ConfirmDialog
            actionLabel="Delete routine"
            description="This routine and its planned exercises will be permanently removed. Completed workout history will remain available."
            onConfirm={removeRoutine}
            pending={deleteRoutine.isPending}
            title={`Delete “${routine.name}”?`}
            trigger={<Button variant="quiet" disabled={deleteRoutine.isPending}><Trash2 aria-hidden />Delete</Button>}
          />
        </span>
      </div>
      <VisualBanner assetId={routine.bannerAsset} monochrome={routine.bannerMonochrome} className="workout-detail__hero workout-detail__hero--slate">
        <span className="eyebrow">Workout routine</span><h2>{routine.name}</h2>
        <p>{routine.description ?? 'Add exercises below to turn this routine into a repeatable plan.'}</p>
        <dl><div><dt>Exercises</dt><dd>{routine.exercises.length}</dd></div><div><dt>Planned sets</dt><dd>{routine.exercises.reduce((total, exercise) => total + exercise.targetSets, 0)}</dd></div></dl>
      </VisualBanner>
      <section className="workout-exercise-list" aria-label="Routine exercises">
        <header><div><span className="eyebrow">Exercise order</span><h2>Training blocks</h2></div></header>
        {routine.exercises.length === 0 ? <div className="workout-empty"><Dumbbell aria-hidden /><strong>No exercises yet.</strong><p>Add the first movement below. It is saved directly to Supabase.</p></div> : (
          <ol>{routine.exercises.map((exercise, index) => (
            <li key={exercise.id}>
              <span className="workout-exercise-list__position">{String(index + 1).padStart(2, '0')}</span>
              <span><strong>{exercise.exerciseName}</strong><small>{exercise.muscleGroup ?? 'Uncategorized'} · {exercise.targetSets} × {exercise.targetRepsMin}–{exercise.targetRepsMax}</small>{exercise.notes ? <p>{exercise.notes}</p> : null}</span>
              <span className="workout-exercise-list__rest"><Timer aria-hidden />{exercise.restSeconds}s</span>
              <ConfirmDialog
                actionLabel="Remove exercise"
                description="This exercise and its planned sets will be permanently removed from the routine."
                onConfirm={() => deleteExercise.mutate(exercise.id)}
                pending={deleteExercise.isPending}
                title={`Remove “${exercise.exerciseName}”?`}
                trigger={<button type="button" aria-label={`Remove ${exercise.exerciseName}`} disabled={deleteExercise.isPending}><Trash2 aria-hidden /></button>}
              />
            </li>
          ))}</ol>
        )}
        {deleteExercise.error ? <p className="workout-write-error" role="alert">{deleteExercise.error.message}</p> : null}
      </section>
      <WorkoutExerciseEditor routineId={routine.id} />
      {deleteRoutine.error ? <p className="workout-write-error" role="alert">{deleteRoutine.error.message}</p> : null}
      {startSession.error ? <p className="workout-write-error" role="alert">{startSession.error.message}</p> : null}
    </div>
  )
}

export default function WorkoutPage() {
  const { routineId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routines = useWorkoutRoutines()
  const activeSession = useActiveWorkoutSession()
  const [editorRoutine, setEditorRoutine] = useState<WorkoutRoutine | 'new' | null>(null)
  const selectedRoutine = routines.data?.find((routine) => routine.id === routineId)
  const historyView = location.pathname === '/workout/history'
  const activeView = location.pathname === '/workout/session/active'
  const workoutViewIndex = activeSession.data ? (activeView ? 1 : historyView ? 2 : 0) : (historyView ? 1 : 0)

  return (
    <div className="workout-page">
      <PageHeader eyebrow="Workout · production" title={activeView ? (activeSession.data?.routineName ?? 'Active workout') : selectedRoutine?.name ?? (historyView ? 'Workout history' : 'Train with context.')} description={activeView ? 'Sets are saved to Supabase as you complete them.' : historyView ? 'Completed sessions, volume, estimated strength and personal records.' : selectedRoutine ? 'Build the repeatable plan, then start a durable workout session.' : 'Routines and active training are stored in Supabase and isolated by your account.'} actions={!routineId && !historyView && !activeView ? <Button onClick={() => setEditorRoutine('new')}><Plus aria-hidden />New routine</Button> : undefined} />
      <SegmentedControl activeIndex={workoutViewIndex} className="workout-view-switch" label="Workout views" name={activeSession.data ? 'workout-view-three' : 'workout-view-two'} options={activeSession.data ? 3 : 2}><Link className={!historyView && !activeView ? 'is-active' : ''} to="/workout/routines">Routines</Link>{activeSession.data ? <Link className={activeView ? 'is-active' : ''} to="/workout/session/active">Active</Link> : null}<Link className={historyView ? 'is-active' : ''} to="/workout/history">History</Link></SegmentedControl>
      {!activeView && activeSession.data ? <Link className="workout-active-banner" to="/workout/session/active"><span><span className="eyebrow">Workout in progress</span><strong>{activeSession.data.routineName}</strong></span><span>Continue<ChevronRight aria-hidden /></span></Link> : null}
      {activeView && activeSession.isLoading ? <div className="workout-state" role="status">Recovering your active workout…</div> : null}
      {activeView && activeSession.error ? <div className="workout-state workout-state--error"><strong>Active workout could not be loaded.</strong><p>{activeSession.error.message}</p><Button variant="secondary" onClick={() => void activeSession.refetch()}>Try again</Button></div> : null}
      {activeView && !activeSession.isLoading && !activeSession.error && activeSession.data ? (() => {
        const activeRoutine = routines.data?.find((routine) => routine.id === activeSession.data?.routineId)
        return <ActiveWorkoutSession session={activeSession.data} bannerAsset={activeRoutine?.bannerAsset} bannerMonochrome={activeRoutine?.bannerMonochrome ?? true} />
      })() : null}
      {activeView && !activeSession.isLoading && !activeSession.error && !activeSession.data ? <div className="workout-state"><Dumbbell aria-hidden /><strong>No workout is active.</strong><p>Start one from a routine with at least one exercise.</p><Link to="/workout/routines">Choose a routine</Link></div> : null}
      {!activeView && !historyView && routines.isLoading ? <div className="workout-state" role="status">Loading workout routines…</div> : null}
      {!activeView && !historyView && routines.error ? <div className="workout-state workout-state--error"><strong>Workout routines could not be loaded.</strong><p>{routines.error.message}</p><Button variant="secondary" onClick={() => void routines.refetch()}>Try again</Button></div> : null}
      {historyView ? <WorkoutHistory /> : null}
      {!routines.isLoading && !routines.error && routineId && selectedRoutine ? <WorkoutRoutineDetail routine={selectedRoutine} onEdit={() => setEditorRoutine(selectedRoutine)} /> : null}
      {!routines.isLoading && !routines.error && routineId && !selectedRoutine ? <div className="workout-state workout-state--error"><strong>Routine not found.</strong><Link to="/workout/routines">Return to routines</Link></div> : null}
      {!routines.isLoading && !routines.error && !routineId && !historyView && !activeView ? (
        routines.data?.length ? <section className="workout-routine-grid" aria-label="Workout routines">{routines.data.map((routine) => <RoutineCard key={routine.id} routine={routine} />)}</section>
          : <div className="workout-state"><Dumbbell aria-hidden /><strong>No routines yet.</strong><p>Create your first split or full-body plan. Every save is durable in Supabase.</p><Button onClick={() => setEditorRoutine('new')}><Plus aria-hidden />Create routine</Button></div>
      ) : null}
      {editorRoutine ? <WorkoutRoutineEditor routine={editorRoutine === 'new' ? undefined : editorRoutine} onClose={() => setEditorRoutine(null)} onSaved={(savedId) => { setEditorRoutine(null); void navigate(`/workout/routine/${savedId}`) }} /> : null}
    </div>
  )
}
