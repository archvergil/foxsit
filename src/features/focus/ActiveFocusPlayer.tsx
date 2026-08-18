import { CirclePause, CirclePlay, RotateCcw, TimerReset } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/authContext'
import { notifyPhaseComplete } from './notifications'
import { usePomodoroStore } from './pomodoroStore'
import { useCompleteRewardFocusRun, useCreateFocusSession } from './queries'
import { formatTimer, remainingTimerMs, sessionFromTimer } from './timer'
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
  const attemptedStartRef = useRef<number | null>(null)
  const owned = Boolean(session && timer.ownerUserId === session.user.id)
  const active = owned && timer.status !== 'idle'
  const now = useTimerClock(active && timer.status === 'running')
  const remaining = remainingTimerMs(timer, now)

  useEffect(() => {
    if (timer.ownerUserId && session && timer.ownerUserId !== session.user.id) timer.clear()
  }, [session, timer])

  const persistCompletion = useCallback(async () => {
    if (!owned || timer.startedAt === null) return
    attemptedStartRef.current = timer.startedAt
    const input = sessionFromTimer(timer, Date.now(), true)
    if (!input) {
      timer.finishPhase()
      return
    }
    try {
      await createSession.mutateAsync(input)
      const completedRewardStack = timer.phase === 'focus' && Boolean(timer.rewardRunId)
      if (completedRewardStack && timer.rewardRunId && timer.rewardCompletedStacks + 1 >= timer.rewardRequiredStacks) {
        await completeRewardRun.mutateAsync(timer.rewardRunId)
      }
      notifyPhaseComplete(timer.phase)
      timer.finishPhase(completedRewardStack)
    } catch {
      // Keep the expired timer available for an explicit retry.
    }
  }, [completeRewardRun, createSession, owned, timer])

  useEffect(() => {
    if (
      active &&
      timer.status === 'running' &&
      remaining === 0 &&
      timer.startedAt !== null &&
      attemptedStartRef.current !== timer.startedAt
    ) {
      void persistCompletion()
    }
  }, [active, persistCompletion, remaining, timer.startedAt, timer.status])

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
      {createSession.error || completeRewardRun.error ? (
        <button
          className="focus-mini-player__control"
          type="button"
          aria-label="Retry saving completed timer"
          onClick={() => {
            attemptedStartRef.current = null
            void persistCompletion()
          }}
        >
          <RotateCcw aria-hidden />
        </button>
      ) : (
        <button
          className="focus-mini-player__control"
          type="button"
          aria-label={timer.status === 'paused' ? 'Resume timer' : 'Pause timer'}
          disabled={remaining === 0}
          onClick={() => timer.status === 'paused' ? timer.resume() : timer.pause()}
        >
          {timer.status === 'paused' ? <CirclePlay aria-hidden /> : <CirclePause aria-hidden />}
        </button>
      )}
    </aside>
  )
}
