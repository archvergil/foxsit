import { describe, expect, it } from 'vitest'

import {
  finishWorkoutSessionInputSchema,
  resolveWorkoutExerciseForm,
  resolveWorkoutRoutineForm,
  saveWorkoutSetInputSchema,
  workoutExerciseFormSchema,
  workoutRoutineExerciseInputSchema,
} from './schemas'

describe('workout schemas', () => {
  it('normalizes optional routine text before persistence', () => {
    expect(resolveWorkoutRoutineForm({
      name: '  Upper body  ',
      description: '   ',
      colorToken: 'coral',
      activityType: 'strength',
      crossfitTimeCapMinutes: 20,
      bannerAsset: '',
      bannerMonochrome: false,
    })).toEqual({
      name: 'Upper body', description: null, colorToken: 'coral', activityType: 'strength', crossfitTimeCapSeconds: null,
      bannerAsset: null, bannerMonochrome: false,
    })
  })

  it('accepts only Workout GIFs in routine banners', () => {
    expect(resolveWorkoutRoutineForm({
      name: 'Leg day', description: '', colorToken: 'coral', activityType: 'cardio',
      crossfitTimeCapMinutes: 20,
      bannerAsset: 'workout_9.gif', bannerMonochrome: true,
    })).toMatchObject({ bannerAsset: 'workout_9.gif', bannerMonochrome: true })
    expect(() => resolveWorkoutRoutineForm({
      name: 'Leg day', description: '', colorToken: 'coral', activityType: 'strength',
      crossfitTimeCapMinutes: 20,
      bannerAsset: 'habits_1.gif', bannerMonochrome: false,
    })).toThrow()
  })

  it('rejects a rep range whose maximum is below its minimum', () => {
    const result = workoutExerciseFormSchema.safeParse({
      exerciseName: 'Bench press', muscleGroup: '', targetSets: 3,
      targetRepsMin: 12, targetRepsMax: 8, restSeconds: 90, notes: '',
    })
    expect(result.success).toBe(false)
  })

  it('enforces the supported sets and rest limits', () => {
    const result = workoutExerciseFormSchema.safeParse({
      exerciseName: 'Squat', muscleGroup: 'Legs', targetSets: 21,
      targetRepsMin: 5, targetRepsMax: 8, restSeconds: 3601, notes: '',
    })
    expect(result.success).toBe(false)
  })

  it('normalizes optional exercise fields for Supabase', () => {
    expect(resolveWorkoutExerciseForm('31fb2733-62ca-4b36-a68f-fdf6423a3809', 'strength', {
      exerciseName: '  Romanian deadlift ', muscleGroup: '  Hamstrings ', targetSets: 3,
      targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120, notes: ' ',
      crossfitUsesWeight: false, crossfitWeightKg: null, crossfitReps: null,
    })).toMatchObject({
      exerciseName: 'Romanian deadlift', muscleGroup: 'Hamstrings', notes: null,
      targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120,
    })
  })

  it('normalizes a CrossFit AMRAP and its optional-weight movement contract', () => {
    expect(resolveWorkoutRoutineForm({
      name: '  Cindy  ', description: '', colorToken: 'slate', activityType: 'crossfit',
      crossfitTimeCapMinutes: 20, bannerAsset: 'workout_1.gif', bannerMonochrome: true,
    })).toMatchObject({
      name: 'Cindy', activityType: 'crossfit', crossfitTimeCapSeconds: 1200,
    })

    expect(resolveWorkoutExerciseForm('31fb2733-62ca-4b36-a68f-fdf6423a3809', 'crossfit', {
      exerciseName: 'Pull-up', muscleGroup: '', targetSets: 3, targetRepsMin: 8,
      targetRepsMax: 12, restSeconds: 90, notes: '', crossfitUsesWeight: false,
      crossfitWeightKg: 20, crossfitReps: 5,
    })).toMatchObject({
      activityType: 'crossfit', crossfitUsesWeight: false, crossfitWeightKg: null, crossfitReps: 5,
    })
  })

  it('rejects contradictory CrossFit movement fields before persistence', () => {
    const base = {
      routineId: '31fb2733-62ca-4b36-a68f-fdf6423a3809', exerciseName: 'Pull-up', muscleGroup: null,
      targetSets: 1, targetRepsMin: 1, targetRepsMax: 1, restSeconds: 0, notes: null,
      crossfitUsesWeight: false, crossfitWeightKg: 20, crossfitReps: 5,
    }
    expect(workoutRoutineExerciseInputSchema.safeParse({
      ...base, activityType: 'crossfit',
    }).success).toBe(false)
    expect(workoutRoutineExerciseInputSchema.safeParse({
      ...base, activityType: 'strength', crossfitUsesWeight: true,
    }).success).toBe(false)
  })

  it('accepts a durable completed set with optional load and RIR', () => {
    expect(saveWorkoutSetInputSchema.parse({
      sessionId: '31fb2733-62ca-4b36-a68f-fdf6423a3809',
      setId: '41fb2733-62ca-4b36-a68f-fdf6423a3809',
      weightKg: null,
      reps: 12,
      rir: 2,
    })).toMatchObject({ reps: 12, weightKg: null, rir: 2 })
  })

  it('rejects zero repetitions and RIR outside the supported range', () => {
    const result = saveWorkoutSetInputSchema.safeParse({
      sessionId: '31fb2733-62ca-4b36-a68f-fdf6423a3809',
      setId: '41fb2733-62ca-4b36-a68f-fdf6423a3809',
      weightKg: 40,
      reps: 0,
      rir: 11,
    })
    expect(result.success).toBe(false)
  })

  it('validates completion notes before calling the transaction', () => {
    expect(finishWorkoutSessionInputSchema.parse({
      sessionId: '31fb2733-62ca-4b36-a68f-fdf6423a3809',
      notes: '  Strong session  ',
    })).toEqual({
      sessionId: '31fb2733-62ca-4b36-a68f-fdf6423a3809',
      notes: 'Strong session',
    })
  })
})
