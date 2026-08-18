import { describe, expect, it } from 'vitest'

import { calendarEventInputSchema, calendarEventFormSchema, resolveCalendarEventForm } from './schemas'

describe('Calendar event schemas', () => {
  it('converts a timed form from the profile timezone to UTC', () => {
    const form = calendarEventFormSchema.parse({
      title: 'Planning', description: '', allDay: false,
      startAt: '2026-08-17T09:00', endAt: '2026-08-17T10:30',
      startDate: '', endDate: '', category: '', colorToken: 'blue', location: '',
    })
    expect(resolveCalendarEventForm(form, 'America/Sao_Paulo')).toMatchObject({
      success: true,
      data: { startAt: '2026-08-17T12:00:00.000Z', endAt: '2026-08-17T13:30:00.000Z' },
    })
  })

  it('rejects a nonexistent DST wall-clock time', () => {
    const form = calendarEventFormSchema.parse({
      title: 'DST', description: '', allDay: false,
      startAt: '2026-03-08T02:30', endAt: '2026-03-08T03:30',
      startDate: '', endDate: '', category: '', colorToken: 'mint', location: '',
    })
    expect(resolveCalendarEventForm(form, 'America/New_York')).toEqual({
      success: false,
      field: 'startAt',
      message: 'That time does not exist in America/New_York.',
    })
  })

  it('requires exactly one valid temporal shape', () => {
    expect(calendarEventInputSchema.safeParse({
      title: 'Invalid', description: null, allDay: true,
      startAt: '2026-08-17T12:00:00.000Z', endAt: null,
      startDate: '2026-08-17', endDate: '2026-08-17',
      category: null, colorToken: 'blue', location: null,
    }).success).toBe(false)
  })
})
