import { createContext, useContext } from 'react'

import type { RewardsRepository } from './repository'

export const RewardsRepositoryContext = createContext<RewardsRepository | null>(null)

export const useRewardsRepository = () => {
  const repository = useContext(RewardsRepositoryContext)
  if (!repository) throw new Error('Rewards requires a configured Supabase connection.')
  return repository
}
