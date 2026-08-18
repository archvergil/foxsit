import { describe, expect, it } from 'vitest'

import { mergeVisibleTaskOrder, moveTaskInList } from './taskOrdering'
import type { Task } from './types'

const task = (id: string): Task => ({
  id,
  userId: '10000000-0000-4000-8000-000000000001',
  projectId: null,
  title: id,
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
})

describe('manual task ordering', () => {
  it('moves within boundaries without mutating the source list', () => {
    const source = [task('a'), task('b'), task('c')]
    expect(moveTaskInList(source, 'b', 'up').map(({ id }) => id)).toEqual(['b', 'a', 'c'])
    expect(moveTaskInList(source, 'a', 'up')).toBe(source)
    expect(source.map(({ id }) => id)).toEqual(['a', 'b', 'c'])
  })

  it('reorders only visible slots while preserving hidden global tasks', () => {
    const [a, b, c, d] = [task('a'), task('b'), task('c'), task('d')]
    expect(mergeVisibleTaskOrder([a, b, c, d], [d, b]).map(({ id }) => id))
      .toEqual(['a', 'd', 'c', 'b'])
  })
})
