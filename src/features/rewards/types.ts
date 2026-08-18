export type RewardCurrency = 'silver' | 'gold'
export type RewardConversionDirection = 'silver_to_gold' | 'gold_to_silver'

export interface RewardWallet {
  silverBalance: number
  goldBalance: number
  version: number
}

export interface RewardCounter {
  localMonth: string
  focus25Completed: number
  focus30Completed: number
  focus40Completed: number
  focusSilverCredited: number
  goldCredited: number
  strengthRewardedCount: number
  cardioRewardedCount: number
  conversionCount: number
}

export interface RewardCatalogItem {
  sku: string
  currency: RewardCurrency
  creditCents: number
  coins: number
}

export interface RewardTransaction {
  id: string
  reason: string
  silverDelta: number
  goldDelta: number
  silverBalanceAfter: number
  goldBalanceAfter: number
  ruleVersion: string
  createdAt: string
}

export interface RewardRedemption {
  id: string
  catalogSku: string
  currency: RewardCurrency
  coinsSpent: number
  creditCents: number
  status: 'requested' | 'fulfilled' | 'cancelled'
  createdAt: string
}

export interface RewardsDashboard {
  wallet: RewardWallet
  counter: RewardCounter
  predominantMode: '25_5' | '30_5' | '40_5'
  focusSilverCap: number
  goldCap: number
  conversionLimit: number
  silverPerGold: number
  goldToSilver: number
  ruleVersion: string
  pricingNote: string
  catalog: RewardCatalogItem[]
  transactions: RewardTransaction[]
  redemptions: RewardRedemption[]
}
