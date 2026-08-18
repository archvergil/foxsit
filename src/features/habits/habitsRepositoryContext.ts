import { createContext, useContext } from 'react'

import type { HabitsRepository } from './repository'

export const HabitsRepositoryContext = createContext<HabitsRepository | null>(null)

export const useHabitsRepository = () => {
  const repository = useContext(HabitsRepositoryContext)
  if (!repository) throw new Error('Habits repository is unavailable.')
  return repository
}
