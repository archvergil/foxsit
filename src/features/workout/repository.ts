import type {
  FinishWorkoutSessionInput,
  CrossfitRoundResult,
  RenameWorkoutSessionExerciseInput,
  SaveWorkoutSetInput,
  WorkoutRoutine,
  WorkoutRoutineExercise,
  WorkoutRoutineExerciseInput,
  WorkoutRoutineInput,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
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
  saveSet(userId: string, input: SaveWorkoutSetInput): Promise<WorkoutSet>
  renameSessionExercise(userId: string, input: RenameWorkoutSessionExerciseInput): Promise<WorkoutSessionExercise>
  cancelSession(userId: string, sessionId: string, endedAt: string): Promise<void>
  finishSession(userId: string, input: FinishWorkoutSessionInput): Promise<void>
  incrementCrossfitRound(userId: string, sessionId: string): Promise<CrossfitRoundResult>
  settleCrossfitSession(userId: string, sessionId: string): Promise<void>
  listCompletedSessions(userId: string): Promise<WorkoutSession[]>
  deleteCompletedSession(userId: string, sessionId: string): Promise<void>
}

export const workoutQueryKeys = {
  all: ['workout'] as const,
  routines: (userId: string) => ['workout', 'routines', userId] as const,
  activeSession: (userId: string) => ['workout', 'session', 'active', userId] as const,
  history: (userId: string) => ['workout', 'history', userId] as const,
}
