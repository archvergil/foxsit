import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import type { RewardsRepository } from './repository'
import { rewardsDashboardResponseSchema } from './schemas'
import type { RewardsDashboard } from './types'

export class RewardsRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RewardsRepositoryError'
  }
}

const mapDashboard = (input: unknown): RewardsDashboard => {
  const value = rewardsDashboardResponseSchema.parse(input)
  return {
    wallet: {
      silverBalance: value.wallet.silver_balance,
      goldBalance: value.wallet.gold_balance,
      version: value.wallet.version,
    },
    counter: {
      localMonth: value.counter.local_month,
      focus25Completed: value.counter.focus_25_5_completed,
      focus30Completed: value.counter.focus_30_5_completed,
      focus40Completed: value.counter.focus_40_5_completed,
      focusSilverCredited: value.counter.focus_silver_credited,
      goldCredited: value.counter.gold_credited,
      strengthRewardedCount: value.counter.strength_rewarded_count,
      cardioRewardedCount: value.counter.cardio_rewarded_count,
      crossfitRewardedCount: value.counter.crossfit_rewarded_count,
      conversionCount: value.counter.conversion_count,
    },
    predominantMode: value.predominant_mode,
    focusSilverCap: value.focus_silver_cap,
    goldCap: value.gold_cap,
    conversionLimit: value.rule.rules.conversion.monthly_operations,
    silverPerGold: value.rule.rules.conversion.silver_per_gold,
    goldToSilver: value.rule.rules.conversion.gold_to_silver,
    ruleVersion: value.rule.version,
    pricingNote: value.rule.rules.pricing_note,
    catalog: value.rule.rules.catalog.map((item) => ({
      sku: item.sku,
      currency: item.currency,
      creditCents: item.credit_cents,
      coins: item.coins,
    })),
    transactions: value.transactions.map((item) => ({
      id: item.id,
      reason: item.reason,
      silverDelta: item.silver_delta,
      goldDelta: item.gold_delta,
      silverBalanceAfter: item.silver_balance_after,
      goldBalanceAfter: item.gold_balance_after,
      ruleVersion: item.rule_version,
      createdAt: item.created_at,
    })),
    redemptions: value.redemptions.map((item) => ({
      id: item.id,
      catalogSku: item.catalog_sku,
      currency: item.currency,
      coinsSpent: item.coins_spent,
      creditCents: item.credit_cents,
      status: item.status,
      createdAt: item.created_at,
    })),
  }
}

const assertRpc = (data: unknown, error: unknown, action: string) => {
  if (error) throw new RewardsRepositoryError(`Could not ${action}.`, { cause: error })
  return mapDashboard(data)
}

export const createSupabaseRewardsRepository = (client: SupabaseClient<Database>): RewardsRepository => ({
  loadDashboard: async () => {
    const { data, error } = await client.rpc('get_reward_dashboard', { p_history_limit: 50 })
    return assertRpc(data, error, 'load Rewards')
  },
  convert: async (_userId, direction, units, requestKey) => {
    const { data, error } = await client.rpc('convert_reward_currency', {
      p_direction: direction,
      p_units: units,
      p_request_key: requestKey,
    })
    return assertRpc(data, error, 'convert coins')
  },
  redeem: async (_userId, sku, requestKey) => {
    const { data, error } = await client.rpc('redeem_reward_credit', {
      p_catalog_sku: sku,
      p_request_key: requestKey,
    })
    return assertRpc(data, error, 'request the credit')
  },
})
