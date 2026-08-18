import { Check, CheckCircle2, CircleStop, Dumbbell, TimerReset, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { useTimerClock } from '@/features/focus/useTimerClock'
import { useCancelWorkoutSession, useFinishWorkoutSession, useSaveWorkoutSet } from './queries'
import { formatWorkoutDuration, remainingWorkoutRestMs } from './restTimer'
import type { WorkoutSession, WorkoutSessionExercise, WorkoutSet } from './types'
import { useWorkoutRestStore } from './workoutRestStore'

function WorkoutSetRow({
  session,
  exercise,
  set,
}: {
  session: WorkoutSession
  exercise: WorkoutSessionExercise
  set: WorkoutSet
}) {
  const saveSet = useSaveWorkoutSet()
  const rest = useWorkoutRestStore()
  const [weight, setWeight] = useState(set.weightKg === null ? '' : String(set.weightKg))
  const [reps, setReps] = useState(set.reps === null ? '' : String(set.reps))
  const [rir, setRir] = useState(set.rir === null ? '' : String(set.rir))
  const [validationError, setValidationError] = useState<string | null>(null)

  const save = async () => {
    setValidationError(null)
    try {
      await saveSet.mutateAsync({
        sessionId: session.id,
        setId: set.id,
        weightKg: weight.trim() ? Number(weight) : null,
        reps: reps.trim() ? Number(reps) : 0,
        rir: rir.trim() ? Number(rir) : null,
      })
      if (exercise.restSeconds > 0) {
        rest.start({
          userId: session.userId,
          sessionId: session.id,
          exerciseName: exercise.exerciseName,
          durationSeconds: exercise.restSeconds,
        })
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'The set could not be saved.')
    }
  }

  return (
    <li className={set.completedAt ? 'is-complete' : ''}>
      <span className="workout-set__number">{set.setNumber}</span>
      <label>
        <span>kg</span>
        <input aria-label={`${exercise.exerciseName} set ${set.setNumber} weight in kilograms`} inputMode="decimal" min="0" max="10000" step="0.25" type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
      </label>
      <label>
        <span>Reps</span>
        <input aria-label={`${exercise.exerciseName} set ${set.setNumber} repetitions`} inputMode="numeric" min="1" max="1000" type="number" value={reps} onChange={(event) => setReps(event.target.value)} />
      </label>
      <label>
        <span>RIR</span>
        <input aria-label={`${exercise.exerciseName} set ${set.setNumber} reps in reserve`} inputMode="numeric" min="0" max="10" type="number" value={rir} onChange={(event) => setRir(event.target.value)} />
      </label>
      <Button variant={set.completedAt ? 'secondary' : 'primary'} isLoading={saveSet.isPending} onClick={() => void save()}>
        <Check aria-hidden />{set.completedAt ? 'Update' : 'Complete'}
      </Button>
      {validationError ? <p role="alert">{validationError}</p> : null}
    </li>
  )
}

function RestTimer({ session }: { session: WorkoutSession }) {
  const rest = useWorkoutRestStore()
  const belongsToSession = rest.ownerUserId === session.userId && rest.sessionId === session.id && rest.startedAt !== null
  const now = useTimerClock(belongsToSession)
  const remaining = belongsToSession ? remainingWorkoutRestMs(rest, now) : 0

  useEffect(() => {
    if (rest.startedAt !== null && !belongsToSession) rest.clear()
  }, [belongsToSession, rest])

  if (!belongsToSession) return null

  return (
    <aside className={`workout-rest-timer${remaining === 0 ? ' is-finished' : ''}`} aria-label="Rest timer">
      <TimerReset aria-hidden />
      <span><small>{remaining === 0 ? 'Rest complete' : `Rest after ${rest.exerciseName ?? 'set'}`}</small><strong aria-live="off">{formatWorkoutDuration(remaining)}</strong></span>
      <button type="button" aria-label="Dismiss rest timer" onClick={rest.clear}><X aria-hidden /></button>
    </aside>
  )
}

export function ActiveWorkoutSession({ session }: { session: WorkoutSession }) {
  const navigate = useNavigate()
  const { session: authSession } = useAuth()
  const cancelSession = useCancelWorkoutSession()
  const finishSession = useFinishWorkoutSession()
  const rest = useWorkoutRestStore()
  const [notes, setNotes] = useState('')
  const now = useTimerClock(true)
  const elapsed = Math.max(0, now - Date.parse(session.startedAt))
  const allSets = session.exercises.flatMap((exercise) => exercise.sets)
  const completedSets = allSets.filter((set) => set.completedAt).length
  const progress = allSets.length ? Math.round((completedSets / allSets.length) * 100) : 0

  useEffect(() => {
    if (rest.ownerUserId && authSession && rest.ownerUserId !== authSession.user.id) rest.clear()
  }, [authSession, rest])

  const discard = async () => {
    if (!window.confirm('Discard this active workout? Saved sets will remain marked as a cancelled session.')) return
    try {
      await cancelSession.mutateAsync({ sessionId: session.id, endedAt: new Date().toISOString() })
      rest.clear()
      await navigate('/workout/routines')
    } catch {
      // The durable-write error remains visible below.
    }
  }

  const finish = async () => {
    try {
      await finishSession.mutateAsync({ sessionId: session.id, notes: notes.trim() || null })
      rest.clear()
      await navigate('/workout/history')
    } catch {
      // The transaction error remains visible below.
    }
  }

  return (
    <div className="workout-active">
      <section className="workout-active__summary">
        <span className="workout-active__icon"><Dumbbell aria-hidden /></span>
        <span><span className="eyebrow">Active workout</span><h2>{session.routineName}</h2><p>Started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></span>
        <dl><div><dt>Elapsed</dt><dd>{formatWorkoutDuration(elapsed)}</dd></div><div><dt>Sets</dt><dd>{completedSets}/{allSets.length}</dd></div></dl>
        <div className="workout-active__progress" aria-label={`${progress}% of sets complete`}><span style={{ width: `${progress}%` }} /></div>
      </section>

      <RestTimer session={session} />

      <section className="workout-active__exercises" aria-label="Active workout exercises">
        {session.exercises.map((exercise, index) => (
          <article key={exercise.id}>
            <header>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{exercise.exerciseName}</h3><p>{exercise.muscleGroup ?? 'Uncategorized'} · Target {exercise.targetRepsMin}–{exercise.targetRepsMax} reps · {exercise.restSeconds}s rest</p></div>
            </header>
            <div className="workout-set__labels" aria-hidden><span>Set</span><span>kg</span><span>Reps</span><span>RIR</span><span>Status</span></div>
            <ol>{exercise.sets.map((set) => <WorkoutSetRow key={set.id} session={session} exercise={exercise} set={set} />)}</ol>
            {exercise.notes ? <p className="workout-active__notes">{exercise.notes}</p> : null}
          </article>
        ))}
      </section>

      <section className="workout-active__footer">
        <label><span>Workout notes</span><textarea maxLength={5000} placeholder="How did the session feel?" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="workout-active__footer-actions">
          <Button variant="quiet" isLoading={cancelSession.isPending} onClick={() => void discard()}><CircleStop aria-hidden />Discard workout</Button>
          <Button disabled={completedSets === 0} isLoading={finishSession.isPending} onClick={() => void finish()}><CheckCircle2 aria-hidden />Finish workout</Button>
        </div>
      </section>
      {cancelSession.error ? <p className="workout-write-error" role="alert">{cancelSession.error.message}</p> : null}
      {finishSession.error ? <p className="workout-write-error" role="alert">{finishSession.error.message}</p> : null}
    </div>
  )
}
