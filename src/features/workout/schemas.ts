import { z } from 'zod'

import { workoutBannerAssetIds } from '@/lib/bannerAssets'
import type { FinishWorkoutSessionInput, RenameWorkoutSessionExerciseInput, SaveWorkoutSetInput, WorkoutRoutineExerciseInput, WorkoutRoutineInput } from './types'

export const workoutColorTokenSchema = z.enum(['mint', 'coral', 'blue', 'sand', 'slate'])
export const workoutActivityTypeSchema = z.enum(['strength', 'cardio'])
export const workoutBannerAssetSchema = z.string().refine(
  (value) => workoutBannerAssetIds.includes(value),
  'Choose a valid workout banner.',
)

export const workoutRoutineInputSchema = z.object({
  name: z.string().trim().min(1, 'Routine name is required.').max(120),
  description: z.string().trim().max(5000).nullable(),
  colorToken: workoutColorTokenSchema,
  activityType: workoutActivityTypeSchema,
  bannerAsset: workoutBannerAssetSchema.nullable().optional(),
  bannerMonochrome: z.boolean().optional(),
})

export const workoutRoutineExerciseInputSchema = z.object({
  routineId: z.string().uuid(),
  exerciseName: z.string().trim().min(1, 'Exercise name is required.').max(160),
  muscleGroup: z.string().trim().min(1).max(80).nullable(),
  targetSets: z.number().int().min(1).max(20),
  targetRepsMin: z.number().int().min(1).max(100),
  targetRepsMax: z.number().int().min(1).max(100),
  restSeconds: z.number().int().min(0).max(3600),
  notes: z.string().trim().max(2000).nullable(),
}).refine((value) => value.targetRepsMax >= value.targetRepsMin, {
  path: ['targetRepsMax'],
  message: 'Maximum reps cannot be lower than minimum reps.',
})

export const workoutRoutineFormSchema = z.object({
  name: z.string().trim().min(1, 'Routine name is required.').max(120),
  description: z.string().max(5000),
  colorToken: workoutColorTokenSchema,
  activityType: workoutActivityTypeSchema,
  bannerAsset: z.union([workoutBannerAssetSchema, z.literal('')]),
  bannerMonochrome: z.boolean(),
})

export type WorkoutRoutineFormValues = z.infer<typeof workoutRoutineFormSchema>

export const resolveWorkoutRoutineForm = (values: WorkoutRoutineFormValues): WorkoutRoutineInput =>
  workoutRoutineInputSchema.parse({
    name: values.name,
    description: values.description.trim() || null,
    colorToken: values.colorToken,
    activityType: values.activityType,
    bannerAsset: values.bannerAsset || null,
    bannerMonochrome: values.bannerMonochrome,
  })

export const workoutExerciseFormSchema = z.object({
  exerciseName: z.string().trim().min(1, 'Exercise name is required.').max(160),
  muscleGroup: z.string().max(80),
  targetSets: z.number().int().min(1).max(20),
  targetRepsMin: z.number().int().min(1).max(100),
  targetRepsMax: z.number().int().min(1).max(100),
  restSeconds: z.number().int().min(0).max(3600),
  notes: z.string().max(2000),
}).refine((value) => value.targetRepsMax >= value.targetRepsMin, {
  path: ['targetRepsMax'],
  message: 'Maximum reps cannot be lower than minimum reps.',
})

export type WorkoutExerciseFormValues = z.infer<typeof workoutExerciseFormSchema>

export const resolveWorkoutExerciseForm = (
  routineId: string,
  values: WorkoutExerciseFormValues,
): WorkoutRoutineExerciseInput => workoutRoutineExerciseInputSchema.parse({
  routineId,
  exerciseName: values.exerciseName,
  muscleGroup: values.muscleGroup.trim() || null,
  targetSets: values.targetSets,
  targetRepsMin: values.targetRepsMin,
  targetRepsMax: values.targetRepsMax,
  restSeconds: values.restSeconds,
  notes: values.notes.trim() || null,
})

export const saveWorkoutSetInputSchema = z.object({
  sessionId: z.string().uuid(),
  setId: z.string().uuid(),
  weightKg: z.number().min(0).max(10000).nullable(),
  reps: z.number().int().min(1, 'Enter at least one rep.').max(1000),
  rir: z.number().int().min(0).max(10).nullable(),
}) satisfies z.ZodType<SaveWorkoutSetInput>

export const renameWorkoutSessionExerciseInputSchema = z.object({
  sessionExerciseId: z.string().uuid(),
  exerciseName: z.string().trim().min(1, 'Exercise name is required.').max(160),
}) satisfies z.ZodType<RenameWorkoutSessionExerciseInput>

export const finishWorkoutSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().trim().max(5000).nullable(),
}) satisfies z.ZodType<FinishWorkoutSessionInput>
