import { CirclePause, CirclePlay, RotateCcw, TimerReset } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/authContext'
import { persistCompletedTimerPhase } from './completeTimerPhase'
import { notifyPhaseComplete } from './notifications'
import { usePomodoroStore } from './pomodoroStore'
import { useCompleteRewardFocusRun, useCreateFocusSession, usePauseFocusPhase, useResumeFocusPhase, useSettleFocusPhase } from './queries'
import { formatTimer, remainingTimerMs } from './timer'
import { useTimerClock } from './useTimerClock'

const phaseLabel = {
  focus: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break',
} as const

export function ActiveFocusPlayer() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const timer = usePomodoroStore()
  const createSession = useCreateFocusSession()
  const completeRewardRun = useCompleteRewardFocusRun()
  const settlePhase = useSettleFocusPhase()
  const pausePhase = usePauseFocusPhase()
  const resumePhase = useResumeFocusPhase()
  const owned = Boolean(session && timer.ownerUserId === session.user.id)
  const active = owned && timer.status !== 'idle'
  const now = useTimerClock(active && timer.status === 'running')
  const remaining = remainingTimerMs(timer, now)

  useEffect(() => {
    if (timer.ownerUserId && session && timer.ownerUserId !== session.user.id) timer.clear()
  }, [session, timer])

  const persistCompletion = useCallback(async () => {
    if (!owned || timer.startedAt === null) return
    const startedAt = timer.startedAt
    if (!timer.claimCompletion(startedAt)) return
    try {
      const completedRewardStack = await persistCompletedTimerPhase({
        timer,
        saveSession: createSession.mutateAsync,
        settleScheduledPhase: settlePhase.mutateAsync,
        completeRewardRun: completeRewardRun.mutateAsync,
      })
      void notifyPhaseComplete(timer.phase).catch(() => undefined)
      timer.finishPhase(completedRewardStack)
    } catch {
      timer.failCompletion(startedAt)
    }
  }, [completeRewardRun, createSession, owned, settlePhase, timer])

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
      // Keep the local phase unchanged until the durable transition succeeds.
    }
  }

  useEffect(() => {
    if (
      active &&
      timer.status === 'running' &&
      remaining === 0 &&
      timer.startedAt !== null &&
      timer.completionStatus === 'idle'
    ) {
      void persistCompletion()
    }
  }, [active, persistCompletion, remaining, timer.completionAttempt, timer.completionStatus, timer.startedAt, timer.status])

  if (!active) return null

  return (
    <aside className={`focus-mini-player${pathname === '/focus' ? ' focus-mini-player--focus-page' : ''}`} aria-label="Active focus timer">
      <Link className="focus-mini-player__main" to="/focus">
        <span className="focus-mini-player__icon"><TimerReset aria-hidden /></span>
        <span>
          <small>{phaseLabel[timer.phase]}</small>
          <strong aria-live="off">{formatTimer(remaining)}</strong>
        </span>
      </Link>
      {timer.completionStatus === 'error' ? (
        <button
          className="focus-mini-player__control"
          type="button"
          aria-label="Retry saving completed timer"
          onClick={timer.retryCompletion}
        >
          <RotateCcw aria-hidden />
        </button>
      ) : (
        <button
          className="focus-mini-player__control"
          type="button"
          aria-label={timer.status === 'paused' ? 'Resume timer' : 'Pause timer'}
          disabled={remaining === 0 || pausePhase.isPending || resumePhase.isPending}
          onClick={() => void togglePause()}
        >
          {timer.status === 'paused' ? <CirclePlay aria-hidden /> : <CirclePause aria-hidden />}
        </button>
      )}
    </aside>
  )
}
