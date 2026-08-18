import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { rewardQueryKeys } from './repository'
import { useRewardsRepository } from './rewardsRepositoryContext'
import type { RewardConversionDirection } from './types'

const useRewardIdentity = () => {
  const { session } = useAuth()
  if (!session) throw new Error('Rewards requires an authenticated session.')
  return session.user.id
}

export const useRewardsDashboard = () => {
  const repository = useRewardsRepository()
  const userId = useRewardIdentity()
  return useQuery({ queryKey: rewardQueryKeys.dashboard(userId), queryFn: () => repository.loadDashboard(userId) })
}

export const useConvertRewards = () => {
  const repository = useRewardsRepository()
  const client = useQueryClient()
  const userId = useRewardIdentity()
  return useMutation({
    mutationKey: ['rewards', 'convert', userId],
    mutationFn: ({ direction, units, requestKey }: { direction: RewardConversionDirection; units: number; requestKey: string }) =>
      repository.convert(userId, direction, units, requestKey),
    onSuccess: (dashboard) => client.setQueryData(rewardQueryKeys.dashboard(userId), dashboard),
  })
}

export const useRedeemReward = () => {
  const repository = useRewardsRepository()
  const client = useQueryClient()
  const userId = useRewardIdentity()
  return useMutation({
    mutationKey: ['rewards', 'redeem', userId],
    mutationFn: ({ sku, requestKey }: { sku: string; requestKey: string }) => repository.redeem(userId, sku, requestKey),
    onSuccess: (dashboard) => client.setQueryData(rewardQueryKeys.dashboard(userId), dashboard),
  })
}
