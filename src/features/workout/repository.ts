import type {
  WorkoutRoutine,
  WorkoutRoutineExercise,
  WorkoutRoutineExerciseInput,
  WorkoutRoutineInput,
} from './types'

export interface WorkoutRepository {
  listRoutines(userId: string): Promise<WorkoutRoutine[]>
  createRoutine(userId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine>
  updateRoutine(userId: string, routineId: string, input: WorkoutRoutineInput): Promise<WorkoutRoutine>
  deleteRoutine(userId: string, routineId: string): Promise<void>
  createExercise(userId: string, input: WorkoutRoutineExerciseInput): Promise<WorkoutRoutineExercise>
  deleteExercise(userId: string, exerciseId: string): Promise<void>
}

export const workoutQueryKeys = {
  all: ['workout'] as const,
  routines: (userId: string) => ['workout', 'routines', userId] as const,
}
