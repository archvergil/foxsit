import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FocusHistory } from './FocusHistory'
import type { FocusSession } from './types'

const session: FocusSession = {
  id: 'f1000000-0000-4000-8000-000000000001',
  userId: 'f2000000-0000-4000-8000-000000000001',
  taskId: null,
  focusRunId: null,
  startedAt: '2026-08-20T12:00:00.000Z',
  endedAt: '2026-08-20T12:25:00.000Z',
  plannedSeconds: 1500,
  focusedSeconds: 1500,
  sessionType: 'focus',
  completed: true,
  createdAt: '2026-08-20T12:25:00.000Z',
}

describe('FocusHistory', () => {
  it('requires confirmation before deleting a durable session', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <FocusHistory
        sessions={[session]}
        tasks={[]}
        timeZone="America/Sao_Paulo"
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onDelete={onDelete}
        deletingSessionId={null}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete Focus session' }))
    expect(onDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete session' }))
    expect(onDelete).toHaveBeenCalledWith(session.id)
  })
})
