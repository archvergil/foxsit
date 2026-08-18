import type { CalendarEvent, CalendarEventInput, CalendarEventRange } from './types'

export interface CalendarRepository {
  listEvents(userId: string, range: CalendarEventRange): Promise<CalendarEvent[]>
  createEvent(userId: string, input: CalendarEventInput): Promise<CalendarEvent>
  updateEvent(userId: string, eventId: string, input: CalendarEventInput): Promise<CalendarEvent>
  deleteEvent(userId: string, eventId: string): Promise<void>
}

export const calendarQueryKeys = {
  all: ['calendar'] as const,
  lists: (userId: string) => ['calendar', 'events', userId] as const,
  list: (userId: string, range: CalendarEventRange) => [
    'calendar',
    'events',
    userId,
    range.rangeStart,
    range.rangeEnd,
    range.localDateStart,
    range.localDateEnd,
  ] as const,
}
