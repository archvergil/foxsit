import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { useFocusRepository } from './focusRepositoryContext'
import { focusQueryKeys } from './repository'
import type { CreateFocusSessionInput, FocusSession, FocusSessionFilters, RewardFocusMode, ScheduleFocusPhaseInput } from './types'

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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: focusQueryKeys.sessions(userId) })
      void queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
  })
}

export const useScheduleFocusPhase = () => {
  const repository = useFocusRepository()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'phase', 'schedule', userId],
    mutationFn: (input: ScheduleFocusPhaseInput) => repository.schedulePhase
      ? repository.schedulePhase(userId, input)
      : Promise.resolve<string | null>(null),
  })
}

export const useSettleFocusPhase = () => {
  const repository = useFocusRepository()
  const queryClient = useQueryClient()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'phase', 'settle', userId],
    mutationFn: (jobId: string) => {
      if (!repository.settlePhase) throw new Error('Durable Focus phases require Supabase.')
      return repository.settlePhase(userId, jobId)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: focusQueryKeys.sessions(userId) })
      void queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
  })
}

const useFocusPhaseStateMutation = (action: 'pause' | 'resume' | 'cancel') => {
  const repository = useFocusRepository()
  const queryClient = useQueryClient()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'phase', action, userId],
    mutationFn: (jobId: string) => {
      const mutation = action === 'pause'
        ? repository.pausePhase
        : action === 'resume'
          ? repository.resumePhase
          : repository.cancelPhase
      if (!mutation) throw new Error('Durable Focus phases require Supabase.')
      return mutation(userId, jobId)
    },
    onSettled: () => {
      if (action === 'cancel') void queryClient.invalidateQueries({ queryKey: focusQueryKeys.sessions(userId) })
    },
  })
}

export const usePauseFocusPhase = () => useFocusPhaseStateMutation('pause')
export const useResumeFocusPhase = () => useFocusPhaseStateMutation('resume')
export const useCancelFocusPhase = () => useFocusPhaseStateMutation('cancel')

export const useDeleteFocusSession = () => {
  const repository = useFocusRepository()
  const queryClient = useQueryClient()
  const userId = useFocusIdentity()
  return useMutation({
    mutationKey: ['focus', 'delete-session', userId],
    mutationFn: (sessionId: string) => repository.deleteSession(userId, sessionId),
    onSuccess: (_result, sessionId) => {
      for (const [queryKey, sessions] of queryClient.getQueriesData<FocusSession[]>({ queryKey: focusQueryKeys.sessions(userId) })) {
        queryClient.setQueryData(queryKey, sessions?.filter(({ id }) => id !== sessionId))
      }
      void queryClient.invalidateQueries({ queryKey: focusQueryKeys.sessions(userId) })
    },
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
