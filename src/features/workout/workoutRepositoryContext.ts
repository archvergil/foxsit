import { createContext, useContext } from 'react'

import type { WorkoutRepository } from './repository'

export const WorkoutRepositoryContext = createContext<WorkoutRepository | null>(null)

export const useOptionalWorkoutRepository = () => useContext(WorkoutRepositoryContext)

export const useWorkoutRepository = () => {
  const repository = useOptionalWorkoutRepository()
  if (!repository) throw new Error('Workout repository is unavailable.')
  return repository
}
