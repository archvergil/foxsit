import { describe, expect, it } from 'vitest'

import { calculateWorkoutSetMetrics, formatWeightKg } from './metrics'

describe('workout metrics', () => {
  it('calculates volume and Epley estimated one-rep max', () => {
    expect(calculateWorkoutSetMetrics({ weightKg: 100, reps: 5 })).toEqual({
      volumeKg: 500,
      estimatedOneRepMaxKg: 116.67,
    })
  })

  it('keeps a single repetition equal to its load', () => {
    expect(calculateWorkoutSetMetrics({ weightKg: 82.5, reps: 1 })).toEqual({
      volumeKg: 82.5,
      estimatedOneRepMaxKg: 82.5,
    })
  })

  it('supports bodyweight repetitions without inventing an external load', () => {
    expect(calculateWorkoutSetMetrics({ weightKg: null, reps: 12 })).toEqual({
      volumeKg: 0,
      estimatedOneRepMaxKg: null,
    })
    expect(formatWeightKg(1234.5)).toBe('1,234.5 kg')
  })
})
