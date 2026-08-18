import type { CreateFocusSessionInput, FocusPhase } from './types'

export interface TimerSnapshot {
  phase: FocusPhase
  startedAt: number | null
  pausedAt: number | null
  accumulatedPausedMs: number
  durationMs: number
  taskId: string | null
}

export interface PomodoroDurations {
  focusMs: number
  shortBreakMs: number
  longBreakMs: number
}

export const DEFAULT_POMODORO_DURATIONS: PomodoroDurations = {
  focusMs: 25 * 60_000,
  shortBreakMs: 5 * 60_000,
  longBreakMs: 15 * 60_000,
}

export const elapsedTimerMs = (timer: TimerSnapshot, now = Date.now()) => {
  if (timer.startedAt === null) return 0
  const effectiveNow = timer.pausedAt ?? now
  return Math.min(
    timer.durationMs,
    Math.max(0, effectiveNow - timer.startedAt - timer.accumulatedPausedMs),
  )
}

export const remainingTimerMs = (timer: TimerSnapshot, now = Date.now()) =>
  Math.max(0, timer.durationMs - elapsedTimerMs(timer, now))

export const formatTimer = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const nextPomodoroPhase = (phase: FocusPhase, cycleIndex: number) => {
  if (phase !== 'focus') return { phase: 'focus' as const, cycleIndex }
  const nextCycleIndex = cycleIndex + 1
  return {
    phase: nextCycleIndex % 4 === 0 ? 'long_break' as const : 'short_break' as const,
    cycleIndex: nextCycleIndex,
  }
}

export const durationForPhase = (phase: FocusPhase, durations: PomodoroDurations) => {
  if (phase === 'short_break') return durations.shortBreakMs
  if (phase === 'long_break') return durations.longBreakMs
  return durations.focusMs
}

export const sessionFromTimer = (
  timer: TimerSnapshot,
  now: number,
  completed: boolean,
): CreateFocusSessionInput | null => {
  if (timer.startedAt === null) return null
  const elapsedMs = elapsedTimerMs(timer, now)
  const elapsedSeconds = completed
    ? Math.round(timer.durationMs / 1000)
    : Math.floor(elapsedMs / 1000)
  if (elapsedSeconds === 0) return null

  return {
    taskId: timer.phase === 'focus' ? timer.taskId : null,
    startedAt: new Date(timer.startedAt).toISOString(),
    endedAt: new Date(Math.max(timer.startedAt, now)).toISOString(),
    plannedSeconds: Math.round(timer.durationMs / 1000),
    focusedSeconds: elapsedSeconds,
    sessionType: timer.phase,
    completed,
  }
}
