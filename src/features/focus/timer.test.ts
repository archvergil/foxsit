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
})
