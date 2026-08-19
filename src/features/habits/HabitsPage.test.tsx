import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import { ProfileRepositoryProvider } from '@/features/settings/ProfileRepositoryProvider'
import type { ProfileRepository, UserProfile } from '@/features/settings/profileRepository'
import { HabitsRepositoryProvider } from './HabitsRepositoryProvider'
import type { HabitLogRange, HabitsRepository } from './repository'
import type { Habit, HabitInput, HabitLog, HabitLogInput, HabitProject, HabitProjectInput } from './types'
import HabitsPage from './HabitsPage'

const USER_ID = '83000000-0000-4000-8000-000000000001'

class MemoryHabitsRepository implements HabitsRepository {
  habits: Habit[] = []
  logs: HabitLog[] = []
  projects: HabitProject[] = []

  listProjects(): Promise<HabitProject[]> {
    return Promise.resolve([...this.projects].sort((left, right) => left.position - right.position))
  }

  createProject(userId: string, input: HabitProjectInput): Promise<HabitProject> {
    const project: HabitProject = {
      id: crypto.randomUUID(), userId, ...input,
      createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
    }
    this.projects.push(project)
    return Promise.resolve(project)
  }

  updateProject(_userId: string, projectId: string, input: HabitProjectInput): Promise<HabitProject> {
    const current = this.projects.find((project) => project.id === projectId)
    if (!current) return Promise.reject(new Error('Habit project not found.'))
    const updated = { ...current, ...input, updatedAt: '2026-08-17T13:00:00.000Z' }
    this.projects = this.projects.map((project) => project.id === projectId ? updated : project)
    return Promise.resolve(updated)
  }

  deleteProject(_userId: string, projectId: string): Promise<void> {
    this.projects = this.projects.filter((project) => project.id !== projectId)
    this.habits = this.habits.map((habit) => habit.projectId === projectId ? { ...habit, projectId: null } : habit)
    return Promise.resolve()
  }

  listHabits(_userId: string, includeInactive = false): Promise<Habit[]> {
    return Promise.resolve(this.habits.filter((habit) => includeInactive || habit.isActive))
  }

  createHabit(userId: string, input: HabitInput): Promise<Habit> {
    const habit: Habit = {
      id: crypto.randomUUID(), userId, ...input,
      archivedAt: input.isActive ? null : '2026-08-17T12:00:00.000Z',
      createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
    }
    this.habits.push(habit)
    return Promise.resolve(habit)
  }

  updateHabit(_userId: string, habitId: string, input: HabitInput): Promise<Habit> {
    const current = this.habits.find((habit) => habit.id === habitId)
    if (!current) return Promise.reject(new Error('Habit not found.'))
    const updated = {
      ...current, ...input,
      archivedAt: input.isActive ? null : current.archivedAt ?? '2026-08-17T13:00:00.000Z',
      updatedAt: '2026-08-17T13:00:00.000Z',
    }
    this.habits = this.habits.map((habit) => habit.id === habitId ? updated : habit)
    return Promise.resolve(updated)
  }

  deleteHabit(_userId: string, habitId: string): Promise<void> {
    this.habits = this.habits.filter((habit) => habit.id !== habitId)
    this.logs = this.logs.filter((log) => log.habitId !== habitId)
    return Promise.resolve()
  }

  reorderHabits(_userId: string, orderedHabitIds: string[]): Promise<Habit[]> {
    const positions = new Map(orderedHabitIds.map((id, index) => [id, (index + 1) * 1000]))
    this.habits = this.habits.map((habit) => ({ ...habit, position: positions.get(habit.id) ?? habit.position }))
      .sort((left, right) => left.position - right.position)
    return Promise.resolve(this.habits.filter(({ isActive }) => isActive))
  }

  listLogs(_userId: string, range: HabitLogRange): Promise<HabitLog[]> {
    return Promise.resolve(this.logs.filter((log) => (
      log.localDate >= range.dateStart && log.localDate <= range.dateEnd
      && (!range.habitId || log.habitId === range.habitId)
    )))
  }

