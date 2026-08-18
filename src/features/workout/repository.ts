import type {
  FinishWorkoutSessionInput,
  SaveWorkoutSetInput,
  WorkoutRoutine,
  WorkoutRoutineExercise,
  WorkoutRoutineExerciseInput,
  WorkoutRoutineInput,
  WorkoutSession,
} from './types'

export interface WorkoutRepository {
  listRoutines(userId: string): Promise<WorkoutRoutine[]>
  createRoutine(userId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine>
  updateRoutine(userId: string, routineId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine>
  deleteRoutine(userId: string, routineId: string): Promise<void>
  createExercise(userId: string, input: WorkoutRoutineExerciseInput): Promise<WorkoutRoutineExercise>
  deleteExercise(userId: string, exerciseId: string): Promise<void>
  getActiveSession(userId: string): Promise<WorkoutSession | null>
  startSession(userId: string, routineId: string): Promise<WorkoutSession>
  saveSet(userId: string, input: SaveWorkoutSetInput): Promise<void>
  cancelSession(userId: string, sessionId: string, endedAt: string): Promise<void>
  finishSession(userId: string, input: FinishWorkoutSessionInput): Promise<void>
  listCompletedSessions(userId: string): Promise<WorkoutSession[]>
}

export const workoutQueryKeys = {
  all: ['workout'] as const,
  routines: (userId: string) => ['workout', 'routines', userId] as const,
  activeSession: (userId: string) => ['workout', 'session', 'active', userId] as const,
  history: (userId: string) => ['workout', 'history', userId] as const,
}
