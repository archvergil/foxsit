import { ArrowRight, CalendarDays, CheckCircle2, Dumbbell, Leaf, Play, TimerReset } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/authContext'
import { formatCalendarEventTime } from '@/features/calendar/calendarMonth'
import { useCalendarEvents } from '@/features/calendar/queries'
import { useFocusSessions } from '@/features/focus/queries'
import { usePomodoroStore } from '@/features/focus/pomodoroStore'
import { formatTimer, remainingTimerMs } from '@/features/focus/timer'
import { useTimerClock } from '@/features/focus/useTimerClock'
import { useHabitLogs, useHabits } from '@/features/habits/queries'
import { TodayTasksCard } from '@/features/tasks/TodayTasksCard'
import { useTaskDateContext, useTaskList } from '@/features/tasks/queries'
import { useOptionalActiveWorkoutSession, useOptionalWorkoutHistory, useOptionalWorkoutRoutines } from '@/features/workout/queries'
import { addLocalDays, formatDayHeading, localDateKey, localDateTimeToTimestamp } from '@/lib/dates'
import { todayAgenda, todayHabitProgress, todayMetrics } from './todayOverview'

function TodayFocusCard() {
  const timer = usePomodoroStore()
  const { session } = useAuth()
  const active = timer.status !== 'idle' && timer.ownerUserId === session?.user.id
  const now = useTimerClock(active && timer.status === 'running')
  const remaining = active ? remainingTimerMs(timer, now) : timer.durationMs
  return <Link className="today-overview-card today-overview-card--focus" to="/focus"><TimerReset aria-hidden /><span><small>{active ? `${timer.phase.replace('_', ' ')} ${timer.status}` : 'Focus'}</small><strong>{formatTimer(remaining)}</strong></span><ArrowRight aria-hidden /></Link>
}

export default function TodayPage() {
  const { timeZone } = useTaskDateContext()
  const currentTime = useTimerClock(true)
  const today = localDateKey(new Date(), timeZone)
  const rangeStart = localDateTimeToTimestamp(`${today}T00:00`, timeZone)
  const rangeEnd = localDateTimeToTimestamp(`${addLocalDays(today, 1)}T00:00`, timeZone)
  if (!rangeStart || !rangeEnd) throw new Error(`Could not resolve Today in ${timeZone}.`)
  const eventsQuery = useCalendarEvents({ rangeStart, rangeEnd, localDateStart: today, localDateEnd: today })
  const tasksQuery = useTaskList({})
  const habitsQuery = useHabits()
  const habitLogsQuery = useHabitLogs({ dateStart: today, dateEnd: today })
  const focusQuery = useFocusSessions({ startedAfter: rangeStart, startedBefore: rangeEnd, limit: 100 })
  const activeWorkoutQuery = useOptionalActiveWorkoutSession()
  const workoutHistoryQuery = useOptionalWorkoutHistory()
  const routinesQuery = useOptionalWorkoutRoutines()
  const events = todayAgenda(eventsQuery.data ?? [], today, timeZone)
  const habits = todayHabitProgress(habitsQuery.data ?? [], habitLogsQuery.data ?? [], today)
  const metrics = todayMetrics({ tasks: tasksQuery.data ?? [], habitsCompleted: habits.completed, habitsScheduled: habits.scheduled.length, focusSessions: focusQuery.data ?? [], workouts: workoutHistoryQuery.data ?? [], timeZone })
  const nextEvent = events.find((event) => event.allDay || (event.endAt && new Date(event.endAt).getTime() > currentTime))
  const pending = eventsQuery.isPending || tasksQuery.isPending || habitsQuery.isPending || habitLogsQuery.isPending || focusQuery.isPending || activeWorkoutQuery.isPending || workoutHistoryQuery.isPending || routinesQuery.isPending
  const error = eventsQuery.error ?? tasksQuery.error ?? habitsQuery.error ?? habitLogsQuery.error ?? focusQuery.error ?? activeWorkoutQuery.error ?? workoutHistoryQuery.error ?? routinesQuery.error
  const retry = () => void Promise.all([eventsQuery.refetch(), tasksQuery.refetch(), habitsQuery.refetch(), habitLogsQuery.refetch(), focusQuery.refetch(), activeWorkoutQuery.refetch(), workoutHistoryQuery.refetch(), routinesQuery.refetch()])

  return <section className="page-stack today-page">
    <PageHeader eyebrow={formatDayHeading(new Date(), timeZone)} title="Your day, in one calm view." description="A live view of what is scheduled, in progress and already complete." />
    {pending ? <div className="today-loading" role="status">Loading today&apos;s workspace…</div> : error ? <div className="today-error" role="alert"><strong>Today could not be loaded.</strong><p>{error.message}</p><button type="button" onClick={retry}>Try again</button></div> : <div className="today-grid">
      <article className="today-hero-card"><div><span className="eyebrow">Up next</span><h2>{nextEvent?.title ?? 'The day is open.'}</h2><p>{nextEvent ? `${formatCalendarEventTime(nextEvent, timeZone)} · ${nextEvent.category ?? 'Calendar event'}` : 'There are no more events today. Choose the next useful action.'}</p><Link to="/calendar">Open Calendar <ArrowRight aria-hidden /></Link></div><div className="today-hero-card__orbit" aria-hidden><span>{String(events.length).padStart(2, '0')}</span><span>events</span></div></article>
      <section className="today-agenda-card" aria-labelledby="today-agenda-title"><header><span><span className="eyebrow">Agenda</span><h2 id="today-agenda-title">Today&apos;s timeline</h2></span><Link to={`/calendar/day/${today}`} aria-label="Open today in Calendar"><CalendarDays aria-hidden /></Link></header>{events.length ? <ol>{events.slice(0, 4).map((event) => <li key={event.id}><i className={`today-agenda-card__dot today-agenda-card__dot--${event.colorToken}`} /><span><strong>{event.title}</strong><small>{formatCalendarEventTime(event, timeZone)}</small></span></li>)}</ol> : <p className="today-card-empty">No events today.</p>}</section>
      <TodayTasksCard />
      <section className="today-metrics" aria-label="Today progress"><article><CheckCircle2 aria-hidden /><strong>{metrics.tasksCompleted}</strong><small>tasks done</small></article><article><Leaf aria-hidden /><strong>{metrics.habitsCompleted}/{metrics.habitsScheduled}</strong><small>habits</small></article><article><TimerReset aria-hidden /><strong>{metrics.focusMinutes}</strong><small>focus min</small></article><article><Dumbbell aria-hidden /><strong>{metrics.workoutsCompleted}</strong><small>workouts</small></article></section>
      <div className="today-overview-grid"><Link className="today-overview-card today-overview-card--habits" to="/habits"><Leaf aria-hidden /><span><small>Habits</small><strong>{habits.scheduled.length ? `${habits.completed} of ${habits.scheduled.length} complete` : 'Nothing scheduled'}</strong></span><ArrowRight aria-hidden /></Link><TodayFocusCard /><Link className="today-overview-card today-overview-card--workout" to={activeWorkoutQuery.data ? '/workout/session/active' : '/workout/routines'}><Dumbbell aria-hidden /><span><small>{activeWorkoutQuery.data ? 'Workout in progress' : 'Workout'}</small><strong>{activeWorkoutQuery.data?.routineName ?? (routinesQuery.data?.length ? `${routinesQuery.data.length} routines ready` : 'Plan your first routine')}</strong></span>{activeWorkoutQuery.data ? <Play aria-hidden /> : <ArrowRight aria-hidden />}</Link></div>
    </div>}
  </section>
}
