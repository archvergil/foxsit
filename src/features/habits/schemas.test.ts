import { describe, expect, it } from 'vitest'

import { habitFormSchema, habitLogInputSchema, resolveHabitForm } from './schemas'

describe('habit schemas', () => {
  it('normalizes a weekday count habit', () => {
    const form = habitFormSchema.parse({
      title: ' Drink water ', description: '', icon: 'glass-water', colorToken: 'blue',
      scheduleType: 'weekdays', weekdays: ['5', '1', '3'], targetCount: '5', unit: 'glasses',
    })
    expect(resolveHabitForm(form)).toMatchObject({
      title: 'Drink water', weekdays: [1, 3, 5], targetCount: 5, unit: 'glasses',
    })
  })

  it('requires weekdays for a selective schedule and valid skipped logs', () => {
    expect(habitFormSchema.safeParse({
      title: 'Read', description: '', icon: 'book-open', colorToken: 'sand',
      scheduleType: 'weekdays', weekdays: [], targetCount: 1, unit: '',
    }).success).toBe(false)
    expect(habitLogInputSchema.safeParse({
      habitId: '91000000-0000-4000-8000-000000000001', localDate: '2026-08-17',
      count: 1, status: 'skipped', note: null,
    }).success).toBe(false)
  })
})
