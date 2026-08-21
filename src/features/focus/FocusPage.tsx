import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, BellOff, CirclePause, CirclePlay, RotateCcw, SkipForward, Square, TimerReset } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAuth } from '@/features/auth/authContext'
import { useTaskDateContext, useTaskList } from '@/features/tasks/queries'
import { FocusHistory } from './FocusHistory'
import { focusSummary } from './focusSummary'
import { notificationAvailability, requestFocusNotifications } from './notifications'
import { usePomodoroStore } from './pomodoroStore'
import { useAbandonRewardFocusRun, useCancelFocusPhase, useCreateFocusSession, useDeleteFocusSession, useFocusSessions, usePauseFocusPhase, useResumeFocusPhase, useScheduleFocusPhase, useStartRewardFocusRun } from './queries'
import { matchingRewardFocusMode, presetDurations, rewardFocusPresets } from './rewardFocusModes'
import { durationForPhase, formatTimer, remainingTimerMs, sessionFromTimer } from './timer'
import type { FocusPhase, RewardFocusMode } from './types'
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

export default function FocusPage() {
  const { session } = useAuth()
  const { timeZone } = useTaskDateContext()
  const [searchParams] = useSearchParams()
  const taskQuery = useTaskList({})
  const historyQuery = useFocusSessions({ limit: 200 })
  const saveSession = useCreateFocusSession()
  const deleteSession = useDeleteFocusSession()
  const startRewardRun = useStartRewardFocusRun()
  const abandonRewardRun = useAbandonRewardFocusRun()
  const schedulePhase = useScheduleFocusPhase()
  const pausePhase = usePauseFocusPhase()
  const resumePhase = useResumeFocusPhase()
  const cancelPhase = useCancelFocusPhase()
  const timer = usePomodoroStore()
  const active = timer.status !== 'idle' && timer.ownerUserId === session?.user.id
  const configurationLocked = active || Boolean(timer.rewardRunId)
  const activePhaseIndex = (Object.keys(phaseCopy) as FocusPhase[]).indexOf(timer.phase)
  const now = useTimerClock(active && timer.status === 'running')
  const remaining = remainingTimerMs(timer, now)
  const [selectedTaskId, setSelectedTaskId] = useState(() => searchParams.get('taskId') ?? '')
  const [notificationState, setNotificationState] = useState(notificationAvailability)
  const [rewardMode, setRewardMode] = useState<RewardFocusMode | null>(() => (
    timer.rewardRunId
      ? timer.rewardMode
      : matchingRewardFocusMode(timer)
  ))
  const [rewardDescription, setRewardDescription] = useState('')
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
      if (timer.scheduledPhaseId) {
        const status = await cancelPhase.mutateAsync(timer.scheduledPhaseId)
        if (status === 'completed') {
          timer.retryCompletion()
          return
        }
      } else if (input) await saveSession.mutateAsync(input)
      if (timer.rewardRunId) {
        await abandonRewardRun.mutateAsync(timer.rewardRunId)
        timer.clear()
      } else if (finish === 'skip') timer.finishPhase()
      else timer.clear()
    } catch {
      // Keep the current timer untouched until durable persistence succeeds.
    }
  }

  const discardExpired = async (finish: 'skip' | 'stop') => {
    try {
      if (timer.scheduledPhaseId) {
        const status = await cancelPhase.mutateAsync(timer.scheduledPhaseId)
        if (status === 'completed') {
          timer.retryCompletion()
          return
        }
      }
      if (timer.rewardRunId) {
        await abandonRewardRun.mutateAsync(timer.rewardRunId)
        timer.clear()
      } else if (finish === 'skip') timer.finishPhase()
      else timer.clear()
    } catch {
      // Keep the expired timer available until the rewarded run is durably abandoned.
    }
  }

  const configureCustom = form.handleSubmit((values) => {
    setRewardMode(null)
    timer.configure({
      focusMs: values.focus * 60_000,
      shortBreakMs: values.shortBreak * 60_000,
      longBreakMs: values.longBreak * 60_000,
    })
  })

  const startTimer = async () => {
    if (!session) return
    const taskId = timer.phase === 'focus' && taskQuery.data?.some(({ id, status }) => id === selectedTaskId && status === 'open')
      ? selectedTaskId
      : null
    let newlyCreatedRunId: string | null = null
    try {
      const startedAt = Date.now()
      if (timer.phase === 'focus' && rewardMode) {
        const runMode = timer.rewardRunId ? timer.rewardMode ?? rewardMode : rewardMode
        const preset = rewardFocusPresets.find(({ mode }) => mode === runMode)!
        const runId = timer.rewardRunId
          ?? await startRewardRun.mutateAsync({ mode: runMode, description: rewardDescription.trim() || null })
        if (!timer.rewardRunId) newlyCreatedRunId = runId
        const durations = presetDurations(preset)
        const scheduledPhaseId = await schedulePhase.mutateAsync({
          taskId,
          focusRunId: runId,
          startedAt: new Date(startedAt).toISOString(),
          plannedSeconds: Math.round(durationForPhase(timer.phase, durations) / 1000),
          sessionType: timer.phase,
        })
        timer.start({
          userId: session.user.id,
          taskId,
          now: startedAt,
          durations,
          rewardRunId: runId,
          rewardMode: runMode,
          rewardRequiredStacks: timer.rewardRunId ? timer.rewardRequiredStacks : preset.stacks,
          scheduledPhaseId,
        })
      } else {
        const scheduledPhaseId = await schedulePhase.mutateAsync({
          taskId,
          focusRunId: timer.rewardRunId,
          startedAt: new Date(startedAt).toISOString(),
          plannedSeconds: Math.round(durationForPhase(timer.phase, timer) / 1000),
          sessionType: timer.phase,
        })
        timer.start({ userId: session.user.id, taskId, now: startedAt, scheduledPhaseId })
      }
    } catch {
      if (newlyCreatedRunId) {
        try { await abandonRewardRun.mutateAsync(newlyCreatedRunId) } catch { /* Reconciliation can safely close the empty run later. */ }
      }
      // Start only after both the rewarded run and phase have durable server identity.
    }
  }

  const togglePause = async () => {
    try {
      if (timer.scheduledPhaseId) {
        const status = timer.status === 'paused'
          ? await resumePhase.mutateAsync(timer.scheduledPhaseId)
          : await pausePhase.mutateAsync(timer.scheduledPhaseId)
        if (status === 'completed') {
          timer.retryCompletion()
          return
        }
      }
      if (timer.status === 'paused') timer.resume()
      else timer.pause()
    } catch {
      // Preserve the client state unless the durable phase transition succeeds.
    }
  }

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
          <SegmentedControl activeIndex={activePhaseIndex} className="focus-phase-tabs" label="Timer phase" name="focus-phase" options={3}>
            {(Object.keys(phaseCopy) as FocusPhase[]).map((phase) => (
              <button
                type="button"
                key={phase}
                aria-pressed={timer.phase === phase}
                disabled={configurationLocked}
                onClick={() => timer.selectPhase(phase)}
              >
                {phaseCopy[phase].label}
              </button>
            ))}
          </SegmentedControl>

          <div className="focus-timer-card__clock">
            <span>{phaseCopy[timer.phase].label}</span>
            <strong aria-live="off">{formatTimer(active ? remaining : timer.durationMs)}</strong>
            <p>{active && timer.status === 'paused' ? 'Paused — your progress is safe.' : phaseCopy[timer.phase].helper}</p>
          </div>

          <div className="focus-timer-card__controls">
            {!active ? (
              <Button
                type="button"
                isLoading={startRewardRun.isPending || schedulePhase.isPending}
                onClick={() => void startTimer()}
              >
                <CirclePlay aria-hidden />Start timer
              </Button>
            ) : remaining === 0 ? (
              timer.completionStatus === 'error' ? (
                <>
                  <Button type="button" onClick={timer.retryCompletion}>
                    <RotateCcw aria-hidden />Retry save
                  </Button>
                  <Button variant="secondary" type="button" disabled={abandonRewardRun.isPending} onClick={() => void discardExpired('skip')}>
                    <SkipForward aria-hidden />Discard and continue
                  </Button>
                  <Button variant="quiet" type="button" disabled={abandonRewardRun.isPending} onClick={() => void discardExpired('stop')}>
                    <Square aria-hidden />Stop
                  </Button>
                </>
              ) : (
                <Button type="button" isLoading disabled>
                  Saving completed phase
                </Button>
              )
            ) : (
              <>
                <Button
                  type="button"
                  disabled={saveSession.isPending || pausePhase.isPending || resumePhase.isPending}
                  onClick={() => void togglePause()}
                >
                  {timer.status === 'paused' ? <CirclePlay aria-hidden /> : <CirclePause aria-hidden />}
                  {timer.status === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="secondary" type="button" disabled={saveSession.isPending || cancelPhase.isPending} onClick={() => void saveInterrupted('skip')}>
                  <SkipForward aria-hidden />Skip
                </Button>
                <Button variant="quiet" type="button" disabled={saveSession.isPending || cancelPhase.isPending} onClick={() => void saveInterrupted('stop')}>
                  <Square aria-hidden />Stop
                </Button>
              </>
            )}
          </div>
          {timer.completionStatus === 'error' || saveSession.error || schedulePhase.error || pausePhase.error || resumePhase.error || cancelPhase.error || startRewardRun.error || abandonRewardRun.error ? <p className="focus-timer-card__error" role="alert">The server confirmation was interrupted. Retry safely: the durable phase, session and reward are idempotent.</p> : null}
        </section>

        <aside className="focus-setup-card">
          <header><TimerReset aria-hidden /><span><strong>Session setup</strong><small>Changes apply before starting.</small></span></header>

          <div className="focus-presets" aria-label="Timer presets">
            {rewardFocusPresets.map((preset) => (
              <button
                type="button"
                key={preset.label}
                disabled={configurationLocked}
                aria-pressed={rewardMode === preset.mode}
                onClick={() => { setRewardMode(preset.mode); timer.configure(preset) }}
              >
                <strong>{preset.label}</strong><span>{preset.stacks} rewarded stacks</span>
              </button>
            ))}
          </div>

          <label className="focus-task-field">
            <span>Run description <small>optional · 500 characters earns +1 Silver</small></span>
            <textarea rows={4} maxLength={10000} disabled={configurationLocked || !rewardMode} value={rewardDescription} onChange={(event) => setRewardDescription(event.target.value)} placeholder="What will this complete run accomplish?" />
            {timer.rewardRunId ? <small>{timer.rewardCompletedStacks} of {timer.rewardRequiredStacks} focus stacks complete.</small> : null}
            {timer.rewardRunId && !active ? <Button variant="quiet" type="button" isLoading={abandonRewardRun.isPending} onClick={() => void saveInterrupted('stop')}>End rewarded run</Button> : null}
          </label>

          <label className="focus-task-field focus-task-field--link">
            <span>Link a task</span>
            <select
              value={selectedTaskId}
              disabled={active || taskQuery.isPending}
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
            <label><span>Focus</span><input type="number" disabled={configurationLocked} {...form.register('focus')} /></label>
            <label><span>Short</span><input type="number" disabled={configurationLocked} {...form.register('shortBreak')} /></label>
            <label><span>Long</span><input type="number" disabled={configurationLocked} {...form.register('longBreak')} /></label>
            <Button variant="secondary" type="submit" disabled={configurationLocked}>Apply</Button>
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
          deletingSessionId={deleteSession.isPending ? deleteSession.variables ?? null : null}
          onDelete={async (sessionId) => {
            await deleteSession.mutateAsync(sessionId)
          }}
        />
        {deleteSession.error ? <p className="focus-history__delete-error" role="alert">{deleteSession.error.message}</p> : null}
      </section>
    </section>
  )
}
