import { z } from 'zod'

const numeric = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int())
const currency = z.enum(['silver', 'gold'])

export const rewardsDashboardResponseSchema = z.object({
  wallet: z.object({
    silver_balance: numeric,
    gold_balance: numeric,
    version: numeric,
  }),
  counter: z.object({
    local_month: z.string(),
    focus_25_5_completed: numeric,
    focus_30_5_completed: numeric,
    focus_40_5_completed: numeric,
    focus_silver_credited: numeric,
    gold_credited: numeric,
    strength_rewarded_count: numeric,
    cardio_rewarded_count: numeric,
    conversion_count: numeric,
  }),
  predominant_mode: z.enum(['25_5', '30_5', '40_5']),
  focus_silver_cap: numeric,
  gold_cap: numeric,
  rule: z.object({
    version: z.string(),
    rules: z.object({
      pricing_note: z.string(),
      conversion: z.object({ monthly_operations: numeric, silver_per_gold: numeric, gold_to_silver: numeric }),
      catalog: z.array(z.object({
        sku: z.string(),
        currency,
        credit_cents: numeric,
        coins: numeric,
      })),
    }).passthrough(),
  }),
  transactions: z.array(z.object({
    id: z.string().uuid(),
    reason: z.string(),
    silver_delta: numeric,
    gold_delta: numeric,
    silver_balance_after: numeric,
    gold_balance_after: numeric,
    rule_version: z.string(),
    created_at: z.string(),
  }).passthrough()),
  redemptions: z.array(z.object({
    id: z.string().uuid(),
    catalog_sku: z.string(),
    currency,
    coins_spent: numeric,
    credit_cents: numeric,
    status: z.enum(['requested', 'fulfilled', 'cancelled']),
    created_at: z.string(),
  }).passthrough()),
})
