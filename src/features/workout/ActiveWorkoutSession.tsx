import { Check, CheckCircle2, CircleStop, Dumbbell, Pencil, Plus, TimerReset, Trophy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { VisualBanner } from '@/components/visual/VisualBanner'
import { useAuth } from '@/features/auth/authContext'
import { useTimerClock } from '@/features/focus/useTimerClock'
import { useCancelWorkoutSession, useFinishWorkoutSession, useIncrementCrossfitRound, useRenameWorkoutSessionExercise, useSaveWorkoutSet, useSettleCrossfitWorkout } from './queries'
import { formatWorkoutDuration, remainingWorkoutRestMs } from './restTimer'
import type { WorkoutSession, WorkoutSessionExercise, WorkoutSet } from './types'
import { cascadeWorkoutSetDraft, workoutSetDraftFromSet, type WorkoutSetDraft } from './workoutSetDrafts'
import { useWorkoutRestStore } from './workoutRestStore'

function WorkoutSetRow({
  session,
  exercise,
  set,
  draft,
  onDraftChange,
}: {
  session: WorkoutSession
  exercise: WorkoutSessionExercise
  set: WorkoutSet
  draft: WorkoutSetDraft
  onDraftChange: (field: keyof WorkoutSetDraft, value: string) => void
}) {
  const saveSet = useSaveWorkoutSet()
  const rest = useWorkoutRestStore()
  const [validationError, setValidationError] = useState<string | null>(null)

  const save = async () => {
    setValidationError(null)
    try {
      await saveSet.mutateAsync({
        sessionId: session.id,
        setId: set.id,
        weightKg: draft.weight.trim() ? Number(draft.weight) : null,
        reps: draft.reps.trim() ? Number(draft.reps) : 0,
        rir: draft.rir.trim() ? Number(draft.rir) : null,
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
        <input aria-label={`${exercise.exerciseName} set ${set.setNumber} weight in kilograms`} inputMode="decimal" min="0" max="10000" step="0.25" type="number" value={draft.weight} onChange={(event) => onDraftChange('weight', event.target.value)} />
      </label>
      <label>
        <span>Reps</span>
        <input aria-label={`${exercise.exerciseName} set ${set.setNumber} repetitions`} inputMode="numeric" min="1" max="1000" type="number" value={draft.reps} onChange={(event) => onDraftChange('reps', event.target.value)} />
      </label>
      <label>
        <span>RIR</span>
        <input aria-label={`${exercise.exerciseName} set ${set.setNumber} reps in reserve`} inputMode="numeric" min="0" max="10" type="number" value={draft.rir} onChange={(event) => onDraftChange('rir', event.target.value)} />
      </label>
      <Button variant={set.completedAt ? 'secondary' : 'primary'} isLoading={saveSet.isPending} onClick={() => void save()}>
        <Check aria-hidden />{set.completedAt ? 'Update' : 'Complete'}
      </Button>
      {validationError ? <p role="alert">{validationError}</p> : null}
    </li>
  )
}

function ActiveExerciseHeader({ exercise, index, description }: { exercise: WorkoutSessionExercise; index: number; description?: string }) {
  const rename = useRenameWorkoutSessionExercise()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exercise.exerciseName)
  const [error, setError] = useState<string | null>(null)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (name.trim() === exercise.exerciseName) {
      setEditing(false)
      return
    }
    try {
      await rename.mutateAsync({ sessionExerciseId: exercise.id, exerciseName: name })
      setEditing(false)
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'The exercise name could not be updated.')
    }
  }

  return (
    <header>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <div className="workout-active__exercise-heading">
        {editing ? (
          <form onSubmit={(event) => void save(event)}>
            <label className="visually-hidden" htmlFor={`active-exercise-${exercise.id}`}>Exercise name</label>
            <input id={`active-exercise-${exercise.id}`} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
            <Button type="submit" isLoading={rename.isPending}><Check aria-hidden />Save</Button>
            <Button type="button" variant="quiet" disabled={rename.isPending} onClick={() => { setName(exercise.exerciseName); setEditing(false) }}><X aria-hidden />Cancel</Button>
          </form>
        ) : (
          <div className="workout-active__exercise-title"><h3>{exercise.exerciseName}</h3><button type="button" aria-label={`Rename ${exercise.exerciseName}`} onClick={() => { setName(exercise.exerciseName); setEditing(true) }}><Pencil aria-hidden /></button></div>
        )}
        <p>{description ?? `${exercise.muscleGroup ?? 'Uncategorized'} · Target ${exercise.targetRepsMin}–${exercise.targetRepsMax} reps · ${exercise.restSeconds}s rest`}</p>
        {error ? <small role="alert">{error}</small> : null}
      </div>
    </header>
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

function ActiveTraditionalWorkoutSession({ session, bannerAsset, bannerMonochrome = true }: {
  session: WorkoutSession
  bannerAsset?: string | null | undefined
  bannerMonochrome?: boolean | undefined
}) {
  const navigate = useNavigate()
  const { session: authSession } = useAuth()
  const cancelSession = useCancelWorkoutSession()
  const finishSession = useFinishWorkoutSession()
  const rest = useWorkoutRestStore()
  const [notes, setNotes] = useState('')
  const [drafts, setDrafts] = useState<Record<string, WorkoutSetDraft>>(() => Object.fromEntries(
    session.exercises.flatMap((exercise) => exercise.sets.map((set) => [set.id, workoutSetDraftFromSet(set)])),
  ))
  const now = useTimerClock(true)
  const elapsed = Math.max(0, now - Date.parse(session.startedAt))
  const allSets = session.exercises.flatMap((exercise) => exercise.sets)
  const completedSets = allSets.filter((set) => set.completedAt).length
  const progress = allSets.length ? Math.round((completedSets / allSets.length) * 100) : 0

  const updateDraft = (exercise: WorkoutSessionExercise, setIndex: number, field: keyof WorkoutSetDraft, value: string) => {
    setDrafts((current) => cascadeWorkoutSetDraft(current, exercise.sets, setIndex, field, value))
  }

  useEffect(() => {
    if (rest.ownerUserId && authSession && rest.ownerUserId !== authSession.user.id) rest.clear()
  }, [authSession, rest])

  const discard = async () => {
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
      <VisualBanner assetId={bannerAsset} monochrome={bannerMonochrome} className="workout-active__summary">
        <span className="workout-active__icon"><Dumbbell aria-hidden /></span>
        <span><span className="eyebrow">Active workout</span><h2>{session.routineName}</h2><p>Started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></span>
        <dl><div><dt>Elapsed</dt><dd>{formatWorkoutDuration(elapsed)}</dd></div><div><dt>Sets</dt><dd>{completedSets}/{allSets.length}</dd></div></dl>
        <div className="workout-active__progress" aria-label={`${progress}% of sets complete`}><span style={{ width: `${progress}%` }} /></div>
      </VisualBanner>

      <RestTimer session={session} />

      <section className="workout-active__exercises" aria-label="Active workout exercises">
        {session.exercises.map((exercise, index) => (
          <article key={exercise.id}>
            <ActiveExerciseHeader exercise={exercise} index={index} />
            <div className="workout-set__labels" aria-hidden><span>Set</span><span>kg</span><span>Reps</span><span>RIR</span><span>Status</span></div>
            <ol>{exercise.sets.map((set, setIndex) => <WorkoutSetRow key={set.id} session={session} exercise={exercise} set={set} draft={drafts[set.id] ?? workoutSetDraftFromSet(set)} onDraftChange={(field, value) => updateDraft(exercise, setIndex, field, value)} />)}</ol>
            {exercise.notes ? <p className="workout-active__notes">{exercise.notes}</p> : null}
          </article>
        ))}
      </section>

      <section className="workout-active__footer">
        <label><span>Workout notes</span><textarea maxLength={5000} placeholder="How did the session feel?" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="workout-active__footer-actions">
          <ConfirmDialog actionLabel="Discard workout" description="The active workout will end now. Saved sets will remain recorded in a cancelled session." onConfirm={discard} pending={cancelSession.isPending} title="Discard this active workout?" trigger={<Button variant="quiet" disabled={cancelSession.isPending}><CircleStop aria-hidden />Discard workout</Button>} />
          <Button disabled={completedSets === 0} isLoading={finishSession.isPending} onClick={() => void finish()}><CheckCircle2 aria-hidden />Finish workout</Button>
        </div>
      </section>
      {cancelSession.error ? <p className="workout-write-error" role="alert">{cancelSession.error.message}</p> : null}
      {finishSession.error ? <p className="workout-write-error" role="alert">{finishSession.error.message}</p> : null}
    </div>
  )
}

type ActiveWorkoutProps = {
  session: WorkoutSession
  bannerAsset?: string | null | undefined
  bannerMonochrome?: boolean | undefined
}

function ActiveCrossfitSession({ session, bannerAsset, bannerMonochrome = true }: ActiveWorkoutProps) {
  const navigate = useNavigate()
  const cancelSession = useCancelWorkoutSession()
  const incrementRound = useIncrementCrossfitRound()
  const settleWorkout = useSettleCrossfitWorkout()
  const settlementAttempted = useRef(false)
  const now = useTimerClock(true)
  const dueAt = session.crossfitDueAt ? Date.parse(session.crossfitDueAt) : Date.parse(session.startedAt)
  const remainingMs = Math.max(0, dueAt - now)
  const elapsedMs = Math.max(0, now - Date.parse(session.startedAt))
  const timeCapMs = Math.max(1, (session.crossfitTimeCapSeconds ?? 1) * 1000)
  const timeProgress = Math.min(100, Math.round((elapsedMs / timeCapMs) * 100))

  useEffect(() => {
    if (remainingMs > 0 || settlementAttempted.current) return
    settlementAttempted.current = true
    settleWorkout.mutate(session.id, {
      onSuccess: () => { void navigate('/workout/history') },
    })
  }, [navigate, remainingMs, session.id, settleWorkout])

  const addRound = async () => {
    try {
      const result = await incrementRound.mutateAsync(session.id)
      if (result.status === 'completed') await navigate('/workout/history')
    } catch {
      // The durable-write error remains visible for retry.
    }
  }

  const discard = async () => {
    try {
      await cancelSession.mutateAsync({ sessionId: session.id, endedAt: new Date().toISOString() })
      await navigate('/workout/routines')
    } catch {
      // The durable-write error remains visible for retry.
    }
  }

  return (
    <div className="workout-active workout-crossfit-active">
      <VisualBanner assetId={bannerAsset} monochrome={bannerMonochrome} className="workout-active__summary workout-crossfit-active__summary">
        <span className="workout-active__icon"><Dumbbell aria-hidden /></span>
        <span><span className="eyebrow">CrossFit · AMRAP</span><h2>{session.routineName}</h2><p>Complete the full circuit, then record one round.</p></span>
        <dl><div><dt>Remaining</dt><dd aria-live="off">{formatWorkoutDuration(remainingMs)}</dd></div><div><dt>Rounds</dt><dd>{session.crossfitRoundsCompleted}</dd></div></dl>
        <div className="workout-active__progress" aria-label={`${timeProgress}% of time elapsed`}><span style={{ width: `${timeProgress}%` }} /></div>
      </VisualBanner>

      <section className="workout-crossfit-active__score" aria-label="CrossFit round counter">
        <Trophy aria-hidden />
        <span><small>Completed circuits</small><strong>{session.crossfitRoundsCompleted}</strong></span>
        <Button disabled={remainingMs === 0} isLoading={incrementRound.isPending} onClick={() => void addRound()}><Plus aria-hidden />One More</Button>
        <p>Tap only after completing every movement below. The count is saved immediately.</p>
      </section>

      <section className="workout-active__exercises workout-crossfit-active__circuit" aria-label="CrossFit circuit">
        {session.exercises.map((exercise, index) => {
          const prescription = `${exercise.crossfitReps ?? 0} reps · ${exercise.crossfitUsesWeight ? `${exercise.crossfitWeightKg ?? 0} kg` : 'No weight'}`
          return <article key={exercise.id}><ActiveExerciseHeader exercise={exercise} index={index} description={prescription} /></article>
        })}
      </section>

      <section className="workout-active__footer workout-crossfit-active__footer">
        <div><strong>{remainingMs === 0 ? 'Time is up.' : 'The WOD ends automatically at 00:00.'}</strong><p>Its time cap, exercise prescription and final round count remain in history.</p></div>
        <ConfirmDialog actionLabel="Discard workout" description="This active WOD will end without adding it to completed history." onConfirm={discard} pending={cancelSession.isPending} title="Discard this CrossFit workout?" trigger={<Button variant="quiet" disabled={cancelSession.isPending}><CircleStop aria-hidden />Discard workout</Button>} />
      </section>
      {settleWorkout.isPending ? <p className="workout-crossfit-active__settling" role="status">Time is up. Saving the final score…</p> : null}
      {incrementRound.error ? <p className="workout-write-error" role="alert">{incrementRound.error.message}</p> : null}
      {settleWorkout.error ? <p className="workout-write-error" role="alert">{settleWorkout.error.message} <button type="button" onClick={() => { settlementAttempted.current = false; settleWorkout.reset() }}>Try again</button></p> : null}
      {cancelSession.error ? <p className="workout-write-error" role="alert">{cancelSession.error.message}</p> : null}
    </div>
  )
}

export function ActiveWorkoutSession(props: ActiveWorkoutProps) {
  return props.session.activityType === 'crossfit'
    ? <ActiveCrossfitSession {...props} />
    : <ActiveTraditionalWorkoutSession {...props} />
}
