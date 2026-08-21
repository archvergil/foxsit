import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import { FocusRepositoryProvider } from '@/features/focus/FocusRepositoryProvider'
import type { FocusRepository } from '@/features/focus/repository'
import { ProfileRepositoryProvider } from '@/features/settings/ProfileRepositoryProvider'
import type { ProfileRepository, UserProfile } from '@/features/settings/profileRepository'
import { taskMatchesFilters } from './taskFilters'
import { transitionTaskStatus } from './taskStatus'
import { TasksRepositoryProvider } from './TasksRepositoryProvider'
import type { TasksRepository } from './repository'
import type {
  CreateChecklistItemInput,
  CreateTaskInput,
  CreateTaskProjectInput,
  Task,
  TaskChecklistItem,
  TaskFilters,
  TaskProject,
  TaskStatus,
  UpdateChecklistItemInput,
  UpdateTaskInput,
  UpdateTaskProjectInput,
} from './types'
import TasksPage from './TasksPage'

const USER_ID = '11af0e2c-665e-4774-b6bb-4e97f839c5cb'

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: crypto.randomUUID(),
  userId: USER_ID,
  projectId: null,
  title: 'Existing task',
  notes: null,
  status: 'open',
  priority: 'none',
  scheduledDate: null,
  dueAt: null,
  estimateMinutes: null,
  position: 1000,
  completedAt: null,
  archivedAt: null,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
  ...overrides,
})

class MemoryTasksRepository implements TasksRepository {
  tasks: Task[]
  projects: TaskProject[]
  checklist: TaskChecklistItem[] = []
  statusFailure: Promise<never> | null = null
  reorderFailure: Promise<never> | null = null
  conversions: Array<{ taskId: string; startTime: string }> = []

  constructor(tasks: Task[] = [], projects: TaskProject[] = []) {
    this.tasks = tasks
    this.projects = projects
  }

  listProjects(): Promise<TaskProject[]> { return Promise.resolve(this.projects) }
  createProject(userId: string, input: CreateTaskProjectInput): Promise<TaskProject> {
    const project: TaskProject = {
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      colorToken: input.colorToken,
      icon: input.icon ?? null,
      position: input.position ?? 1000,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.projects.push(project)
    return Promise.resolve(project)
  }
  updateProject(_userId: string, projectId: string, input: UpdateTaskProjectInput): Promise<TaskProject> {
    const project = this.projects.find(({ id }) => id === projectId)
    if (!project) return Promise.reject(new Error('Project not found.'))
    const updated = { ...project, ...input, updatedAt: new Date().toISOString() }
    this.projects = this.projects.map((item) => item.id === projectId ? updated : item)
    return Promise.resolve(updated)
  }
  deleteProject(_userId: string, projectId: string): Promise<void> {
    this.projects = this.projects.filter(({ id }) => id !== projectId)
    this.tasks = this.tasks.map((task) => task.projectId === projectId ? { ...task, projectId: null } : task)
    return Promise.resolve()
  }

  listTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const tasks = userId === USER_ID
      ? this.tasks.filter((task) => taskMatchesFilters(task, filters))
      : []
    return Promise.resolve(tasks)
  }

  createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    if (userId !== USER_ID) return Promise.reject(new Error('Wrong user.'))
    const task = createTask({
      title: input.title.trim(),
      projectId: input.projectId ?? null,
      scheduledDate: input.scheduledDate ?? null,
      position: this.tasks.length * 1000,
    })
    this.tasks.push(task)
    return Promise.resolve(task)
  }

  updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
    if (userId !== USER_ID) return Promise.reject(new Error('Wrong user.'))
    const task = this.tasks.find(({ id }) => id === taskId)
    if (!task) return Promise.reject(new Error('Task not found.'))
    const updated = { ...task, ...input, updatedAt: new Date().toISOString() }
    this.tasks = this.tasks.map((item) => item.id === taskId ? updated : item)
    return Promise.resolve(updated)
  }

  async setTaskStatus(
    userId: string,
    taskId: string,
    status: TaskStatus,
    now = new Date(),
  ): Promise<Task> {
    if (userId !== USER_ID) throw new Error('Wrong user.')
    if (this.statusFailure) await this.statusFailure
    const task = this.tasks.find(({ id }) => id === taskId)
    if (!task) throw new Error('Task not found.')
    const transition = transitionTaskStatus(task, status, now)
    const updated = { ...task, ...transition, updatedAt: now.toISOString() }
    this.tasks = this.tasks.map((item) => item.id === taskId ? updated : item)
    return updated
  }

  deleteTask(_userId: string, taskId: string): Promise<void> {
    this.tasks = this.tasks.filter(({ id }) => id !== taskId)
    return Promise.resolve()
  }
  convertTaskToCalendarEvent(_userId: string, taskId: string, startTime: string): Promise<string> {
    this.conversions.push({ taskId, startTime })
    this.tasks = this.tasks.filter(({ id }) => id !== taskId)
    return Promise.resolve(crypto.randomUUID())
  }
  reorderTasks(userId: string, orderedTaskIds: string[]): Promise<Task[]> {
    if (userId !== USER_ID) return Promise.reject(new Error('Wrong user.'))
    if (this.reorderFailure) return this.reorderFailure
    const positions = new Map(orderedTaskIds.map((id, index) => [id, (index + 1) * 1000]))
    this.tasks = this.tasks.map((task) => ({
      ...task,
      position: positions.get(task.id) ?? task.position,
    })).sort((left, right) => left.position - right.position)
    return Promise.resolve(this.tasks.filter(({ id }) => positions.has(id)))
  }
  listChecklistItems(_userId: string, taskId: string): Promise<TaskChecklistItem[]> {
    return Promise.resolve(this.checklist.filter((item) => item.taskId === taskId))
  }
  createChecklistItem(userId: string, input: CreateChecklistItemInput): Promise<TaskChecklistItem> {
    const item: TaskChecklistItem = {
      id: crypto.randomUUID(),
      userId,
      taskId: input.taskId,
      title: input.title,
      completed: false,
      position: input.position ?? 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.checklist.push(item)
    return Promise.resolve(item)
  }
  updateChecklistItem(_userId: string, itemId: string, input: UpdateChecklistItemInput): Promise<TaskChecklistItem> {
    const item = this.checklist.find(({ id }) => id === itemId)
    if (!item) return Promise.reject(new Error('Checklist item not found.'))
    const updated = { ...item, ...input, updatedAt: new Date().toISOString() }
    this.checklist = this.checklist.map((current) => current.id === itemId ? updated : current)
    return Promise.resolve(updated)
  }
  deleteChecklistItem(_userId: string, itemId: string): Promise<void> {
    this.checklist = this.checklist.filter(({ id }) => id !== itemId)
    return Promise.resolve()
  }
}

const authValue: AuthContextValue = {
  session: {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      app_metadata: {},
      user_metadata: { timezone: 'UTC' },
      aud: 'authenticated',
      created_at: '2026-08-17T12:00:00.000Z',
    },
  } satisfies Session,
  status: 'authenticated',
  signIn: () => Promise.resolve(),
  signUp: () => Promise.resolve(true),
  signOut: () => Promise.resolve(),
  requestPasswordReset: () => Promise.resolve(),
  updatePassword: () => Promise.resolve(),
}

const profile: UserProfile = {
  id: USER_ID,
  display_name: 'Test User',
  avatar_url: null,
  timezone: 'America/Sao_Paulo',
  week_starts_on: 1,
  calendar_show_events: true,
  calendar_show_tasks: true,
  calendar_show_habits: true,
  theme: 'system',
  created_at: '2026-08-17T12:00:00.000Z',
  updated_at: '2026-08-17T12:00:00.000Z',
}

