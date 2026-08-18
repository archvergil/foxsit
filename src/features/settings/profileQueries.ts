import { useQuery } from '@tanstack/react-query'

import { profileQueryKey } from './profileRepository'
import { useProfileRepository } from './profileRepositoryContext'

export const useProfile = (userId: string) => {
  const repository = useProfileRepository()
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => repository.getProfile(userId),
  })
}
