import { createContext, use } from 'react'

import type { ProfileRepository } from './profileRepository'

export const ProfileRepositoryContext = createContext<ProfileRepository | null>(null)

export const useProfileRepository = () => {
  const repository = use(ProfileRepositoryContext)
  if (!repository) throw new Error('The profile repository requires a configured Supabase client.')
  return repository
}
