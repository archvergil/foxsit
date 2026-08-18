import { createContext, use } from 'react'

import type { FocusRepository } from './repository'

export const FocusRepositoryContext = createContext<FocusRepository | null>(null)

export const useFocusRepository = () => {
  const repository = use(FocusRepositoryContext)
  if (!repository) throw new Error('The Focus repository requires a configured backend.')
  return repository
}
