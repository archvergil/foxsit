import { describe, expect, it } from 'vitest'

import {
  finishWorkoutSessionInputSchema,
  resolveWorkoutExerciseForm,
  resolveWorkoutRoutineForm,
  saveWorkoutSetInputSchema,
  workoutExerciseFormSchema,
} from './schemas'

describe('workout schemas', () => {
  it('normalizes optional routine text before persistence', () => {
    expect(resolveWorkoutRoutineForm({
      name: '  Upper body  ',
      description: '   ',
      colorToken: 'coral',
      activityType: 'strength',
      bannerAsset: '',
      bannerMonochrome: false,
    })).toEqual({
      name: 'Upper body', description: null, colorToken: 'coral', activityType: 'strength',
      bannerAsset: null, bannerMonochrome: false,
    })
  })

  it('accepts only Workout GIFs in routine banners', () => {
    expect(resolveWorkoutRoutineForm({
      name: 'Leg day', description: '', colorToken: 'coral', activityType: 'cardio',
      bannerAsset: 'workout_9.gif', bannerMonochrome: true,
    })).toMatchObject({ bannerAsset: 'workout_9.gif', bannerMonochrome: true })
    expect(() => resolveWorkoutRoutineForm({
      name: 'Leg day', description: '', colorToken: 'coral', activityType: 'strength',
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
    expect(resolveWorkoutExerciseForm('31fb2733-62ca-4b36-a68f-fdf6423a3809', {
      exerciseName: '  Romanian deadlift ', muscleGroup: '  Hamstrings ', targetSets: 3,
      targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120, notes: ' ',
    })).toMatchObject({
      exerciseName: 'Romanian deadlift', muscleGroup: 'Hamstrings', notes: null,
      targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120,
    })
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
