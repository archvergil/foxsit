export type CalendarColorToken = 'mint' | 'coral' | 'blue' | 'sand' | 'slate'

export interface CalendarEvent {
  id: string
  userId: string
  title: string
  description: string | null
  allDay: boolean
  startAt: string | null
  endAt: string | null
  startDate: string | null
  endDate: string | null
  category: string | null
  colorToken: CalendarColorToken
  location: string | null
  createdAt: string
  updatedAt: string
}

export interface CalendarEventInput {
  title: string
  description: string | null
  allDay: boolean
  startAt: string | null
  endAt: string | null
  startDate: string | null
  endDate: string | null
  category: string | null
  colorToken: CalendarColorToken
  location: string | null
}

export interface CalendarEventRange {
  rangeStart: string
  rangeEnd: string
  localDateStart: string
  localDateEnd: string
}
