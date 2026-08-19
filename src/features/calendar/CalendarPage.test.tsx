import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import { HabitsRepositoryProvider } from '@/features/habits/HabitsRepositoryProvider'
import type { HabitsRepository } from '@/features/habits/repository'
import type { Habit, HabitLog } from '@/features/habits/types'
import { ProfileRepositoryProvider } from '@/features/settings/ProfileRepositoryProvider'
import type { ProfileRepository, UserProfile } from '@/features/settings/profileRepository'
import { TasksRepositoryProvider } from '@/features/tasks/TasksRepositoryProvider'
import type { TasksRepository } from '@/features/tasks/repository'
import type { Task } from '@/features/tasks/types'
import { CalendarRepositoryProvider } from './CalendarRepositoryProvider'
import type { CalendarRepository } from './repository'
import type { CalendarEvent, CalendarEventInput } from './types'
import CalendarPage from './CalendarPage'

const USER_ID = '81000000-0000-4000-8000-000000000001'

class MemoryCalendarRepository implements CalendarRepository {
  events: CalendarEvent[] = []
  listEvents(): Promise<CalendarEvent[]> { return Promise.resolve(this.events) }
  createEvent(userId: string, input: CalendarEventInput): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: crypto.randomUUID(), userId, ...input,
      createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
    }
    this.events.push(event)
    return Promise.resolve(event)
  }
  updateEvent(_userId: string, eventId: string, input: CalendarEventInput): Promise<CalendarEvent> {
    const current = this.events.find(({ id }) => id === eventId)
    if (!current) return Promise.reject(new Error('Event not found.'))
    const updated = { ...current, ...input, updatedAt: '2026-08-17T13:00:00.000Z' }
    this.events = this.events.map((event) => event.id === eventId ? updated : event)
    return Promise.resolve(updated)
  }
  deleteEvent(_userId: string, eventId: string): Promise<void> {
    this.events = this.events.filter(({ id }) => id !== eventId)
    return Promise.resolve()
  }
}

const scheduledTask: Task = {
  id: '82000000-0000-4000-8000-000000000002', userId: USER_ID, projectId: null,
  title: 'Scheduled task', notes: null, status: 'open', priority: 'none',
  scheduledDate: '2026-08-17', dueAt: null, estimateMinutes: null, position: 1000,
  completedAt: null, archivedAt: null,
  createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
}

const tasksRepository: TasksRepository = {
  listProjects: () => Promise.resolve([]),
  createProject: () => Promise.reject(new Error('Not used.')),
  updateProject: () => Promise.reject(new Error('Not used.')),
  deleteProject: () => Promise.reject(new Error('Not used.')),
  listTasks: () => Promise.resolve([scheduledTask]),
  createTask: () => Promise.reject(new Error('Not used.')),
  updateTask: () => Promise.reject(new Error('Not used.')),
  setTaskStatus: () => Promise.reject(new Error('Not used.')),
  deleteTask: () => Promise.reject(new Error('Not used.')),
  reorderTasks: () => Promise.reject(new Error('Not used.')),
  listChecklistItems: () => Promise.resolve([]),
  createChecklistItem: () => Promise.reject(new Error('Not used.')),
  updateChecklistItem: () => Promise.reject(new Error('Not used.')),
  deleteChecklistItem: () => Promise.reject(new Error('Not used.')),
}

const scheduledHabit: Habit = {
  id: '84000000-0000-4000-8000-000000000001', userId: USER_ID, title: 'Read daily', description: null,
  icon: 'book-open', colorToken: 'sand', scheduleType: 'daily', weekdays: null, targetCount: 1,
  unit: 'chapter', position: 1000, isActive: true, archivedAt: null,
  createdAt: '2026-08-16T12:00:00.000Z', updatedAt: '2026-08-16T12:00:00.000Z',
}
const habitLog: HabitLog = {
  id: '85000000-0000-4000-8000-000000000001', userId: USER_ID, habitId: scheduledHabit.id,
  localDate: '2026-08-17', count: 1, status: 'completed', note: null, source: 'manual', sourceId: null,
  createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z',
}
const habitsRepository: HabitsRepository = {
  listProjects: () => Promise.resolve([]),
  createProject: () => Promise.reject(new Error('Not used.')),
  updateProject: () => Promise.reject(new Error('Not used.')),
  deleteProject: () => Promise.reject(new Error('Not used.')),
  listHabits: () => Promise.resolve([scheduledHabit]),
  createHabit: () => Promise.reject(new Error('Not used.')),
  updateHabit: () => Promise.reject(new Error('Not used.')),
  deleteHabit: () => Promise.reject(new Error('Not used.')),
  clearHabitHistory: () => Promise.reject(new Error('Not used.')),
  reorderHabits: () => Promise.reject(new Error('Not used.')),
  listLogs: () => Promise.resolve([habitLog]),
  upsertLog: () => Promise.reject(new Error('Not used.')),
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
  id: USER_ID, display_name: 'Calendar Tester', avatar_url: null, timezone: 'America/Sao_Paulo',
  week_starts_on: 1, theme: 'system', created_at: '2026-08-17T12:00:00.000Z', updated_at: '2026-08-17T12:00:00.000Z',
  calendar_show_events: true, calendar_show_tasks: true, calendar_show_habits: true,
}
const profileRepository: ProfileRepository = { getProfile: () => Promise.resolve(profile), updateCalendarPreferences: (_userId, preferences) => Promise.resolve({ ...profile, ...preferences }) }

