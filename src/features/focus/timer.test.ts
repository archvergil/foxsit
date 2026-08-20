import { beforeEach, describe, expect, it } from 'vitest'

import { createPomodoroStore } from './pomodoroStore'
import {
  elapsedTimerMs,
  formatTimer,
  nextPomodoroPhase,
  remainingTimerMs,
  sessionFromTimer,
} from './timer'

describe('timestamp-based Pomodoro timer', () => {
  beforeEach(() => window.localStorage.clear())

  it('derives elapsed time from timestamps and excludes paused time', () => {
    const timer = {
      phase: 'focus' as const,
      startedAt: 1_000,
      pausedAt: null,
      accumulatedPausedMs: 3_000,
      durationMs: 25_000,
      taskId: null,
    }
    expect(elapsedTimerMs(timer, 14_000)).toBe(10_000)
    expect(remainingTimerMs(timer, 14_000)).toBe(15_000)
    expect(formatTimer(15_000)).toBe('00:15')
  })

  it('moves to a long break after every fourth completed focus', () => {
    expect(nextPomodoroPhase('focus', 0)).toEqual({ phase: 'short_break', cycleIndex: 1 })
    expect(nextPomodoroPhase('focus', 3)).toEqual({ phase: 'long_break', cycleIndex: 4 })
    expect(nextPomodoroPhase('long_break', 4)).toEqual({ phase: 'focus', cycleIndex: 4 })
  })

  it('persists the active timestamps and restores an honest remaining time', () => {
    const first = createPomodoroStore(window.localStorage)
    first.getState().configure({ focusMs: 60_000, shortBreakMs: 30_000, longBreakMs: 45_000 })
    first.getState().start({ userId: 'user-a', taskId: null, now: 10_000 })
    first.getState().pause(25_000)
    first.getState().resume(35_000)

    const restored = createPomodoroStore(window.localStorage)
    expect(restored.getState()).toMatchObject({
      ownerUserId: 'user-a',
      status: 'running',
      startedAt: 10_000,
      accumulatedPausedMs: 10_000,
      durationMs: 60_000,
    })
    expect(remainingTimerMs(restored.getState(), 55_000)).toBe(25_000)
  })

  it('builds completed and interrupted durable session records', () => {
    const timer = {
      phase: 'focus' as const,
      startedAt: Date.parse('2026-08-17T12:00:00.000Z'),
      pausedAt: null,
      accumulatedPausedMs: 10_000,
      durationMs: 60_000,
      taskId: '10000000-0000-4000-8000-000000000001',
    }
    expect(sessionFromTimer(timer, Date.parse('2026-08-17T12:01:10.000Z'), true)).toMatchObject({
      plannedSeconds: 60,
      focusedSeconds: 60,
      completed: true,
      taskId: timer.taskId,
    })
    expect(sessionFromTimer(timer, Date.parse('2026-08-17T12:00:40.000Z'), false)).toMatchObject({
      focusedSeconds: 30,
      completed: false,
    })
  })

  it('does not pause a timer after its timestamp duration has elapsed', () => {
    const store = createPomodoroStore(window.localStorage)
    store.getState().configure({ focusMs: 1_000, shortBreakMs: 1_000, longBreakMs: 1_000 })
    store.getState().start({ userId: 'user-a', now: 5_000 })
    store.getState().pause(6_000)
    expect(store.getState().status).toBe('running')
  })

  it('atomically applies the rewarded preset when a stale custom duration starts', () => {
    const store = createPomodoroStore(window.localStorage)
    store.getState().configure({ focusMs: 30_000, shortBreakMs: 7_000, longBreakMs: 9_000 })

    store.getState().start({
      userId: 'user-a',
      now: 5_000,
      durations: { focusMs: 25_000, shortBreakMs: 5_000, longBreakMs: 5_000 },
      rewardRunId: 'run-a',
      rewardMode: '25_5',
      rewardRequiredStacks: 3,
    })

    expect(store.getState()).toMatchObject({
      focusMs: 25_000,
      shortBreakMs: 5_000,
      longBreakMs: 5_000,
      durationMs: 25_000,
      rewardRunId: 'run-a',
    })
  })

  it('serializes completion attempts and exposes an explicit retry after failure', () => {
    const store = createPomodoroStore(window.localStorage)
    store.getState().start({ userId: 'user-a', now: 5_000 })

    expect(store.getState().claimCompletion(5_000)).toBe(true)
    expect(store.getState().claimCompletion(5_000)).toBe(false)
    store.getState().failCompletion(5_000)
    expect(store.getState().completionStatus).toBe('error')

    store.getState().retryCompletion()
    expect(store.getState()).toMatchObject({ completionStatus: 'idle', completionAttempt: 1 })
    expect(store.getState().claimCompletion(5_000)).toBe(true)
  })

  it('advances through focus, break and the next focus without losing the rewarded run', () => {
    const store = createPomodoroStore(window.localStorage)
    const durations = { focusMs: 25_000, shortBreakMs: 5_000, longBreakMs: 5_000 }
    store.getState().start({ userId: 'user-a', now: 1_000, durations, rewardRunId: 'run-a', rewardMode: '25_5', rewardRequiredStacks: 3 })
    store.getState().finishPhase(true)
    expect(store.getState()).toMatchObject({ phase: 'short_break', rewardRunId: 'run-a', rewardCompletedStacks: 1 })

    store.getState().start({ userId: 'user-a', now: 30_000 })
    store.getState().finishPhase()
    expect(store.getState()).toMatchObject({ phase: 'focus', rewardRunId: 'run-a', rewardCompletedStacks: 1 })

    store.getState().start({ userId: 'user-a', now: 40_000, durations, rewardRunId: 'run-a', rewardMode: '25_5', rewardRequiredStacks: 3 })
    expect(store.getState()).toMatchObject({ status: 'running', phase: 'focus', durationMs: 25_000, rewardRunId: 'run-a' })
  })
})
