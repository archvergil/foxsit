import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { profileQueryKey, type CalendarDisplayPreferences } from './profileRepository'
import { useProfileRepository } from './profileRepositoryContext'

export const useProfile = (userId: string) => {
  const repository = useProfileRepository()
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => repository.getProfile(userId),
  })
}

export const useUpdateCalendarPreferences = () => {
  const { session } = useAuth()
  const repository = useProfileRepository()
  const queryClient = useQueryClient()
  if (!session) throw new Error('Calendar preferences require an authenticated session.')
  const userId = session.user.id
  return useMutation({
    mutationKey: ['profile', 'calendar-preferences', userId],
    mutationFn: (preferences: CalendarDisplayPreferences) => repository.updateCalendarPreferences(userId, preferences),
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  })
}
