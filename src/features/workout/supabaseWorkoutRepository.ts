import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import type { WorkoutRepository } from './repository'
import {
  workoutColorTokenSchema,
  workoutRoutineExerciseInputSchema,
  workoutRoutineInputSchema,
} from './schemas'
import type { WorkoutRoutine, WorkoutRoutineExercise } from './types'

type RoutineRow = Database['public']['Tables']['workout_routines']['Row']
type ExerciseRow = Database['public']['Tables']['workout_routine_exercises']['Row']

export class WorkoutRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WorkoutRepositoryError'
  }
}

const assertData = <T>(data: T | null, error: unknown, action: string): T => {
  if (error || data === null) throw new WorkoutRepositoryError(`Could not ${action}.`, { cause: error })
  return data
}

const mapExercise = (row: ExerciseRow): WorkoutRoutineExercise => ({
  id: row.id,
  userId: row.user_id,
  routineId: row.routine_id,
  exerciseName: row.exercise_name,
  muscleGroup: row.muscle_group,
  position: row.position,
  targetSets: row.target_sets,
  targetRepsMin: row.target_reps_min,
  targetRepsMax: row.target_reps_max,
  restSeconds: row.rest_seconds,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapRoutine = (row: RoutineRow, exercises: WorkoutRoutineExercise[] = []): WorkoutRoutine => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  description: row.description,
  colorToken: workoutColorTokenSchema.parse(row.color_token),
  position: row.position,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  exercises,
})

export const createSupabaseWorkoutRepository = (
  client: SupabaseClient<Database>,
): WorkoutRepository => ({
  listRoutines: async (userId) => {
    const routineResult = await client.from('workout_routines').select('*')
      .eq('user_id', userId).is('archived_at', null)
      .order('position').order('created_at')
    const rows = assertData(routineResult.data, routineResult.error, 'load workout routines')
    if (rows.length === 0) return []

    const exerciseResult = await client.from('workout_routine_exercises').select('*')
      .eq('user_id', userId).in('routine_id', rows.map(({ id }) => id))
      .order('position').order('created_at')
    const exercises = assertData(exerciseResult.data, exerciseResult.error, 'load routine exercises').map(mapExercise)
    const exercisesByRoutine = new Map<string, WorkoutRoutineExercise[]>()
    for (const exercise of exercises) {
      const routineExercises = exercisesByRoutine.get(exercise.routineId) ?? []
      routineExercises.push(exercise)
      exercisesByRoutine.set(exercise.routineId, routineExercises)
    }
    return rows.map((row) => mapRoutine(row, exercisesByRoutine.get(row.id) ?? []))
  },

  createRoutine: async (userId, input) => {
    const value = workoutRoutineInputSchema.parse(input)
    const { data, error } = await client.from('workout_routines').insert({
      user_id: userId,
      name: value.name,
      description: value.description,
      color_token: value.colorToken,
      position: Date.now(),
    }).select('*').single()
    return mapRoutine(assertData(data, error, 'create the workout routine'))
  },

  updateRoutine: async (userId, routineId, input) => {
    const value = workoutRoutineInputSchema.parse(input)
    const { data, error } = await client.from('workout_routines').update({
      name: value.name,
      description: value.description,
      color_token: value.colorToken,
    }).eq('id', routineId).eq('user_id', userId).select('*').single()
    return mapRoutine(assertData(data, error, 'update the workout routine'))
  },

  deleteRoutine: async (userId, routineId) => {
    const { data, error } = await client.from('workout_routines').delete()
      .eq('id', routineId).eq('user_id', userId).select('id').maybeSingle()
    assertData(data, error, 'delete the workout routine')
  },

  createExercise: async (userId, input) => {
    const value = workoutRoutineExerciseInputSchema.parse(input)
    const positionResult = await client.from('workout_routine_exercises').select('position')
      .eq('user_id', userId).eq('routine_id', value.routineId)
      .order('position', { ascending: false }).limit(1).maybeSingle()
    if (positionResult.error) {
      throw new WorkoutRepositoryError('Could not determine the exercise position.', { cause: positionResult.error })
    }
    const { data, error } = await client.from('workout_routine_exercises').insert({
      user_id: userId,
      routine_id: value.routineId,
      exercise_name: value.exerciseName,
      muscle_group: value.muscleGroup,
      target_sets: value.targetSets,
      target_reps_min: value.targetRepsMin,
      target_reps_max: value.targetRepsMax,
      rest_seconds: value.restSeconds,
      notes: value.notes,
      position: (positionResult.data?.position ?? 0) + 1000,
    }).select('*').single()
    return mapExercise(assertData(data, error, 'add the exercise'))
  },

  deleteExercise: async (userId, exerciseId) => {
    const { data, error } = await client.from('workout_routine_exercises').delete()
      .eq('id', exerciseId).eq('user_id', userId).select('id').maybeSingle()
    assertData(data, error, 'remove the exercise')
  },
})