  upsertLog(userId: string, input: HabitLogInput): Promise<HabitLog> {
    const current = this.logs.find((log) => log.habitId === input.habitId && log.localDate === input.localDate)
    const log: HabitLog = current
      ? { ...current, ...input, updatedAt: '2026-08-17T13:00:00.000Z' }
      : {
          id: crypto.randomUUID(), userId, ...input, source: 'manual', sourceId: null,
          createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
        }
    this.logs = [...this.logs.filter((item) => item.id !== log.id), log]
    return Promise.resolve(log)
  }
}

const session = {
  access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer',
  user: { id: USER_ID, app_metadata: {}, user_metadata: { timezone: 'America/Sao_Paulo' }, aud: 'authenticated', created_at: '2026-08-17T12:00:00.000Z' },
} satisfies Session
const authValue: AuthContextValue = {
  session, status: 'authenticated', signIn: () => Promise.resolve(), signUp: () => Promise.resolve(true),
  signOut: () => Promise.resolve(), requestPasswordReset: () => Promise.resolve(), updatePassword: () => Promise.resolve(),
}
const profile: UserProfile = {
  id: USER_ID, display_name: 'Habit Tester', avatar_url: null, timezone: 'America/Sao_Paulo',
  week_starts_on: 1, theme: 'system', created_at: '2026-08-17T12:00:00.000Z', updated_at: '2026-08-17T12:00:00.000Z',
}
const profileRepository: ProfileRepository = { getProfile: () => Promise.resolve(profile) }

