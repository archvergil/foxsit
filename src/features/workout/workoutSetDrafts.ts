import type { WorkoutSet } from './types'

export interface WorkoutSetDraft {
  weight: string
  reps: string
  rir: string
}

export const workoutSetDraftFromSet = (set: WorkoutSet): WorkoutSetDraft => ({
  weight: set.weightKg === null ? '' : String(set.weightKg),
  reps: set.reps === null ? '' : String(set.reps),
  rir: set.rir === null ? '' : String(set.rir),
})

export const cascadeWorkoutSetDraft = (
  current: Record<string, WorkoutSetDraft>,
  sets: WorkoutSet[],
  setIndex: number,
  field: keyof WorkoutSetDraft,
  value: string,
) => {
  const next = { ...current }
  const editedSet = sets[setIndex]
  if (!editedSet) return next
  for (const candidate of sets.slice(setIndex)) {
    if (candidate.completedAt && candidate.id !== editedSet.id) continue
    next[candidate.id] = { ...(next[candidate.id] ?? workoutSetDraftFromSet(candidate)), [field]: value }
  }
  return next
}

