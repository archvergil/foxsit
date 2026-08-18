import type { RewardConversionDirection, RewardsDashboard } from './types'

export interface RewardsRepository {
  loadDashboard(userId: string): Promise<RewardsDashboard>
  convert(userId: string, direction: RewardConversionDirection, units: number, requestKey: string): Promise<RewardsDashboard>
  redeem(userId: string, sku: string, requestKey: string): Promise<RewardsDashboard>
}

export const rewardQueryKeys = {
  all: ['rewards'] as const,
  dashboard: (userId: string) => ['rewards', 'dashboard', userId] as const,
}
