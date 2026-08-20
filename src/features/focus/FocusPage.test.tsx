import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import FocusPage from './FocusPage'

const timer = {
  status: 'idle' as const,
  ownerUserId: null,
  phase: 'short_break' as const,
  startedAt: null,
  pausedAt: null,
  accumulatedPausedMs: 0,
  taskId: null,
  cycleIndex: 0,
  focusMs: 25 * 60_000,
  shortBreakMs: 5 * 60_000,
  longBreakMs: 15 * 60_000,
  durationMs: 5 * 60_000,
  rewardRunId: null,
  rewardMode: null,
  rewardCompletedStacks: 0,
  rewardRequiredStacks: 0,
  completionStatus: 'idle' as const,
  completionAttempt: 0,
  configure: vi.fn(),
  selectPhase: vi.fn(),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  claimCompletion: vi.fn(),
  failCompletion: vi.fn(),
  retryCompletion: vi.fn(),
  finishPhase: vi.fn(),
  clear: vi.fn(),
}

const startRewardRun = vi.fn()
const abandonRewardRun = vi.fn()

vi.mock('@/features/auth/authContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}))

vi.mock('@/features/tasks/queries', () => ({
  useTaskDateContext: () => ({ timeZone: 'America/Sao_Paulo' }),
  useTaskList: () => ({
    data: [{ id: 'task-1', title: 'Plan the release', status: 'open' }],
    error: null,
    isPending: false,
  }),
}))

vi.mock('./pomodoroStore', () => ({ usePomodoroStore: () => timer }))
vi.mock('./useTimerClock', () => ({ useTimerClock: () => Date.now() }))
vi.mock('./notifications', () => ({
  notificationAvailability: 'unavailable',
  requestFocusNotifications: vi.fn(),
}))
vi.mock('./queries', () => ({
  useFocusSessions: () => ({ data: [], error: null, isPending: false }),
  useCreateFocusSession: () => ({ mutateAsync: vi.fn(), error: null, isPending: false }),
  useStartRewardFocusRun: () => ({ mutateAsync: startRewardRun, error: null, isPending: false }),
  useAbandonRewardFocusRun: () => ({ mutateAsync: abandonRewardRun, error: null, isPending: false }),
}))

describe('Focus session setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(timer, {
      status: 'idle',
      ownerUserId: null,
      phase: 'short_break',
      startedAt: null,
      pausedAt: null,
      accumulatedPausedMs: 0,
      taskId: null,
      cycleIndex: 0,
      focusMs: 25 * 60_000,
      shortBreakMs: 5 * 60_000,
      longBreakMs: 15 * 60_000,
      durationMs: 5 * 60_000,
      rewardRunId: null,
      rewardMode: null,
      rewardCompletedStacks: 0,
      rewardRequiredStacks: 0,
      completionStatus: 'idle',
      completionAttempt: 0,
    })
  })

  it('lets the user prepare the task link while an idle break phase is selected', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><FocusPage /></MemoryRouter>)

    const taskSelect = screen.getByRole('combobox', { name: 'Link a task' })
    expect(taskSelect).toBeEnabled()
    await user.selectOptions(taskSelect, 'task-1')
    expect(taskSelect).toHaveValue('task-1')
  })

  it('restores the preset matching persisted durations and starts it atomically', async () => {
    const user = userEvent.setup()
    Object.assign(timer, {
      phase: 'focus',
      focusMs: 30 * 60_000,
      shortBreakMs: 5 * 60_000,
      longBreakMs: 5 * 60_000,
      durationMs: 30 * 60_000,
    })
    startRewardRun.mockResolvedValue('run-30')
    render(<MemoryRouter><FocusPage /></MemoryRouter>)

    expect(screen.getByRole('button', { name: /30 \/ 5/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Start timer' }))

    expect(startRewardRun).toHaveBeenCalledWith({ mode: '30_5', description: null })
    expect(timer.start).toHaveBeenCalledWith(expect.objectContaining({
      rewardRunId: 'run-30',
      rewardMode: '30_5',
      rewardRequiredStacks: 4,
      durations: { focusMs: 30 * 60_000, shortBreakMs: 5 * 60_000, longBreakMs: 5 * 60_000 },
    }))
  })

  it('reuses the active rewarded run for the next focus stack', async () => {
    const user = userEvent.setup()
    Object.assign(timer, {
      phase: 'focus',
      focusMs: 25 * 60_000,
      shortBreakMs: 5 * 60_000,
      longBreakMs: 5 * 60_000,
      durationMs: 25 * 60_000,
      rewardRunId: 'run-existing',
      rewardMode: '25_5',
      rewardCompletedStacks: 1,
      rewardRequiredStacks: 3,
    })
    render(<MemoryRouter><FocusPage /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'Start timer' }))

    expect(startRewardRun).not.toHaveBeenCalled()
    expect(timer.start).toHaveBeenCalledWith(expect.objectContaining({
      rewardRunId: 'run-existing',
      rewardMode: '25_5',
      rewardRequiredStacks: 3,
    }))
  })

  it('keeps retry and stop available when an expired phase could not be saved', async () => {
    const user = userEvent.setup()
    Object.assign(timer, {
      status: 'running',
      ownerUserId: 'user-1',
      phase: 'focus',
      startedAt: Date.now() - 60_000,
      durationMs: 1_000,
      completionStatus: 'error',
    })
    render(<MemoryRouter><FocusPage /></MemoryRouter>)

    expect(screen.getByRole('button', { name: 'Retry save' })).toBeEnabled()
    const stop = screen.getByRole('button', { name: 'Stop' })
    expect(stop).toBeEnabled()
    await user.click(stop)
    expect(timer.clear).toHaveBeenCalled()
  })
})
