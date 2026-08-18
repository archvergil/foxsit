import type { LocalApiClient } from '@/lib/localApi'
import { calendarEventInputSchema } from './schemas'
import type { CalendarRepository } from './repository'

export const createLocalCalendarRepository = (client: LocalApiClient): CalendarRepository => ({
  listEvents: (_userId, range) => {
    const params = new URLSearchParams({
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      localDateStart: range.localDateStart,
      localDateEnd: range.localDateEnd,
    })
    return client.get(`/v1/calendar-events?${params.toString()}`)
  },
  createEvent: (_userId, input) => client.post('/v1/calendar-events', calendarEventInputSchema.parse(input)),
  updateEvent: (_userId, eventId, input) => client.patch(
    `/v1/calendar-events/${eventId}`,
    calendarEventInputSchema.parse(input),
  ),
  deleteEvent: (_userId, eventId) => client.delete(`/v1/calendar-events/${eventId}`),
})
