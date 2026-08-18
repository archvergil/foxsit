import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, BellOff, CirclePause, CirclePlay, SkipForward, Square, TimerReset } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { useTaskDateContext, useTaskList } from '@/features/tasks/queries'
import { FocusHistory } from './FocusHistory'
import { focusSummary } from './focusSummary'
import { notificationAvailability, requestFocusNotifications } from './notifications'
import { usePomodoroStore } from './pomodoroStore'
import { useCreateFocusSession, useFocusSessions } from './queries'
import { formatTimer, remainingTimerMs, sessionFromTimer } from './timer'
import type { FocusPhase } from './types'
import { useTimerClock } from './useTimerClock'

const durationSchema = z.object({
  focus: z.coerce.number().int().min(1).max(180),
  shortBreak: z.coerce.number().int().min(1).max(60),
  longBreak: z.coerce.number().int().min(1).max(90),
})
type DurationForm = z.infer<typeof durationSchema>

const phaseCopy = {
  focus: { label: 'Focus', helper: 'Protect one clear block of attention.' },
  short_break: { label: 'Short break', helper: 'Step away briefly and reset.' },
  long_break: { label: 'Long break', helper: 'A longer reset after four focus blocks.' },
} as const

const presets = [
  { label: '25 / 5', focusMs: 25 * 60_000, shortBreakMs: 5 * 60_000, longBreakMs: 15 * 60_000 },
  { label: '50 / 10', focusMs: 50 * 60_000, shortBreakMs: 10 * 60_000, longBreakMs: 20 * 60_000 },
] as const

