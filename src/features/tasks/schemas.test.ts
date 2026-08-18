import { describe, expect, it } from 'vitest'

import { createTaskSchema, isValidLocalDate, updateTaskSchema } from './schemas'

describe('task schemas', () => {
  it.each(['2024-02-29', '2026-08-17'])('accepts real local date %s', (date) => {
    expect(isValidLocalDate(date)).toBe(true)
  })

  it.each(['2026-02-29', '2026-13-01', '2026-04-31', '17/08/2026'])('rejects invalid date %s', (date) => {
    expect(isValidLocalDate(date)).toBe(false)
  })

  it('trims a task title and applies safe defaults', () => {
    expect(createTaskSchema.parse({ title: '  Plan tomorrow  ' })).toMatchObject({
      title: 'Plan tomorrow',
      priority: 'none',
    })
  })

  it('rejects an empty update', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false)
  })
})
