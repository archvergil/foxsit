import { describe, expect, it } from 'vitest'

import { transitionTaskStatus } from './taskStatus'

const NOW = new Date('2026-08-17T12:00:00.000Z')

describe('transitionTaskStatus', () => {
  it('completes a task with a durable timestamp candidate', () => {
    expect(
      transitionTaskStatus(
        { status: 'open', completedAt: null, archivedAt: null },
        'completed',
        NOW,
      ),
    ).toEqual({
      status: 'completed',
      completedAt: NOW.toISOString(),
      archivedAt: null,
    })
  })

  it('reopens a completed task by clearing completion and archive timestamps', () => {
    expect(
      transitionTaskStatus(
        { status: 'completed', completedAt: '2026-08-16T10:00:00.000Z', archivedAt: null },
        'open',
        NOW,
      ),
    ).toEqual({ status: 'open', completedAt: null, archivedAt: null })
  })

  it('preserves completion history while archiving', () => {
    expect(
      transitionTaskStatus(
        { status: 'completed', completedAt: '2026-08-16T10:00:00.000Z', archivedAt: null },
        'archived',
        NOW,
      ),
    ).toEqual({
      status: 'archived',
      completedAt: '2026-08-16T10:00:00.000Z',
      archivedAt: NOW.toISOString(),
    })
  })
})
