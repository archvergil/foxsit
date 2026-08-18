import type { ReactNode } from 'react'

import { supabase } from '@/lib/supabase'
import type { RewardsRepository } from './repository'
import { RewardsRepositoryContext } from './rewardsRepositoryContext'
import { createSupabaseRewardsRepository } from './supabaseRewardsRepository'

const defaultRepository = supabase ? createSupabaseRewardsRepository(supabase) : null

export function RewardsRepositoryProvider({ children, repository = defaultRepository }: {
  children: ReactNode
  repository?: RewardsRepository | null
}) {
  return <RewardsRepositoryContext.Provider value={repository}>{children}</RewardsRepositoryContext.Provider>
}
