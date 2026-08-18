import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { useFocusRepository } from './focusRepositoryContext'
import { focusQueryKeys } from './repository'
import type { CreateFocusSessionInput, FocusSessionFilters } from './types'

const useFocusIdentity = () => {
  const { session } = useAuth()
  if (!session) throw new Error('Focus requires an authenticated session.')
  return session.user.id
}

export const useFocusSessions = (filters: FocusSessionFilters = {}) => {
  const repository = useFocusRepository()
  const userId = useFocusIdentity()
  return useQuery({
    queryKey: focusQueryKeys.sessionList(userId, filters),
    queryFn: () => repository.listSessions(userId, filters),
  })
}

export const useCreateFocusSession = () => {
  const repository = useFocusRepository()
  const queryClient = useQueryClient()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'create-session', userId],
    mutationFn: (input: CreateFocusSessionInput) => repository.createSession(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: focusQueryKeys.sessions(userId) }),
  })
}