const renderPage = (repository: HabitsRepository, initialEntry = '/habits') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ProfileRepositoryProvider repository={profileRepository}>
          <HabitsRepositoryProvider repository={repository}>
            <MemoryRouter initialEntries={[initialEntry]}><HabitsPage /></MemoryRouter>
          </HabitsRepositoryProvider>
        </ProfileRepositoryProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Habits Today flow', () => {
  it('creates a visual project and assigns a new habit to it', async () => {
    vi.setSystemTime(new Date('2026-08-18T15:00:00.000Z'))
    const repository = new MemoryHabitsRepository()
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'New project' }))
    await user.type(within(screen.getByLabelText('Create habit project')).getByRole('textbox', { name: 'Name' }), 'Fitness')
    await user.click(screen.getByRole('button', { name: 'Fitness' }))
    await user.click(screen.getByRole('button', { name: 'Collection 2' }))
    await user.click(screen.getByRole('checkbox', { name: 'Black & white' }))
    await user.click(within(screen.getByLabelText('Create habit project')).getByRole('button', { name: 'Create project' }))

    await waitFor(() => expect(repository.projects[0]).toMatchObject({
      name: 'Fitness', icon: 'dumbbell', bannerAsset: 'habits_2.gif', bannerMonochrome: true,
    }))
    expect(await screen.findByText('Fitness')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'New habit' }))
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Morning workout')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Project' }), repository.projects[0]!.id)
    await user.click(within(screen.getByLabelText('Create habit')).getByRole('button', { name: 'Create habit' }))

    await waitFor(() => expect(repository.habits[0]?.projectId).toBe(repository.projects[0]?.id))
    expect(await screen.findByText('Morning workout')).toBeVisible()
  }, 15_000)

  it('reorders active habits with accessible controls and durable positions', async () => {
    vi.setSystemTime(new Date('2026-08-18T15:00:00.000Z'))
    const repository = new MemoryHabitsRepository()
    const makeHabit = (id: string, title: string, position: number): Habit => ({
      id, userId: USER_ID, title, description: null, icon: 'circle-check-big', colorToken: 'mint',
      scheduleType: 'daily', weekdays: null, targetCount: 1, unit: null, position, isActive: true,
      archivedAt: null, createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    })
    repository.habits = [
      makeHabit('84000000-0000-4000-8000-000000000001', 'Read', 1000),
      makeHabit('84000000-0000-4000-8000-000000000002', 'Stretch', 2000),
    ]
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'Move Stretch up' }))
    await waitFor(() => expect(repository.habits.map(({ title, position }) => ({ title, position }))).toEqual([
      { title: 'Stretch', position: 1000 }, { title: 'Read', position: 2000 },
    ]))
    const cards = screen.getAllByRole('article')
    expect(cards[0]).toHaveTextContent('Stretch')
  })

  it('persists a count habit, progress, undo, edit and delete', async () => {
    vi.setSystemTime(new Date('2026-08-17T15:00:00.000Z'))
    const repository = new MemoryHabitsRepository()
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'New habit' }))
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Drink water')
    await user.clear(screen.getByRole('spinbutton', { name: 'Daily target' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Daily target' }), '2')
    await user.type(screen.getByRole('textbox', { name: 'Unit' }), 'glasses')
    await user.click(within(screen.getByLabelText('Create habit')).getByRole('button', { name: 'Create habit' }))

    await waitFor(() => expect(repository.habits).toHaveLength(1))
    expect(await screen.findByText('0/2 glasses')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Increment Drink water' }))
    await waitFor(() => expect(repository.logs[0]).toMatchObject({ count: 1, status: 'in_progress' }))
    expect(await screen.findByText('1/2 glasses')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Increment Drink water' }))
    await waitFor(() => expect(repository.logs[0]).toMatchObject({ count: 2, status: 'completed' }))
    expect(await screen.findByText('2/2 glasses')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Undo Drink water' }))
    await waitFor(() => expect(repository.logs[0]).toMatchObject({ count: 1, status: 'in_progress' }))
    await user.click(screen.getByRole('button', { name: 'Skip Drink water' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason optional' }), 'Recovery day')
    await user.click(screen.getByRole('button', { name: 'Confirm skip' }))
    await waitFor(() => expect(repository.logs[0]).toMatchObject({ count: 0, status: 'skipped', note: 'Recovery day' }))
    await user.click(screen.getByRole('button', { name: 'Restore Drink water' }))
    await waitFor(() => expect(repository.logs[0]).toMatchObject({ count: 0, status: 'in_progress', note: null }))
    await user.click(screen.getByRole('button', { name: 'Edit habit Drink water' }))
    const title = screen.getByRole('textbox', { name: 'Title' })
    await user.clear(title)
    await user.type(title, 'Hydrate')
    await user.click(screen.getByRole('button', { name: 'Save habit' }))
    await waitFor(() => expect(repository.habits[0]?.title).toBe('Hydrate'))

    await user.click(await screen.findByRole('button', { name: 'Edit habit Hydrate' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete habit' }))
    await waitFor(() => expect(repository.habits).toHaveLength(0))
    expect(await screen.findByText('Your first habit starts here.')).toBeVisible()
  }, 15_000)

  it('derives insights from history and durably restores an archived habit', async () => {
    vi.setSystemTime(new Date('2026-08-18T15:00:00.000Z'))
    const repository = new MemoryHabitsRepository()
    const archivedHabit: Habit = {
      id: '84000000-0000-4000-8000-000000000002',
      userId: USER_ID,
      title: 'Meditate',
      description: null,
      icon: 'brain',
      colorToken: 'blue',
      scheduleType: 'daily',
      weekdays: null,
      targetCount: 1,
      unit: 'session',
      position: 1000,
      isActive: false,
      archivedAt: '2026-08-18T14:00:00.000Z',
      createdAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-18T14:00:00.000Z',
    }
    repository.habits = [archivedHabit]
    repository.logs = ['2026-08-17', '2026-08-18'].map((localDate, index): HabitLog => ({
      id: `85000000-0000-4000-8000-00000000000${index + 1}`,
      userId: USER_ID,
      habitId: archivedHabit.id,
      localDate,
      count: 1,
      status: 'completed',
      note: null,
      source: 'manual',
      sourceId: null,
      createdAt: `${localDate}T12:00:00.000Z`,
      updatedAt: `${localDate}T12:00:00.000Z`,
    }))
    const user = userEvent.setup()
    renderPage(repository, '/habits/insights')

    expect(await screen.findByRole('heading', { name: 'Read the pattern, not a guess.' })).toBeVisible()
    const longest = (await screen.findByText('Longest streak')).closest('article')
    expect(longest).not.toBeNull()
    expect(within(longest!).getByText('2')).toBeVisible()
    expect(screen.getByText('2 of 9 scheduled days completed this month.', { exact: false })).toBeVisible()
    expect(screen.getByRole('img', { name: /2 completed/ })).toBeVisible()
    expect(screen.getByText('Meditate is archived.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(repository.habits[0]).toMatchObject({ isActive: true, archivedAt: null }))
    expect(screen.queryByText('Meditate is archived.')).not.toBeInTheDocument()
  }, 15_000)
})