const profileRepository: ProfileRepository = {
  getProfile: () => Promise.resolve(profile),
  updateCalendarPreferences: (_userId, preferences) => Promise.resolve({ ...profile, ...preferences }),
  updateProfile: (_userId, details) => Promise.resolve({ ...profile, ...details }),
  uploadAvatar: () => Promise.resolve('data:image/png;base64,'),
}

const focusRepository: FocusRepository = {
  listSessions: () => Promise.resolve([]),
  createSession: () => Promise.reject(new Error('Not implemented in this test repository.')),
  deleteSession: () => Promise.resolve(),
}

const renderPage = (repository: TasksRepository, route = '/tasks') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ProfileRepositoryProvider repository={profileRepository}>
          <FocusRepositoryProvider repository={focusRepository}>
            <TasksRepositoryProvider repository={repository}>
              <MemoryRouter initialEntries={[route]}>
                <Routes>
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/tasks/today" element={<TasksPage />} />
                  <Route path="/tasks/project/:projectId" element={<TasksPage />} />
                </Routes>
              </MemoryRouter>
            </TasksRepositoryProvider>
          </FocusRepositoryProvider>
        </ProfileRepositoryProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('TasksPage daily flow', () => {
  it('creates an Inbox task with Enter and completes it', async () => {
    vi.setSystemTime(new Date('2026-08-18T01:30:00.000Z'))
    const user = userEvent.setup()
    const repository = new MemoryTasksRepository()
    renderPage(repository)

    await waitFor(() => expect(screen.getByLabelText('Scheduled date')).toHaveValue('2026-08-17'))
    const title = await screen.findByRole('textbox', { name: 'Task title' })
    await user.type(title, 'Prepare tomorrow{Enter}')

    expect(await screen.findByText('Prepare tomorrow')).toBeInTheDocument()
    expect(repository.tasks[0]?.scheduledDate).toBe('2026-08-17')
    await user.click(screen.getByRole('button', { name: 'Complete Prepare tomorrow' }))

    await waitFor(() => expect(screen.queryByText('Prepare tomorrow')).not.toBeInTheDocument())
    expect(repository.tasks[0]?.status).toBe('completed')
  })

  it('uses the user timezone date when adding from Today', async () => {
    vi.setSystemTime(new Date('2026-08-18T01:30:00.000Z'))
    const user = userEvent.setup()
    const repository = new MemoryTasksRepository()
    renderPage(repository, '/tasks/today')

    await waitFor(() => expect(screen.getByLabelText('Scheduled date')).toHaveValue('2026-08-17'))
    await user.type(screen.getByRole('textbox', { name: 'Task title' }), 'Review Today{Enter}')

    expect(await screen.findByText('Review Today')).toBeInTheDocument()
    expect(repository.tasks[0]?.scheduledDate).toBe('2026-08-17')
  })

  it('rolls back optimistic completion and shows a durable-write error', async () => {
    const task = createTask({ title: 'Must remain visible' })
    const repository = new MemoryTasksRepository([task])
    let rejectStatus: ((reason?: unknown) => void) | undefined
    repository.statusFailure = new Promise<never>((_resolve, reject) => {
      rejectStatus = reject
    })
    const user = userEvent.setup()
    renderPage(repository)

    expect(await screen.findByText(task.title)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: `Complete ${task.title}` }))
    await waitFor(() => expect(screen.queryByText(task.title)).not.toBeInTheDocument())

    rejectStatus?.(new Error('Could not change the task status.'))

    expect(await screen.findByText(task.title)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not change the task status.')
    expect(repository.tasks[0]?.status).toBe('open')
  })

  it('edits task details in the profile timezone and persists a checklist', async () => {
    const task = createTask({ title: 'Draft release' })
    const repository = new MemoryTasksRepository([task])
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: `Open details for ${task.title}` }))
    const title = screen.getByRole('textbox', { name: 'Title' })
    await user.clear(title)
    await user.type(title, 'Publish release')
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Include migration notes')
    await user.type(screen.getByRole('spinbutton', { name: 'Focus estimate' }), '45')
    await user.type(screen.getByLabelText(/Deadline/), '2026-08-18T01:30')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(repository.tasks[0]).toMatchObject({
      title: 'Publish release',
      notes: 'Include migration notes',
      estimateMinutes: 45,
      dueAt: '2026-08-18T04:30:00.000Z',
    }))

    await user.type(screen.getByRole('textbox', { name: 'New checklist item' }), 'Run final checks')
    await user.click(screen.getByRole('button', { name: 'Add checklist item' }))
    expect(await screen.findByText('Run final checks')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Complete Run final checks' }))
    await waitFor(() => expect(repository.checklist[0]?.completed).toBe(true))
  }, 15_000)

  it('atomically converts an open task into a calendar event after asking only for its time', async () => {
    const task = createTask({ title: 'Plan launch', scheduledDate: '2026-08-21', estimateMinutes: 45 })
    const repository = new MemoryTasksRepository([task])
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: `Open details for ${task.title}` }))
    await user.click(screen.getByRole('button', { name: 'Turn into event' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose a start time' })
    expect(dialog).toHaveTextContent('2026-08-21')
    expect(dialog).toHaveTextContent('45 minutes')
    const startTime = screen.getByLabelText('Start time')
    await user.clear(startTime)
    await user.type(startTime, '14:30')
    await user.click(within(dialog).getByRole('button', { name: 'Turn into event' }))

    await waitFor(() => expect(repository.conversions).toEqual([{ taskId: task.id, startTime: '14:30' }]))
    expect(repository.tasks).toHaveLength(0)
    expect(screen.queryByLabelText(`Details for ${task.title}`)).not.toBeInTheDocument()
  })

  it('creates a project and opens its task view', async () => {
    const repository = new MemoryTasksRepository()
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'New project' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Personal launch')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Color' }), 'blue')
    await user.click(screen.getByRole('button', { name: 'Save project' }))

    expect(await screen.findByRole('heading', { name: 'Personal launch' })).toBeInTheDocument()
    expect(repository.projects).toHaveLength(1)
    expect(repository.projects[0]).toMatchObject({ name: 'Personal launch', colorToken: 'blue' })
  })

  it('reorders tasks with accessible controls and persists positions', async () => {
    const first = createTask({ title: 'First task', position: 1000 })
    const second = createTask({ title: 'Second task', position: 2000 })
    const repository = new MemoryTasksRepository([first, second])
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'Move Second task up' }))

    await waitFor(() => expect(repository.tasks.map(({ title, position }) => ({ title, position }))).toEqual([
      { title: 'Second task', position: 1000 },
      { title: 'First task', position: 2000 },
    ]))
    expect(screen.getAllByRole('button', { name: /Open details for/ }).map(({ textContent }) => textContent))
      .toEqual(['Second task', 'First task'])
  })

  it('rolls back an optimistic reorder when durable persistence fails', async () => {
    const first = createTask({ title: 'First task', position: 1000 })
    const second = createTask({ title: 'Second task', position: 2000 })
    const repository = new MemoryTasksRepository([first, second])
    let rejectReorder: ((reason?: unknown) => void) | undefined
    repository.reorderFailure = new Promise<never>((_resolve, reject) => {
      rejectReorder = reject
    })
    const user = userEvent.setup()
    renderPage(repository)

    await user.click(await screen.findByRole('button', { name: 'Move Second task up' }))
    expect(screen.getAllByRole('button', { name: /Open details for/ }).map(({ textContent }) => textContent))
      .toEqual(['Second task', 'First task'])

    rejectReorder?.(new Error('Could not save the task order.'))

    await waitFor(() => expect(
      screen.getAllByRole('button', { name: /Open details for/ }).map(({ textContent }) => textContent),
    ).toEqual(['First task', 'Second task']))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save the task order.')
  })
})
