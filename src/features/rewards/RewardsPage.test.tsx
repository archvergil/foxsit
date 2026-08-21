import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import type { RewardsRepository } from './repository'
import RewardsPage from './RewardsPage'
import { RewardsRepositoryProvider } from './RewardsRepositoryProvider'
import type { RewardsDashboard } from './types'

const USER_ID = 'ee3075d3-fc92-45a0-8fa5-bc790046fb8a'
const dashboard: RewardsDashboard = {
  wallet: { silverBalance: 500, goldBalance: 300, version: 1 },
  counter: {
    localMonth: '2026-08-01', focus25Completed: 2, focus30Completed: 0, focus40Completed: 0,
    focusSilverCredited: 4, goldCredited: 10, strengthRewardedCount: 1, cardioRewardedCount: 0,
    crossfitRewardedCount: 1, conversionCount: 1,
  },
  predominantMode: '25_5', focusSilverCap: 150, goldCap: 100, conversionLimit: 5,
  silverPerGold: 20, goldToSilver: 10,
  ruleVersion: '2026-08-18.1', pricingNote: '40% higher costs',
  catalog: [
    { sku: 'silver-010', currency: 'silver', creditCents: 1000, coins: 21 },
    { sku: 'gold-100', currency: 'gold', creditCents: 10000, coins: 210 },
  ],
  transactions: [], redemptions: [],
}

const authValue: AuthContextValue = {
  session: {
    access_token: 'test', refresh_token: 'test', expires_in: 3600, token_type: 'bearer',
    user: { id: USER_ID, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-08-18T12:00:00Z' },
  } satisfies Session,
  status: 'authenticated', signIn: () => Promise.resolve(), signUp: () => Promise.resolve(true), signOut: () => Promise.resolve(),
  requestPasswordReset: () => Promise.resolve(), updatePassword: () => Promise.resolve(),
}

const renderPage = (repository: RewardsRepository) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <AuthContext.Provider value={authValue}>
      <RewardsRepositoryProvider repository={repository}>
        <MemoryRouter><RewardsPage /></MemoryRouter>
      </RewardsRepositoryProvider>
    </AuthContext.Provider>
  </QueryClientProvider>,
)

describe('Rewards workspace', () => {
  it('shows server-priced credit SKUs and requires confirmation before redeeming', async () => {
    const redeem = vi.fn(() => Promise.resolve(dashboard))
    const repository: RewardsRepository = {
      loadDashboard: () => Promise.resolve(dashboard),
      convert: () => Promise.resolve(dashboard),
      redeem,
    }
    const user = userEvent.setup()
    renderPage(repository)

    const silverStore = (await screen.findByRole('heading', { name: 'Silver store' })).closest('section')!
    expect(screen.getByText('1/25 strength · 0/15 cardio · 1/25 CrossFit')).toBeVisible()
    expect(within(silverStore).getByText('R$ 10')).toBeVisible()
    expect(within(silverStore).getByText('21 Silver')).toBeVisible()
    await user.click(within(silverStore).getByRole('button', { name: 'Review request' }))

    const dialog = screen.getByRole('dialog', { name: 'Confirm credit request' })
    expect(within(dialog).getByText(/Spend/)).toHaveTextContent('21 silver')
    expect(redeem).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(redeem).toHaveBeenCalledWith(USER_ID, 'silver-010', expect.any(String))
  })
})
