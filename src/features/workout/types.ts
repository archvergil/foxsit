export type WorkoutColorToken = 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
export type WorkoutActivityType = 'strength' | 'cardio'

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
  activityType: WorkoutActivityType
  bannerAsset?: string | null | undefined
  bannerMonochrome?: boolean | undefined
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
  activityType: WorkoutActivityType
  bannerAsset?: string | null | undefined
  bannerMonochrome?: boolean | undefined
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

export type WorkoutSessionStatus = 'active' | 'completed' | 'cancelled'

export interface WorkoutSet {
  id: string
  userId: string
  sessionId: string
  sessionExerciseId: string
  setNumber: number
  weightKg: number | null
  reps: number | null
  rir: number | null
  completedAt: string | null
  volumeKg: number | null
  estimatedOneRepMaxKg: number | null
  isPersonalRecord: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkoutSessionExercise {
  id: string
  userId: string
  sessionId: string
  sourceRoutineExerciseId: string | null
  exerciseKey: string
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
  sets: WorkoutSet[]
}

export interface WorkoutSession {
  id: string
  userId: string
  routineId: string | null
  routineName: string
  activityType: WorkoutActivityType
  status: WorkoutSessionStatus
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  notes: string | null
  completedSets: number
  totalVolumeKg: number
  bestEstimatedOneRepMaxKg: number | null
  personalRecords: number
  createdAt: string
  updatedAt: string
  exercises: WorkoutSessionExercise[]
}

export interface SaveWorkoutSetInput {
  sessionId: string
  setId: string
  weightKg: number | null
  reps: number
  rir: number | null
}

export interface FinishWorkoutSessionInput {
  sessionId: string
  notes: string | null
}
