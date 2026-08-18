import { describe, expect, it } from 'vitest'

import { calendarEventTags, emptyCalendarEventFilters, filterCalendarEvents } from './calendarFilters'
import type { CalendarEvent } from './types'

const events: CalendarEvent[] = [
  {
    id: 'event-1', userId: 'user-1', title: 'Product review', description: 'Discuss #launch with the team.',
    allDay: false, startAt: '2026-08-18T12:00:00.000Z', endAt: '2026-08-18T13:00:00.000Z', startDate: null, endDate: null,
    category: 'Work', colorToken: 'blue', location: 'Studio', createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z',
  },
  {
    id: 'event-2', userId: 'user-1', title: 'Long run', description: 'Easy #health session.',
    allDay: false, startAt: '2026-08-19T12:00:00.000Z', endAt: '2026-08-19T13:00:00.000Z', startDate: null, endDate: null,
    category: 'Personal', colorToken: 'mint', location: null, createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z',
  },
]

describe('calendar event filters', () => {
  it('derives normalized tags from event descriptions', () => {
    expect(calendarEventTags(events[0]!)).toEqual(['launch'])
  })

  it('filters persisted events by searchable fields and facets', () => {
    expect(filterCalendarEvents(events, { ...emptyCalendarEventFilters(), query: 'studio' })).toEqual([events[0]])
    expect(filterCalendarEvents(events, { ...emptyCalendarEventFilters(), colors: ['mint'], categories: ['Personal'] })).toEqual([events[1]])
    expect(filterCalendarEvents(events, { ...emptyCalendarEventFilters(), tags: ['launch'] })).toEqual([events[0]])
  })
})
