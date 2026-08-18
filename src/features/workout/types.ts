export type WorkoutColorToken = 'mint' | 'coral' | 'blue' | 'sand' | 'slate'

export interface WorkoutRoutineExercise {
  id: string
  userId: string
  routineId: string
  exerciseName: string
  muscleGroup: string | null
  position: number
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  restSeconds: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkoutRoutine {
  id: string
  userId: string
  name: string
  description: string | null
  colorToken: WorkoutColorToken
  position: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  exercises: WorkoutRoutineExercise[]
}

export interface WorkoutRoutineInput {
  name: string
  description: string | null
  colorToken: WorkoutColorToken
}

export interface WorkoutRoutineExerciseInput {
  routineId: string
  exerciseName: string
  muscleGroup: string | null
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  restSeconds: number
  notes: string | null
}
