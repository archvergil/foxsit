import { describe, expect, it } from 'vitest'

import type { WorkoutSet } from './types'
import { cascadeWorkoutSetDraft, workoutSetDraftFromSet } from './workoutSetDrafts'

const set = (id: string, setNumber: number, completedAt: string | null = null): WorkoutSet => ({
  id, userId: 'user-1', sessionId: 'session-1', sessionExerciseId: 'exercise-1', setNumber,
  weightKg: null, reps: null, rir: null, completedAt, volumeKg: null, estimatedOneRepMaxKg: null,
  isPersonalRecord: false, createdAt: '2026-08-19T12:00:00.000Z', updatedAt: '2026-08-19T12:00:00.000Z',
})

describe('cascadeWorkoutSetDraft', () => {
  it('copies an edited value to the current and subsequent incomplete sets', () => {
    const sets = [set('set-1', 1), set('set-2', 2), set('set-3', 3)]
    const drafts = Object.fromEntries(sets.map((item) => [item.id, workoutSetDraftFromSet(item)]))
    expect(cascadeWorkoutSetDraft(drafts, sets, 0, 'weight', '32')).toEqual({
      'set-1': { weight: '32', reps: '', rir: '' },
      'set-2': { weight: '32', reps: '', rir: '' },
      'set-3': { weight: '32', reps: '', rir: '' },
    })
  })

  it('starts at the edited row and does not overwrite a later completed set', () => {
    const sets = [set('set-1', 1), set('set-2', 2), set('set-3', 3, '2026-08-19T12:10:00.000Z')]
    const drafts = Object.fromEntries(sets.map((item) => [item.id, workoutSetDraftFromSet(item)]))
    const next = cascadeWorkoutSetDraft(drafts, sets, 1, 'reps', '8')
    expect(next['set-1']?.reps).toBe('')
    expect(next['set-2']?.reps).toBe('8')
    expect(next['set-3']?.reps).toBe('')
  })
})
