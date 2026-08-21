// @vitest-environment node

import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authenticateLocalUser, createLocalTestDatabase, createLocalUser, resetLocalRole } from './localDatabase'

const USER_A = 'a0000000-0000-4000-8000-000000000001'
const USER_B = 'b0000000-0000-4000-8000-000000000002'
const USER_DELETE = 'b0000000-0000-4000-8000-000000000003'
const USER_ATOMIC_FOCUS = 'c0000000-0000-4000-8000-000000000004'

describe('Rewards economy on local PGlite', () => {
  let database: PGlite | undefined

  beforeAll(async () => {
    database = await createLocalTestDatabase()
    await createLocalUser(database, { id: USER_A, email: 'rewards-a@local.test' })
    await createLocalUser(database, { id: USER_B, email: 'rewards-b@local.test' })
    await createLocalUser(database, { id: USER_DELETE, email: 'rewards-delete@local.test' })
    await createLocalUser(database, { id: USER_ATOMIC_FOCUS, email: 'rewards-focus-atomic@local.test' })
  }, 30_000)

  afterAll(async () => database?.close())

  it('stores the confirmed 40% higher coin costs without changing BRL credit values', async () => {
    const result = await database!.query<{ rules: { catalog: Array<{ sku: string; credit_cents: number; coins: number }> } }>(
      'select rules from public.reward_rule_sets where is_active',
    )
    const catalog = result.rows[0]!.rules.catalog
    expect(catalog.find(({ sku }) => sku === 'silver-010')).toMatchObject({ credit_cents: 1000, coins: 21 })
    expect(catalog.find(({ sku }) => sku === 'silver-015')).toMatchObject({ credit_cents: 1500, coins: 31 })
    expect(catalog.find(({ sku }) => sku === 'gold-100')).toMatchObject({ credit_cents: 10000, coins: 210 })
  })

  it('converts atomically, counts one operation and treats a retry as idempotent', async () => {
    await database!.query('insert into public.reward_wallets(user_id,silver_balance) values($1,100)', [USER_A])
    await authenticateLocalUser(database!, USER_A)
    try {
      const requestKey = 'c0000000-0000-4000-8000-000000000003'
      await database!.query("select public.convert_reward_currency('silver_to_gold',2,$1)", [requestKey])
      await database!.query("select public.convert_reward_currency('silver_to_gold',2,$1)", [requestKey])
      const wallet = await database!.query<{ silver_balance: bigint; gold_balance: bigint }>(
        'select silver_balance,gold_balance from public.reward_wallets where user_id=$1', [USER_A],
      )
      const counter = await database!.query<{ conversion_count: number; gold_credited: number }>(
        'select conversion_count,gold_credited from public.reward_monthly_counters where user_id=$1', [USER_A],
      )
      expect(Number(wallet.rows[0]!.silver_balance)).toBe(60)
      expect(Number(wallet.rows[0]!.gold_balance)).toBe(2)
      expect(counter.rows[0]).toMatchObject({ conversion_count: 1, gold_credited: 2 })
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('debits the authoritative SKU price and freezes the redemption snapshot', async () => {
    await authenticateLocalUser(database!, USER_A)
    try {
      await database!.query("select public.redeem_reward_credit('silver-010',$1)", ['d0000000-0000-4000-8000-000000000004'])
      const redemption = await database!.query<{ credit_cents: number; coins_spent: bigint; status: string }>(
        'select credit_cents,coins_spent,status from public.reward_redemptions where user_id=$1', [USER_A],
      )
      expect(redemption.rows[0]).toMatchObject({ credit_cents: 1000, status: 'requested' })
      expect(Number(redemption.rows[0]!.coins_spent)).toBe(21)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('awards a complete 25/5 run exactly once and isolates wallet and ledger rows with RLS', async () => {
    await authenticateLocalUser(database!, USER_A)
    let runId: string
    try {
      runId = (await database!.query<{ start_focus_run: string }>(
        "select public.start_focus_run('25_5',null) as start_focus_run",
      )).rows[0]!.start_focus_run
    } finally {
      await resetLocalRole(database!)
    }
    await database!.query(`
      insert into public.focus_sessions(user_id,focus_run_id,started_at,ended_at,planned_seconds,focused_seconds,session_type,completed)
      values
        ($1,$2,'2026-08-18T10:00:00Z','2026-08-18T10:25:00Z',1500,1500,'focus',true),
        ($1,$2,'2026-08-18T10:25:00Z','2026-08-18T10:30:00Z',300,300,'short_break',true),
        ($1,$2,'2026-08-18T10:30:00Z','2026-08-18T10:55:00Z',1500,1500,'focus',true),
        ($1,$2,'2026-08-18T10:55:00Z','2026-08-18T11:00:00Z',300,300,'short_break',true),
        ($1,$2,'2026-08-18T11:00:00Z','2026-08-18T11:25:00Z',1500,1500,'focus',true)
    `, [USER_A, runId])
    await authenticateLocalUser(database!, USER_A)
    try {
      await database!.query('select public.complete_focus_run_and_award($1)', [runId])
      await database!.query('select public.complete_focus_run_and_award($1)', [runId])
      const ownWallet = await database!.query<{ silver_balance: bigint; gold_balance: bigint }>('select silver_balance,gold_balance from public.reward_wallets')
      expect(Number(ownWallet.rows[0]!.silver_balance)).toBe(41)
      expect(Number(ownWallet.rows[0]!.gold_balance)).toBe(3)
      const visibleUsers = await database!.query<{ user_id: string }>('select distinct user_id from public.reward_transactions')
      expect(visibleUsers.rows).toEqual([{ user_id: USER_A }])
      await expect(database!.query('update public.reward_wallets set silver_balance=999 where user_id=$1', [USER_A])).rejects.toThrow(/permission denied/i)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('awards a durable workout classification exactly once', async () => {
    const session = await database!.query<{ id: string }>(`
      insert into public.workout_sessions(user_id,routine_name,activity_type,status,started_at,ended_at,duration_seconds)
      values($1,'Morning run','cardio','completed',now()-interval '35 minutes',now(),2100)
      returning id
    `, [USER_A])
    await authenticateLocalUser(database!, USER_A)
    try {
      await database!.query('select public.award_workout_rewards($1)', [session.rows[0]!.id])
      await database!.query('select public.award_workout_rewards($1)', [session.rows[0]!.id])
      const transactions = await database!.query<{ count: number }>(
        "select count(*)::integer as count from public.reward_transactions where reason='cardio_reward' and source_id=$1",
        [session.rows[0]!.id],
      )
      expect(transactions.rows[0]!.count).toBe(1)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('awards the run atomically with its final Focus session and makes a lost-response retry safe', async () => {
    await authenticateLocalUser(database!, USER_ATOMIC_FOCUS)
    try {
      const runId = (await database!.query<{ start_focus_run: string }>(
        "select public.start_focus_run('40_5',null) as start_focus_run",
      )).rows[0]!.start_focus_run
      const phases = [
        ['focus', 2400], ['short_break', 300],
        ['focus', 2400], ['short_break', 300],
        ['focus', 2400], ['short_break', 300],
        ['focus', 2400], ['long_break', 300],
        ['focus', 2400],
      ] as const
      const totalSeconds = phases.reduce((sum, [, seconds]) => sum + seconds, 0)
      let cursor = Date.now() - (totalSeconds + 60) * 1000
      let finalStartedAt = ''
      let savedFinalId = ''

      for (const [sessionType, seconds] of phases) {
        const startedAt = new Date(cursor).toISOString()
        cursor += seconds * 1000
        const endedAt = new Date(cursor).toISOString()
        const saved = await database!.query<{ id: string }>(`
          select (public.record_focus_session($1,null,$2,$3,$4,$4,$5,true)).id as id
        `, [runId, startedAt, endedAt, seconds, sessionType])
        if (sessionType === 'focus') {
          finalStartedAt = startedAt
          savedFinalId = saved.rows[0]!.id
        }
      }

      const walletAfterFinalSession = await database!.query<{ silver_balance: bigint; gold_balance: bigint }>(
        'select silver_balance,gold_balance from public.reward_wallets where user_id=$1',
        [USER_ATOMIC_FOCUS],
      )
      expect(Number(walletAfterFinalSession.rows[0]!.silver_balance)).toBe(6)
      expect(Number(walletAfterFinalSession.rows[0]!.gold_balance)).toBe(5)

      const retry = await database!.query<{ id: string }>(`
        select (public.record_focus_session($1,null,$2,$3,2400,2400,'focus',true)).id as id
      `, [runId, finalStartedAt, new Date().toISOString()])
      expect(retry.rows[0]!.id).toBe(savedFinalId)
      await database!.query('select public.complete_focus_run_and_award($1)', [runId])

      const ledger = await database!.query<{ count: number }>(`
        select count(*)::integer as count
        from public.reward_transactions
        where user_id=$1 and reason='focus_base' and source_id=$2
      `, [USER_ATOMIC_FOCUS, runId])
      expect(ledger.rows[0]!.count).toBe(1)
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('awards all habits completed today and reverses an accidental completion', async () => {
    const localDate = (await database!.query<{ local_date: string }>(
      "select (now() at time zone 'America/Sao_Paulo')::date::text as local_date",
    )).rows[0]!.local_date
    const habits = await database!.query<{ id: string }>(`
      insert into public.habits(user_id,title,schedule_type,target_count,position)
      values ($1,'Read','daily',1,1000),($1,'Stretch','daily',1,2000)
      returning id
    `, [USER_B])
    const [read, stretch] = habits.rows

    await authenticateLocalUser(database!, USER_B)
    try {
      await database!.query(`
        insert into public.habit_logs(user_id,habit_id,local_date,count,status,source)
        values($1,$2,$3::date,1,'completed','manual')
      `, [USER_B, read!.id, localDate])
      expect((await database!.query('select * from public.reward_wallets')).rows).toHaveLength(0)

      await database!.query(`
        insert into public.habit_logs(user_id,habit_id,local_date,count,status,source)
        values($1,$2,$3::date,1,'completed','manual')
      `, [USER_B, stretch!.id, localDate])
      let wallet = await database!.query<{ silver_balance: bigint; gold_balance: bigint }>('select silver_balance,gold_balance from public.reward_wallets')
      expect(Number(wallet.rows[0]!.silver_balance)).toBe(10)
      expect(Number(wallet.rows[0]!.gold_balance)).toBe(2)
      await resetLocalRole(database!)
      await expect(database!.query(
        'update public.reward_wallets set silver_balance=0 where user_id=$1', [USER_B],
      )).rejects.toThrow(/reserved/i)
      await authenticateLocalUser(database!, USER_B)

      await database!.query(`
        update public.habit_logs set count=0,status='in_progress'
        where user_id=$1 and habit_id=$2 and local_date=$3::date
      `, [USER_B, stretch!.id, localDate])
      wallet = await database!.query<{ silver_balance: bigint; gold_balance: bigint }>('select silver_balance,gold_balance from public.reward_wallets')
      expect(Number(wallet.rows[0]!.silver_balance)).toBe(0)
      expect(Number(wallet.rows[0]!.gold_balance)).toBe(0)

      await database!.query(`
        update public.habit_logs set count=1,status='completed'
        where user_id=$1 and habit_id=$2 and local_date=$3::date
      `, [USER_B, stretch!.id, localDate])
      wallet = await database!.query<{ silver_balance: bigint; gold_balance: bigint }>('select silver_balance,gold_balance from public.reward_wallets')
      expect(Number(wallet.rows[0]!.silver_balance)).toBe(10)
      expect(Number(wallet.rows[0]!.gold_balance)).toBe(2)

      const ledger = await database!.query<{ reason: string }>('select reason from public.reward_transactions order by created_at,id')
      expect(ledger.rows.map(({ reason }) => reason)).toEqual([
        'habit_daily_completion', 'habit_daily_completion_revoked', 'habit_daily_completion',
      ])
    } finally {
      await resetLocalRole(database!)
    }
  })

  it('keeps the ledger immutable while allowing full account deletion to cascade', async () => {
    await database!.query(
      'insert into public.reward_wallets(user_id,silver_balance) values($1,1)',
      [USER_DELETE],
    )
    await database!.query(`
      insert into public.reward_transactions(
        user_id,reason,silver_delta,gold_delta,silver_balance_after,gold_balance_after,
        source_type,source_key,rule_version
      ) values($1,'admin_adjustment',1,0,1,0,'test','account-delete','2026-08-18.2')
    `, [USER_DELETE])

    await expect(database!.query(
      'delete from public.reward_transactions where user_id=$1', [USER_DELETE],
    )).rejects.toThrow(/immutable/i)

    await database!.query('delete from auth.users where id=$1', [USER_DELETE])
    const remaining = await database!.query<{ count: number }>(
      'select count(*)::integer as count from public.reward_transactions where user_id=$1', [USER_DELETE],
    )
    expect(remaining.rows[0]?.count).toBe(0)
  })
})
