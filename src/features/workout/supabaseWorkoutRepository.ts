import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import type { WorkoutRepository } from './repository'
import {
  finishWorkoutSessionInputSchema,
  workoutActivityTypeSchema,
  workoutColorTokenSchema,
  workoutRoutineExerciseInputSchema,
  workoutRoutineInputSchema,
  saveWorkoutSetInputSchema,
} from './schemas'
import type { WorkoutRoutine, WorkoutRoutineExercise, WorkoutSession, WorkoutSessionExercise, WorkoutSet } from './types'

type RoutineRow = Database['public']['Tables']['workout_routines']['Row']
type ExerciseRow = Database['public']['Tables']['workout_routine_exercises']['Row']
type SessionRow = Database['public']['Tables']['workout_sessions']['Row']
type SessionExerciseRow = Database['public']['Tables']['workout_session_exercises']['Row']
type SetRow = Database['public']['Tables']['workout_sets']['Row']

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
  activityType: workoutActivityTypeSchema.parse(row.activity_type),
  bannerAsset: row.banner_asset,
  bannerMonochrome: row.banner_monochrome,
  position: row.position,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  exercises,
})

const mapSet = (row: SetRow): WorkoutSet => ({
  id: row.id,
  userId: row.user_id,
  sessionId: row.session_id,
  sessionExerciseId: row.session_exercise_id,
  setNumber: row.set_number,
  weightKg: row.weight_kg,
  reps: row.reps,
  rir: row.rir,
  completedAt: row.completed_at,
  volumeKg: row.volume_kg,
  estimatedOneRepMaxKg: row.estimated_1rm_kg,
  isPersonalRecord: row.is_personal_record,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapSessionExercise = (row: SessionExerciseRow, sets: WorkoutSet[]): WorkoutSessionExercise => ({
  id: row.id,
  userId: row.user_id,
  sessionId: row.session_id,
  sourceRoutineExerciseId: row.source_routine_exercise_id,
  exerciseKey: row.exercise_key ?? row.exercise_name.trim().toLowerCase(),
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
  sets,
})

const loadSessionRelations = async (
  client: SupabaseClient<Database>,
  userId: string,
  sessionRows: SessionRow[],
): Promise<WorkoutSession[]> => {
  if (sessionRows.length === 0) return []
  const sessionIds = sessionRows.map(({ id }) => id)
  const exerciseResult = await client.from('workout_session_exercises').select('*')
    .eq('user_id', userId).in('session_id', sessionIds)
    .order('position').order('created_at')
  const exerciseRows = assertData(exerciseResult.data, exerciseResult.error, 'load workout session exercises')
  const setResult = await client.from('workout_sets').select('*')
    .eq('user_id', userId).in('session_id', sessionIds)
    .order('set_number')
  const sets = assertData(setResult.data, setResult.error, 'load workout session sets').map(mapSet)
  const setsByExercise = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    const exerciseSets = setsByExercise.get(set.sessionExerciseId) ?? []
    exerciseSets.push(set)
    setsByExercise.set(set.sessionExerciseId, exerciseSets)
  }
  const exercisesBySession = new Map<string, WorkoutSessionExercise[]>()
  for (const row of exerciseRows) {
    const sessionExercises = exercisesBySession.get(row.session_id) ?? []
    sessionExercises.push(mapSessionExercise(row, setsByExercise.get(row.id) ?? []))
    exercisesBySession.set(row.session_id, sessionExercises)
  }
  return sessionRows.map((row) => mapSession(row, exercisesBySession.get(row.id) ?? []))
}

const mapSession = (row: SessionRow, exercises: WorkoutSessionExercise[]): WorkoutSession => ({
  id: row.id,
  userId: row.user_id,
  routineId: row.routine_id,
  routineName: row.routine_name,
  activityType: workoutActivityTypeSchema.parse(row.activity_type),
  status: row.status === 'completed' || row.status === 'cancelled' ? row.status : 'active',
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationSeconds: row.duration_seconds,
  notes: row.notes,
  completedSets: row.completed_sets,
  totalVolumeKg: row.total_volume_kg,
  bestEstimatedOneRepMaxKg: row.best_estimated_1rm_kg,
  personalRecords: row.personal_records,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  exercises,
})

const loadActiveSession = async (
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WorkoutSession | null> => {
  const sessionResult = await client.from('workout_sessions').select('*')
    .eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (sessionResult.error) throw new WorkoutRepositoryError('Could not load the active workout.', { cause: sessionResult.error })
  if (!sessionResult.data) return null

  return (await loadSessionRelations(client, userId, [sessionResult.data]))[0] ?? null
}

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
      activity_type: value.activityType,
      banner_asset: value.bannerAsset ?? null,
      banner_monochrome: value.bannerMonochrome ?? false,
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
      activity_type: value.activityType,
      banner_asset: value.bannerAsset ?? null,
      banner_monochrome: value.bannerMonochrome ?? false,
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

  getActiveSession: (userId) => loadActiveSession(client, userId),

  startSession: async (userId, routineId) => {
    const { data, error } = await client.rpc('start_workout_session', { p_routine_id: routineId })
    assertData(data, error, 'start the workout')
    const session = await loadActiveSession(client, userId)
    if (!session) throw new WorkoutRepositoryError('The workout started but could not be loaded.')
    return session
  },

  saveSet: async (userId, input) => {
    const value = saveWorkoutSetInputSchema.parse(input)
    const { data, error } = await client.from('workout_sets').update({
      weight_kg: value.weightKg,
      reps: value.reps,
      rir: value.rir,
      completed_at: new Date().toISOString(),
    }).eq('id', value.setId).eq('session_id', value.sessionId).eq('user_id', userId)
      .select('id').maybeSingle()
    assertData(data, error, 'save the workout set')
  },

  cancelSession: async (userId, sessionId, endedAt) => {
    const sessionResult = await client.from('workout_sessions').select('started_at')
      .eq('id', sessionId).eq('user_id', userId).eq('status', 'active').maybeSingle()
    const session = assertData(sessionResult.data, sessionResult.error, 'load the workout to discard')
    const durationSeconds = Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(session.started_at)) / 1000))
    const { data, error } = await client.from('workout_sessions').update({
      status: 'cancelled',
      ended_at: endedAt,
      duration_seconds: durationSeconds,
    }).eq('id', sessionId).eq('user_id', userId).eq('status', 'active').select('id').maybeSingle()
    assertData(data, error, 'discard the workout')
  },

  finishSession: async (_userId, input) => {
    const value = finishWorkoutSessionInputSchema.parse(input)
    const { data, error } = await client.rpc('finish_workout_session', {
      p_session_id: value.sessionId,
      p_notes: value.notes ?? '',
    })
    assertData(data, error, 'finish the workout')
  },

  listCompletedSessions: async (userId) => {
    const result = await client.from('workout_sessions').select('*')
      .eq('user_id', userId).eq('status', 'completed')
      .order('ended_at', { ascending: false }).limit(50)
    const rows = assertData(result.data, result.error, 'load workout history')
    return loadSessionRelations(client, userId, rows)
  },

  deleteCompletedSession: async (_userId, sessionId) => {
    const { data, error } = await client.rpc('delete_workout_session', { p_session_id: sessionId })
    assertData(data, error, 'delete the workout session')
  },
})
