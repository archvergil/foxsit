import { describe, expect, it } from 'vitest'

import { habitFormSchema, habitLogInputSchema, habitProjectFormSchema, resolveHabitForm, resolveHabitProjectForm } from './schemas'

describe('habit schemas', () => {
  it('normalizes a weekday count habit', () => {
    const form = habitFormSchema.parse({
      title: ' Drink water ', description: '', icon: 'glass-water', colorToken: 'blue',
      projectId: '', scheduleType: 'weekdays', weekdays: ['5', '1', '3'], targetCount: '5', unit: 'glasses',
    })
    expect(resolveHabitForm(form)).toMatchObject({
      title: 'Drink water', weekdays: [1, 3, 5], targetCount: 5, unit: 'glasses',
    })
  })

  it('requires weekdays for a selective schedule and valid skipped logs', () => {
    expect(habitFormSchema.safeParse({
      title: 'Read', description: '', icon: 'book-open', colorToken: 'sand',
      projectId: '', scheduleType: 'weekdays', weekdays: [], targetCount: 1, unit: '',
    }).success).toBe(false)
    expect(habitLogInputSchema.safeParse({
      habitId: '91000000-0000-4000-8000-000000000001', localDate: '2026-08-17',
      count: 1, status: 'skipped', note: null,
    }).success).toBe(false)
  })

  it('keeps a valid custom hex color and rejects unsafe values', () => {
    const form = habitFormSchema.parse({
      title: 'Walk', description: '', icon: 'footprints', colorToken: 'mint', customColor: '#3A7D78',
      projectId: '', scheduleType: 'daily', weekdays: [], targetCount: 1, unit: '',
    })
    expect(resolveHabitForm(form).customColor).toBe('#3A7D78')
    expect(habitFormSchema.safeParse({
      ...form, customColor: 'not-a-color',
    }).success).toBe(false)
  })

  it('normalizes a visual project and rejects banners from the Workout catalog', () => {
    const form = habitProjectFormSchema.parse({
      name: '  Fitness  ', icon: 'dumbbell', colorToken: 'coral', customColor: '',
      bannerAsset: 'habits_3.gif', bannerMonochrome: true,
    })
    expect(resolveHabitProjectForm(form, 2000)).toMatchObject({
      name: 'Fitness', icon: 'dumbbell', bannerAsset: 'habits_3.gif', bannerMonochrome: true,
    })
    expect(habitProjectFormSchema.safeParse({ ...form, bannerAsset: 'workout_3.gif' }).success).toBe(false)
  })
})
