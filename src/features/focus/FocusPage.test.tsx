import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import FocusPage from './FocusPage'

const timer = {
  status: 'idle' as const,
  ownerUserId: null,
  phase: 'short_break' as const,
  focusMs: 25 * 60_000,
  shortBreakMs: 5 * 60_000,
  longBreakMs: 15 * 60_000,
  durationMs: 5 * 60_000,
  rewardRunId: null,
  rewardCompletedStacks: 0,
  rewardRequiredStacks: 0,
  configure: vi.fn(),
  selectPhase: vi.fn(),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  finishPhase: vi.fn(),
  clear: vi.fn(),
}

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
  useStartRewardFocusRun: () => ({ mutateAsync: vi.fn(), error: null, isPending: false }),
  useAbandonRewardFocusRun: () => ({ mutateAsync: vi.fn(), error: null, isPending: false }),
}))

describe('Focus session setup', () => {
  it('lets the user prepare the task link while an idle break phase is selected', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><FocusPage /></MemoryRouter>)

    const taskSelect = screen.getByRole('combobox', { name: 'Link a task' })
    expect(taskSelect).toBeEnabled()
    await user.selectOptions(taskSelect, 'task-1')
    expect(taskSelect).toHaveValue('task-1')
  })
})
