import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import { calendarEventInputSchema } from './schemas'
import type { CalendarRepository } from './repository'
import type { CalendarEvent, CalendarEventInput } from './types'

type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row']

export class CalendarRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CalendarRepositoryError'
  }
}

const assertData = <T>(data: T | null, error: unknown, action: string): T => {
  if (error || data === null) throw new CalendarRepositoryError(`Could not ${action}.`, { cause: error })
  return data
}

const mapEvent = (row: CalendarEventRow): CalendarEvent => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  allDay: row.all_day,
  startAt: row.start_at,
  endAt: row.end_at,
  startDate: row.start_date,
  endDate: row.end_date,
  category: row.category,
  colorToken: row.color_token,
  location: row.location,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const rowFromInput = (input: CalendarEventInput) => {
  const value = calendarEventInputSchema.parse(input)
  return {
    title: value.title,
    description: value.description,
    all_day: value.allDay,
    start_at: value.startAt,
    end_at: value.endAt,
    start_date: value.startDate,
    end_date: value.endDate,
    category: value.category,
    color_token: value.colorToken,
    location: value.location,
  }
}

const sortEvents = (events: CalendarEvent[]) => [...events].sort((left, right) => {
  const leftStart = left.startDate ?? left.startAt ?? ''
  const rightStart = right.startDate ?? right.startAt ?? ''
  return leftStart.localeCompare(rightStart) || left.title.localeCompare(right.title)
})

export const createSupabaseCalendarRepository = (
  client: SupabaseClient<Database>,
): CalendarRepository => ({
  listEvents: async (userId, range) => {
    const [timed, allDay] = await Promise.all([
      client.from('calendar_events').select('*')
        .eq('user_id', userId).eq('all_day', false)
        .lt('start_at', range.rangeEnd).gt('end_at', range.rangeStart),
      client.from('calendar_events').select('*')
        .eq('user_id', userId).eq('all_day', true)
        .lte('start_date', range.localDateEnd).gte('end_date', range.localDateStart),
    ])
    return sortEvents([
      ...assertData(timed.data, timed.error, 'load timed events').map(mapEvent),
      ...assertData(allDay.data, allDay.error, 'load all-day events').map(mapEvent),
    ])
  },
  createEvent: async (userId, input) => {
    const { data, error } = await client.from('calendar_events')
      .insert({ user_id: userId, ...rowFromInput(input) }).select('*').single()
    return mapEvent(assertData(data, error, 'create the event'))
  },
  updateEvent: async (userId, eventId, input) => {
    const { data, error } = await client.from('calendar_events').update(rowFromInput(input))
      .eq('id', eventId).eq('user_id', userId).select('*').single()
    return mapEvent(assertData(data, error, 'update the event'))
  },
  deleteEvent: async (userId, eventId) => {
    const { data, error } = await client.from('calendar_events').delete()
      .eq('id', eventId).eq('user_id', userId).select('id').maybeSingle()
    assertData(data, error, 'delete the event')
  },
})
