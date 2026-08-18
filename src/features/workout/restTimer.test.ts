import { describe, expect, it } from 'vitest'

import { createWorkoutRestStore } from './workoutRestStore'
import { formatWorkoutDuration, remainingWorkoutRestMs } from './restTimer'

describe('workout rest timer', () => {
  it('derives remaining time from timestamps', () => {
    expect(remainingWorkoutRestMs({ startedAt: 10_000, durationMs: 90_000 }, 40_000)).toBe(60_000)
    expect(remainingWorkoutRestMs({ startedAt: 10_000, durationMs: 90_000 }, 110_000)).toBe(0)
  })

  it('formats workout and rest durations', () => {
    expect(formatWorkoutDuration(65_000)).toBe('01:05')
    expect(formatWorkoutDuration(3_665_000)).toBe('01:01:05')
  })

  it('restores the active rest timer after reload', () => {
    const first = createWorkoutRestStore(window.localStorage)
    first.getState().start({
      userId: 'user-1', sessionId: 'session-1', exerciseName: 'Squat', durationSeconds: 120, now: 20_000,
    })
    const restored = createWorkoutRestStore(window.localStorage)
    expect(restored.getState()).toMatchObject({
      ownerUserId: 'user-1', sessionId: 'session-1', exerciseName: 'Squat', startedAt: 20_000, durationMs: 120_000,
    })
  })
})
