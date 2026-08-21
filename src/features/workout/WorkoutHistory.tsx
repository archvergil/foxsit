import { CalendarDays, Dumbbell, Gauge, Trash2, Trophy } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/features/auth/authContext'
import { useProfile } from '@/features/settings/profileQueries'
import { resolveTimeZone } from '@/lib/dates'
import { formatWeightKg } from './metrics'
import { useDeleteWorkoutSession, useWorkoutHistory } from './queries'
import { formatWorkoutDuration } from './restTimer'
import type { WorkoutSession } from './types'

const formatSessionDate = (timestamp: string, timeZone: string) => new Intl.DateTimeFormat('en-US', {
  timeZone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(timestamp))

function WorkoutHistoryCard({ session, timeZone, onDelete, deleting }: { session: WorkoutSession; timeZone: string; onDelete: () => Promise<void>; deleting: boolean }) {
  const completedExercises = session.activityType === 'crossfit' ? session.exercises : session.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.filter((set) => set.completedAt),
  })).filter((exercise) => exercise.sets.length > 0)

  return (
    <details className="workout-history-card">
      <summary>
        <span className="workout-history-card__icon"><Dumbbell aria-hidden /></span>
        <span><small>{formatSessionDate(session.endedAt ?? session.startedAt, timeZone)}</small><strong>{session.routineName}</strong><small>{completedExercises.length} exercises</small></span>
        <dl>
          <div><dt>Duration</dt><dd>{formatWorkoutDuration((session.durationSeconds ?? 0) * 1000)}</dd></div>
          <div><dt>{session.activityType === 'crossfit' ? 'Rounds' : 'Volume'}</dt><dd>{session.activityType === 'crossfit' ? session.crossfitRoundsCompleted : formatWeightKg(session.totalVolumeKg)}</dd></div>
          <div><dt>{session.activityType === 'crossfit' ? 'Format' : 'PRs'}</dt><dd>{session.activityType === 'crossfit' ? 'AMRAP' : session.personalRecords}</dd></div>
        </dl>
      </summary>
      <div className="workout-history-card__details">
        {session.activityType === 'crossfit' ? <section className="workout-history-card__crossfit-score"><header><strong>{session.crossfitRoundsCompleted} completed rounds</strong><small>{Math.round((session.crossfitTimeCapSeconds ?? 0) / 60)} minute time cap</small></header><ul>{completedExercises.map((exercise) => <li key={exercise.id}><span>{String(exercise.position).padStart(2, '0')}</span><strong>{exercise.exerciseName}</strong><span>{exercise.crossfitReps ?? 0} reps · {exercise.crossfitUsesWeight ? `${exercise.crossfitWeightKg ?? 0} kg` : 'No weight'}</span></li>)}</ul></section> : completedExercises.map((exercise) => (
          <section key={exercise.id}>
            <header><strong>{exercise.exerciseName}</strong><small>{exercise.muscleGroup ?? 'Uncategorized'}</small></header>
            <ul>{exercise.sets.map((set) => (
              <li key={set.id}>
                <span>Set {set.setNumber}</span>
                <strong>{set.weightKg === null ? `${set.reps ?? 0} reps` : `${set.weightKg} kg × ${set.reps ?? 0}`}</strong>
                <span>{set.estimatedOneRepMaxKg === null ? '—' : `e1RM ${formatWeightKg(set.estimatedOneRepMaxKg)}`}</span>
                {set.isPersonalRecord ? <mark><Trophy aria-hidden />PR</mark> : null}
              </li>
            ))}</ul>
          </section>
        ))}
        {session.notes ? <p className="workout-history-card__notes">{session.notes}</p> : null}
        <footer className="workout-history-card__actions">
          <ConfirmDialog actionLabel="Delete session" description="This completed session, its sets and calculated metrics will be permanently removed from workout history." onConfirm={onDelete} pending={deleting} title={`Delete “${session.routineName}” session?`} trigger={<Button variant="quiet" type="button" disabled={deleting}><Trash2 aria-hidden />Delete session</Button>} />
        </footer>
      </div>
    </details>
  )
}

export function WorkoutHistory() {
  const { session } = useAuth()
  const profile = useProfile(session?.user.id ?? '')
  const history = useWorkoutHistory(true)
  const deleteSession = useDeleteWorkoutSession()
  const timeZone = resolveTimeZone(profile.data?.timezone ?? session?.user.user_metadata.timezone)

  if (history.isLoading) return <div className="workout-state" role="status">Loading completed workouts…</div>
  if (history.error) return <div className="workout-state workout-state--error"><strong>Workout history could not be loaded.</strong><p>{history.error.message}</p><Button variant="secondary" onClick={() => void history.refetch()}>Try again</Button></div>
  if (!history.data?.length) return <div className="workout-state"><Dumbbell aria-hidden /><strong>No completed workouts yet.</strong><p>Finish an active workout and its durable metrics will appear here.</p></div>

  const totalVolume = history.data.reduce((total, item) => total + item.totalVolumeKg, 0)
  const totalRecords = history.data.reduce((total, item) => total + item.personalRecords, 0)
  const bestCrossfitRounds = history.data.reduce((best, item) => item.activityType === 'crossfit' ? Math.max(best, item.crossfitRoundsCompleted) : best, 0)
  return (
    <div className="workout-history">
      <section className="workout-history__summary" aria-label="Workout history summary">
        <div><CalendarDays aria-hidden /><span><small>Sessions</small><strong>{history.data.length}</strong></span></div>
        <div><Gauge aria-hidden /><span><small>Total volume</small><strong>{formatWeightKg(totalVolume)}</strong></span></div>
        <div><Trophy aria-hidden /><span><small>Personal records</small><strong>{totalRecords}</strong></span></div>
        <div><Dumbbell aria-hidden /><span><small>Best CrossFit score</small><strong>{bestCrossfitRounds} rounds</strong></span></div>
      </section>
      <section className="workout-history__list" aria-label="Completed workout sessions">
        {history.data.map((item) => <WorkoutHistoryCard key={item.id} session={item} timeZone={timeZone} deleting={deleteSession.isPending && deleteSession.variables === item.id} onDelete={() => deleteSession.mutateAsync(item.id).then(() => undefined)} />)}
      </section>
      {deleteSession.error ? <p className="workout-write-error" role="alert">{deleteSession.error.message}</p> : null}
    </div>
  )
}
