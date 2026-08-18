import type { ReactNode } from 'react'

import { backendEnvironment } from '@/config/backend'
import { LocalApiClient } from '@/lib/localApi'
import { supabase } from '@/lib/supabase'
import { HabitsRepositoryContext } from './habitsRepositoryContext'
import { createLocalHabitsRepository } from './localHabitsRepository'
import type { HabitsRepository } from './repository'
import { createSupabaseHabitsRepository } from './supabaseHabitsRepository'

const defaultRepository = backendEnvironment.mode === 'local'
  ? createLocalHabitsRepository(new LocalApiClient(backendEnvironment.url))
  : supabase
    ? createSupabaseHabitsRepository(supabase)
    : null

export function HabitsRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode
  repository?: HabitsRepository | null
}) {
  return <HabitsRepositoryContext.Provider value={repository}>{children}</HabitsRepositoryContext.Provider>
}
