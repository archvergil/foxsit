import { describe, expect, it } from 'vitest'

import { flattenTaskProjects, taskProjectWithDescendants } from './taskProjectTree'
import type { TaskProject } from './types'

const makeProject = (id: string, name: string, parentProjectId: string | null, position: number): TaskProject => ({
  id, name, parentProjectId, position,
  userId: '11af0e2c-665e-4774-b6bb-4e97f839c5cb', colorToken: 'mint', icon: null,
  bannerAsset: null, bannerMonochrome: false, archivedAt: null,
  createdAt: `2026-08-18T12:00:0${position / 1000}.000Z`, updatedAt: '2026-08-18T12:00:00.000Z',
})

describe('task project hierarchy', () => {
  const work = makeProject('21af0e2c-665e-4774-b6bb-4e97f839c5cb', 'Work', null, 1000)
  const client = makeProject('31af0e2c-665e-4774-b6bb-4e97f839c5cb', 'Client', work.id, 1000)
  const launch = makeProject('41af0e2c-665e-4774-b6bb-4e97f839c5cb', 'Launch', client.id, 1000)
  const personal = makeProject('51af0e2c-665e-4774-b6bb-4e97f839c5cb', 'Personal', null, 2000)

  it('flattens roots and children with deterministic depths', () => {
    expect(flattenTaskProjects([launch, personal, client, work]).map(({ project, depth }) => [project.name, depth])).toEqual([
      ['Work', 0], ['Client', 1], ['Launch', 2], ['Personal', 0],
    ])
  })

  it('returns the complete branch used by task queries', () => {
    expect(taskProjectWithDescendants([personal, launch, client, work], work.id)).toEqual([work.id, client.id, launch.id])
  })
})
