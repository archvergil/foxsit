import { ArrowRightLeft, Check, CircleDollarSign, Coins, History, ShoppingBag, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useConvertRewards, useRedeemReward, useRewardsDashboard } from './queries'
import type { RewardCatalogItem, RewardConversionDirection } from './types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
const reasonLabels: Record<string, string> = {
  focus_base: 'Completed Focus run',
  focus_description_bonus: 'Focus description bonus',
  focus_daily_40_bonus: 'Second 40/5 run bonus',
  strength_reward: 'Strength workout',
  cardio_reward: 'Cardio workout',
  cardio_monthly_bonus: 'Monthly cardio bonus',
  silver_store_purchase: 'Silver credit request',
  gold_store_purchase: 'Gold credit request',
  silver_to_gold_conversion: 'Silver to Gold conversion',
  gold_to_silver_conversion: 'Gold to Silver conversion',
  admin_adjustment: 'Audited adjustment',
}

type Confirmation =
  | { kind: 'redeem'; item: RewardCatalogItem }
  | { kind: 'convert'; direction: RewardConversionDirection; units: number }

const coinDelta = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('en')}`

export default function RewardsPage() {
  const dashboard = useRewardsDashboard()
  const convert = useConvertRewards()
  const redeem = useRedeemReward()
  const [direction, setDirection] = useState<RewardConversionDirection>('silver_to_gold')
  const [units, setUnits] = useState(1)
  const [historyLimit, setHistoryLimit] = useState(10)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const data = dashboard.data
  const mutationError = convert.error ?? redeem.error
  const conversion = useMemo(() => {
    if (!data) return null
    const silverDelta = direction === 'silver_to_gold' ? -(units * data.silverPerGold) : units * data.goldToSilver
    const goldDelta = direction === 'silver_to_gold' ? units : -units
    return {
      silverDelta,
      goldDelta,
      valid: units >= 1 && data.wallet.silverBalance + silverDelta >= 0 && data.wallet.goldBalance + goldDelta >= 0,
    }
  }, [data, direction, units])

  const confirmAction = async () => {
    if (!confirmation) return
    const requestKey = crypto.randomUUID()
    try {
      if (confirmation.kind === 'redeem') {
        await redeem.mutateAsync({ sku: confirmation.item.sku, requestKey })
      } else {
        await convert.mutateAsync({ direction: confirmation.direction, units: confirmation.units, requestKey })
      }
      setConfirmation(null)
    } catch {
      // Keep the review panel open with the durable server error visible.
    }
  }

  if (dashboard.isPending) return <section className="page-stack rewards-page" aria-busy="true"><div className="rewards-loading">Loading your private wallet…</div></section>
  if (dashboard.error || !data) return (
    <section className="page-stack rewards-page">
      <PageHeader eyebrow="Private credits" title="Rewards" description="Your wallet could not be loaded." />
      <div className="rewards-error" role="alert"><p>{dashboard.error?.message ?? 'Rewards are unavailable.'}</p><Button onClick={() => void dashboard.refetch()}>Try again</Button></div>
    </section>
  )

  const conversionsRemaining = Math.max(0, data.conversionLimit - data.counter.conversionCount)

  return (
    <section className="page-stack rewards-page">
      <PageHeader
        eyebrow="Private, audited credits"
        title="Rewards"
        description="Earn coins through completed Focus runs and workouts, then exchange them for internal credit requests. No payment or automatic cash transfer occurs here."
      />

      <div className="reward-balances">
        <article className="reward-balance reward-balance--silver">
          <span className="reward-balance__icon"><Coins aria-hidden /></span>
          <span><small>Silver balance</small><strong>{data.wallet.silverBalance.toLocaleString('en')}</strong><p>Focus and eligible workouts</p></span>
        </article>
        <article className="reward-balance reward-balance--gold">
          <span className="reward-balance__icon"><CircleDollarSign aria-hidden /></span>
          <span><small>Gold balance</small><strong>{data.wallet.goldBalance.toLocaleString('en')}</strong><p>Shared monthly earning cap</p></span>
        </article>
      </div>

      <section className="reward-progress-grid" aria-label="Monthly Rewards progress">
        <article>
          <header><span>Focus Silver</span><strong>{data.counter.focusSilverCredited} / {data.focusSilverCap}</strong></header>
          <progress value={data.counter.focusSilverCredited} max={data.focusSilverCap} />
          <small>Predominant mode: {data.predominantMode.replace('_', '/')}</small>
        </article>
        <article>
          <header><span>Gold earned</span><strong>{data.counter.goldCredited} / {data.goldCap}</strong></header>
          <progress value={data.counter.goldCredited} max={data.goldCap} />
          <small>Focus, workouts and Silver → Gold</small>
        </article>
        <article>
          <header><span>Eligible workouts</span><strong>{data.counter.strengthRewardedCount + data.counter.cardioRewardedCount}</strong></header>
          <small>{data.counter.strengthRewardedCount}/25 strength · {data.counter.cardioRewardedCount}/15 cardio</small>
        </article>
      </section>

      <section className="reward-section reward-conversion">
        <header><span><ArrowRightLeft aria-hidden /><span><span className="eyebrow">Monthly exchange</span><h2>Convert coins</h2></span></span><small>{conversionsRemaining} of {data.conversionLimit} operations left</small></header>
        <div className="reward-conversion__form">
          <label><span>Direction</span><select value={direction} onChange={(event) => setDirection(event.target.value as RewardConversionDirection)}>
            <option value="silver_to_gold">{data.silverPerGold} Silver → 1 Gold</option>
            <option value="gold_to_silver">1 Gold → {data.goldToSilver} Silver</option>
          </select></label>
          <label><span>Units</span><input type="number" min="1" step="1" value={units} onChange={(event) => setUnits(Math.max(1, Math.floor(Number(event.target.value) || 1)))} /></label>
          <div className="reward-conversion__result">
            <small>You send</small><strong>{direction === 'silver_to_gold' ? `${units * data.silverPerGold} Silver` : `${units} Gold`}</strong>
            <small>You receive</small><strong>{direction === 'silver_to_gold' ? `${units} Gold` : `${units * data.goldToSilver} Silver`}</strong>
          </div>
          <Button disabled={!conversion?.valid || conversionsRemaining === 0} onClick={() => setConfirmation({ kind: 'convert', direction, units })}>Review conversion</Button>
        </div>
      </section>

      {(['silver', 'gold'] as const).map((currency) => (
        <section className={`reward-section reward-store reward-store--${currency}`} key={currency}>
          <header><span><ShoppingBag aria-hidden /><span><span className="eyebrow">Internal credit catalog</span><h2>{currency === 'silver' ? 'Silver' : 'Gold'} store</h2></span></span></header>
          <p className="reward-store__notice">Credit value remains fixed. Coin prices include the confirmed 40% increase{currency === 'silver' ? ', rounded up where needed' : ''}.</p>
          <div className="reward-store__grid">
            {data.catalog.filter((item) => item.currency === currency).map((item) => {
              const balance = currency === 'silver' ? data.wallet.silverBalance : data.wallet.goldBalance
              return <article key={item.sku}>
                <span>Credit request</span><strong>{brl.format(item.creditCents / 100)}</strong>
                <p>{item.coins.toLocaleString('en')} {currency === 'silver' ? 'Silver' : 'Gold'}</p>
                <Button variant="secondary" disabled={balance < item.coins} onClick={() => setConfirmation({ kind: 'redeem', item })}>{balance < item.coins ? 'Insufficient balance' : 'Review request'}</Button>
              </article>
            })}
          </div>
        </section>
      ))}

      <section className="reward-section reward-history">
        <header><span><History aria-hidden /><span><span className="eyebrow">Immutable ledger</span><h2>History</h2></span></span></header>
        {data.transactions.length === 0 ? <p className="reward-history__empty">Your first eligible activity, conversion or credit request will appear here.</p> : (
          <div className="reward-history__list">
            {data.transactions.slice(0, historyLimit).map((transaction) => <article key={transaction.id}>
              <span><strong>{reasonLabels[transaction.reason] ?? transaction.reason}</strong><small>{dateTime.format(new Date(transaction.createdAt))} · rule {transaction.ruleVersion}</small></span>
              <span className="reward-history__deltas">
                {transaction.silverDelta ? <em className={transaction.silverDelta > 0 ? 'is-positive' : ''}>{coinDelta(transaction.silverDelta)} S</em> : null}
                {transaction.goldDelta ? <em className={transaction.goldDelta > 0 ? 'is-positive' : ''}>{coinDelta(transaction.goldDelta)} G</em> : null}
              </span>
            </article>)}
            {historyLimit < data.transactions.length ? <Button variant="quiet" onClick={() => setHistoryLimit((value) => value + 10)}>Load older entries</Button> : null}
          </div>
        )}
      </section>

      <section className="reward-section reward-history">
        <header><span><ShoppingBag aria-hidden /><span><span className="eyebrow">Manual fulfillment</span><h2>Credit requests</h2></span></span></header>
        {data.redemptions.length === 0 ? <p className="reward-history__empty">No credit requests yet. Requests are recorded here; fulfillment happens outside the app.</p> : <div className="reward-history__list">
          {data.redemptions.map((request) => <article key={request.id}>
            <span><strong>{brl.format(request.creditCents / 100)} credit</strong><small>{dateTime.format(new Date(request.createdAt))} · {request.coinsSpent} {request.currency}</small></span>
            <span className={`reward-redemption-status reward-redemption-status--${request.status}`}>{request.status}</span>
          </article>)}
        </div>}
      </section>

      {confirmation ? <div className="reward-confirmation-backdrop" role="presentation">
        <section className="reward-confirmation" role="dialog" aria-modal="true" aria-labelledby="reward-confirmation-title">
          <button type="button" aria-label="Close confirmation" onClick={() => setConfirmation(null)}><X aria-hidden /></button>
          <span className="reward-confirmation__icon"><Check aria-hidden /></span>
          <h2 id="reward-confirmation-title">Confirm {confirmation.kind === 'redeem' ? 'credit request' : 'conversion'}</h2>
          {confirmation.kind === 'redeem' ? <p>
            Spend <strong>{confirmation.item.coins} {confirmation.item.currency}</strong> for a <strong>{brl.format(confirmation.item.creditCents / 100)}</strong> internal credit request. Remaining balance: <strong>{(confirmation.item.currency === 'silver' ? data.wallet.silverBalance : data.wallet.goldBalance) - confirmation.item.coins}</strong>.
          </p> : <p>
            This will change your balance by <strong>{conversion?.silverDelta ?? 0} Silver</strong> and <strong>{conversion?.goldDelta ?? 0} Gold</strong>. Conversions cannot be reversed automatically.
          </p>}
          {mutationError ? <p className="reward-confirmation__error" role="alert">{mutationError.message}</p> : null}
          <div><Button variant="secondary" onClick={() => setConfirmation(null)}>Cancel</Button><Button isLoading={convert.isPending || redeem.isPending} onClick={() => void confirmAction()}>Confirm</Button></div>
        </section>
      </div> : null}
    </section>
  )
}