const renderPage = (calendarRepository: CalendarRepository, initialEntry = '/calendar') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ProfileRepositoryProvider repository={profileRepository}>
          <CalendarRepositoryProvider repository={calendarRepository}>
            <HabitsRepositoryProvider repository={habitsRepository}>
              <TasksRepositoryProvider repository={tasksRepository}>
                <MemoryRouter initialEntries={[initialEntry]}>
                  <Routes>
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/calendar/week" element={<CalendarPage />} />
                    <Route path="/calendar/day/:date" element={<CalendarPage />} />
                  </Routes>
                </MemoryRouter>
              </TasksRepositoryProvider>
            </HabitsRepositoryProvider>
          </CalendarRepositoryProvider>
        </ProfileRepositoryProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Calendar month flow', () => {
  it('projects a task and persists event create, edit and delete', async () => {
    vi.setSystemTime(new Date('2026-08-17T15:00:00.000Z'))
    const repository = new MemoryCalendarRepository()
    const user = userEvent.setup()
    renderPage(repository)

    expect((await screen.findAllByText('Scheduled task')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Read daily')).length).toBeGreaterThan(0)
    expect(screen.getByText('Habit · Complete')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'New event' }))
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Planning session')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => expect(repository.events).toHaveLength(1))
    expect(repository.events[0]).toMatchObject({
      title: 'Planning session',
      startAt: '2026-08-17T12:00:00.000Z',
      endAt: '2026-08-17T13:00:00.000Z',
    })

    const eventSearch = screen.getByRole('textbox', { name: 'Search events' })
    await user.type(eventSearch, 'planning')
    expect(await screen.findByRole('button', { name: 'Edit event Planning session' })).toBeVisible()
    await user.clear(eventSearch)

    await user.click(await screen.findByRole('button', { name: 'Edit event Planning session' }))
    const title = screen.getByRole('textbox', { name: 'Title' })
    await user.clear(title)
    await user.type(title, 'Updated planning')
    await user.click(screen.getByRole('button', { name: 'Save event' }))
    await waitFor(() => expect(repository.events[0]?.title).toBe('Updated planning'))

    await user.click(await screen.findByRole('button', { name: 'Edit event Updated planning' }))
    await user.click(screen.getByRole('button', { name: 'Delete event' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete event' }))
    await waitFor(() => expect(repository.events).toHaveLength(0))
  }, 15_000)
})

describe('Calendar week flow', () => {
  it('opens a one-hour event editor from an empty time slot', async () => {
    vi.setSystemTime(new Date('2026-08-17T15:00:00.000Z'))
    const repository = new MemoryCalendarRepository()
    const user = userEvent.setup()
    renderPage(repository, '/calendar/week')

    expect((await screen.findAllByText('Scheduled task')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', {
      name: 'Create event on Monday, August 17, 2026 at 1 PM',
    }))
    expect(screen.getByLabelText('Starts · America/Sao_Paulo')).toHaveValue('2026-08-17T13:00')
    expect(screen.getByLabelText('Ends · America/Sao_Paulo')).toHaveValue('2026-08-17T14:00')
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Weekly planning')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => expect(repository.events).toHaveLength(1))
    expect(repository.events[0]).toMatchObject({
      title: 'Weekly planning',
      startAt: '2026-08-17T16:00:00.000Z',
      endAt: '2026-08-17T17:00:00.000Z',
    })
  }, 15_000)
})

describe('Calendar day flow', () => {
  it('creates from a day slot and navigates to the next local date', async () => {
    vi.setSystemTime(new Date('2026-08-17T15:00:00.000Z'))
    const repository = new MemoryCalendarRepository()
    const user = userEvent.setup()
    renderPage(repository, '/calendar/day/2026-08-17')

    expect((await screen.findAllByText('Scheduled task')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', {
      name: 'Create event on Monday, August 17, 2026 at 3 PM',
    }))
    expect(screen.getByLabelText('Starts · America/Sao_Paulo')).toHaveValue('2026-08-17T15:00')
    expect(screen.getByLabelText('Ends · America/Sao_Paulo')).toHaveValue('2026-08-17T16:00')
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Day review')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => expect(repository.events).toHaveLength(1))
    expect(repository.events[0]).toMatchObject({
      title: 'Day review',
      startAt: '2026-08-17T18:00:00.000Z',
      endAt: '2026-08-17T19:00:00.000Z',
    })
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect((await screen.findAllByRole('heading', { name: 'Tuesday, August 18, 2026' })).length).toBeGreaterThan(0)
  }, 15_000)
})
