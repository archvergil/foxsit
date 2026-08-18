import type { ReactNode } from 'react'

import { supabase } from '@/lib/supabase'
import { backendEnvironment } from '@/config/backend'
import { LocalApiClient } from '@/lib/localApi'
import type { ProfileRepository } from './profileRepository'
import { createLocalProfileRepository, createSupabaseProfileRepository } from './profileRepository'
import { ProfileRepositoryContext } from './profileRepositoryContext'

const defaultRepository = backendEnvironment.mode === 'local'
  ? createLocalProfileRepository(new LocalApiClient(backendEnvironment.url))
  : supabase
    ? createSupabaseProfileRepository(supabase)
    : null

export function ProfileRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode
  repository?: ProfileRepository | null
}) {
  return (
    <ProfileRepositoryContext.Provider value={repository}>
      {children}
    </ProfileRepositoryContext.Provider>
  )
}
