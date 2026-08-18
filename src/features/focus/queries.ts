import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { useFocusRepository } from './focusRepositoryContext'
import { focusQueryKeys } from './repository'
import type { CreateFocusSessionInput, FocusSessionFilters, RewardFocusMode } from './types'

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

export const useStartRewardFocusRun = () => {
  const repository = useFocusRepository()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'reward-run', 'start', userId],
    mutationFn: ({ mode, description }: { mode: RewardFocusMode; description: string | null }) => {
      if (!repository.startRewardRun) throw new Error('Rewarded Focus runs require Supabase.')
      return repository.startRewardRun(userId, mode, description)
    },
  })
}

export const useCompleteRewardFocusRun = () => {
  const repository = useFocusRepository()
  const queryClient = useQueryClient()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'reward-run', 'complete', userId],
    mutationFn: (runId: string) => {
      if (!repository.completeRewardRun) throw new Error('Rewarded Focus runs require Supabase.')
      return repository.completeRewardRun(userId, runId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rewards'] }),
  })
}

export const useAbandonRewardFocusRun = () => {
  const repository = useFocusRepository()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'reward-run', 'abandon', userId],
    mutationFn: (runId: string) => {
      if (!repository.abandonRewardRun) throw new Error('Rewarded Focus runs require Supabase.')
      return repository.abandonRewardRun(userId, runId)
    },
  })
}