export default function FocusPage() {
  const { session } = useAuth()
  const { timeZone } = useTaskDateContext()
  const [searchParams] = useSearchParams()
  const [historyStartedAfter] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString())
  const taskQuery = useTaskList({})
  const historyQuery = useFocusSessions({ startedAfter: historyStartedAfter, limit: 200 })
  const saveSession = useCreateFocusSession()
  const timer = usePomodoroStore()
  const active = timer.status !== 'idle' && timer.ownerUserId === session?.user.id
  const now = useTimerClock(active && timer.status === 'running')
  const remaining = remainingTimerMs(timer, now)
  const [selectedTaskId, setSelectedTaskId] = useState(() => searchParams.get('taskId') ?? '')
  const [notificationState, setNotificationState] = useState(notificationAvailability)
  const summary = focusSummary(historyQuery.data ?? [], timeZone)
  const form = useForm<DurationForm>({
    resolver: zodResolver(durationSchema),
    defaultValues: {
      focus: Math.round(timer.focusMs / 60_000),
      shortBreak: Math.round(timer.shortBreakMs / 60_000),
      longBreak: Math.round(timer.longBreakMs / 60_000),
    },
  })

  const saveInterrupted = async (finish: 'skip' | 'stop') => {
    const input = sessionFromTimer(timer, Date.now(), false)
    try {
      if (input) await saveSession.mutateAsync(input)
      if (finish === 'skip') timer.finishPhase()
      else timer.clear()
    } catch {
      // Keep the current timer untouched until durable persistence succeeds.
    }
  }

  const configureCustom = form.handleSubmit((values) => timer.configure({
    focusMs: values.focus * 60_000,
    shortBreakMs: values.shortBreak * 60_000,
    longBreakMs: values.longBreak * 60_000,
  }))

  return (
    <section className="page-stack focus-page">
      <PageHeader
        eyebrow="Protect attention"
        title="Focus"
        description="A timestamp-based Pomodoro that stays accurate across reloads, sleep and background tabs."
        actions={
          <Button
            variant="secondary"
            type="button"
            disabled={notificationState === 'granted' || notificationState === 'denied' || notificationState === 'unavailable'}
            onClick={() => void requestFocusNotifications().then(setNotificationState)}
          >
            {notificationState === 'granted' ? <Bell aria-hidden /> : <BellOff aria-hidden />}
            {notificationState === 'granted' ? 'Alerts on' : notificationState === 'denied' ? 'Alerts blocked' : 'Enable alerts'}
          </Button>
        }
      />

      <div className="focus-layout">
        <section className={`focus-timer-card focus-timer-card--${timer.phase}`} aria-label="Pomodoro timer">
          <div className="segmented-control focus-phase-tabs" aria-label="Timer phase">
            {(Object.keys(phaseCopy) as FocusPhase[]).map((phase) => (
              <button
                type="button"
                key={phase}
                aria-pressed={timer.phase === phase}
                disabled={active}
                onClick={() => timer.selectPhase(phase)}
              >
                {phaseCopy[phase].label}
              </button>
            ))}
          </div>

          <div className="focus-timer-card__clock">
            <span>{phaseCopy[timer.phase].label}</span>
            <strong aria-live="off">{formatTimer(active ? remaining : timer.durationMs)}</strong>
            <p>{active && timer.status === 'paused' ? 'Paused — your progress is safe.' : phaseCopy[timer.phase].helper}</p>
          </div>

          <div className="focus-timer-card__controls">
            {!active ? (
              <Button
                type="button"
                onClick={() => session && timer.start({
                  userId: session.user.id,
                  taskId: timer.phase === 'focus' && taskQuery.data?.some(({ id, status }) => id === selectedTaskId && status === 'open')
                    ? selectedTaskId
                    : null,
                })}
              >
                <CirclePlay aria-hidden />Start timer
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={remaining === 0 || saveSession.isPending}
                  onClick={() => timer.status === 'paused' ? timer.resume() : timer.pause()}
                >
                  {timer.status === 'paused' ? <CirclePlay aria-hidden /> : <CirclePause aria-hidden />}
                  {timer.status === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="secondary" type="button" disabled={remaining === 0 || saveSession.isPending} onClick={() => void saveInterrupted('skip')}>
                  <SkipForward aria-hidden />Skip
                </Button>
                <Button variant="quiet" type="button" disabled={remaining === 0 || saveSession.isPending} onClick={() => void saveInterrupted('stop')}>
                  <Square aria-hidden />Stop
                </Button>
              </>
            )}
          </div>
          {saveSession.error ? <p className="focus-timer-card__error" role="alert">The session was not saved. Your timer is still here; try again.</p> : null}
        </section>

        <aside className="focus-setup-card">
          <header><TimerReset aria-hidden /><span><strong>Session setup</strong><small>Changes apply before starting.</small></span></header>

          <div className="focus-presets" aria-label="Timer presets">
            {presets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                disabled={active}
                aria-pressed={timer.focusMs === preset.focusMs && timer.shortBreakMs === preset.shortBreakMs}
                onClick={() => timer.configure(preset)}
              >
                <strong>{preset.label}</strong><span>focus / break</span>
              </button>
            ))}
          </div>

          <label className="focus-task-field">
            <span>Link a task</span>
            <select
              value={selectedTaskId}
              disabled={active || timer.phase !== 'focus' || taskQuery.isPending}
              onChange={(event) => setSelectedTaskId(event.target.value)}
            >
              <option value="">No linked task</option>
              {taskQuery.data?.filter(({ status }) => status === 'open').map((task) => (
                <option value={task.id} key={task.id}>{task.title}</option>
              ))}
            </select>
            {taskQuery.error ? <small role="alert">Tasks are unavailable; you can still start without one.</small> : null}
          </label>

          <form className="focus-custom-form" onSubmit={(event) => void configureCustom(event)}>
            <span className="focus-custom-form__label">Custom minutes</span>
            <label><span>Focus</span><input type="number" disabled={active} {...form.register('focus')} /></label>
            <label><span>Short</span><input type="number" disabled={active} {...form.register('shortBreak')} /></label>
            <label><span>Long</span><input type="number" disabled={active} {...form.register('longBreak')} /></label>
            <Button variant="secondary" type="submit" disabled={active}>Apply</Button>
            {Object.keys(form.formState.errors).length ? <small className="focus-custom-form__error" role="alert">Use whole minutes within the allowed range.</small> : null}
          </form>
        </aside>
      </div>

      <section className="focus-insights" aria-label="Focus summary">
        <article><span>Today</span><strong>{summary.todayMinutes}</strong><small>focused minutes</small></article>
        <article><span>Last 7 days</span><strong>{summary.weekMinutes}</strong><small>focused minutes</small></article>
        <article><span>Completed</span><strong>{summary.completedCount}</strong><small>focus sessions</small></article>
      </section>

      <section className="focus-history">
        <header><span><span className="eyebrow">Durable records</span><h2>Recent sessions</h2></span></header>
        {summary.taskTotals.length ? (
          <div className="focus-task-totals" aria-label="Focused minutes by task">
            {summary.taskTotals.slice(0, 4).map((total) => (
              <span key={total.taskId}>
                <small>{taskQuery.data?.find(({ id }) => id === total.taskId)?.title ?? 'Linked task'}</small>
                <strong>{total.minutes} min</strong>
              </span>
            ))}
          </div>
        ) : null}
        <FocusHistory
          sessions={historyQuery.data}
          tasks={taskQuery.data ?? []}
          timeZone={timeZone}
          isLoading={historyQuery.isPending}
          error={historyQuery.error}
          onRetry={() => void historyQuery.refetch()}
        />
      </section>
    </section>
  )
}
