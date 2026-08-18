import { addLocalDays, formatTimestampForInput } from '@/lib/dates'
import { eventOccursOnDate } from './calendarMonth'
import type { CalendarEvent } from './types'

export interface CalendarWeekDay {
  date: string
  dayNumber: number
  shortLabel: string
}

export interface CalendarWeekModel {
  startDate: string
  endDate: string
  label: string
  days: CalendarWeekDay[]
}

export interface CalendarTimedSegment {
  event: CalendarEvent
  date: string
  startMinutes: number
  endMinutes: number
  column: number
  columnCount: number
}

const dateFromKey = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`)

export const startOfCalendarWeek = (dateKey: string, weekStartsOn: number) => {
  const offset = (dateFromKey(dateKey).getUTCDay() - weekStartsOn + 7) % 7
  return addLocalDays(dateKey, -offset)
}

export const shiftCalendarWeek = (weekStart: string, weeks: number) => addLocalDays(weekStart, weeks * 7)

const formatWeekLabel = (startDate: string, endDate: string) => {
  const start = dateFromKey(startDate)
  const end = dateFromKey(endDate)
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()
  const startMonth = start.getUTCMonth()
  const endMonth = end.getUTCMonth()
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', day: 'numeric' })
  const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })

  if (startYear !== endYear) return `${monthDay.format(start)}, ${startYear}–${monthDay.format(end)}, ${endYear}`
  if (startMonth !== endMonth) return `${monthDay.format(start)}–${monthDay.format(end)}, ${endYear}`
  const month = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long' }).format(start)
  return `${month} ${day.format(start)}–${day.format(end)}, ${endYear}`
}

export const buildCalendarWeek = (weekStart: string): CalendarWeekModel => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(weekStart, index)
    const value = dateFromKey(date)
    return {
      date,
      dayNumber: value.getUTCDate(),
      shortLabel: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' }).format(value),
    }
  })
  const endDate = days[6]?.date ?? weekStart
  return { startDate: weekStart, endDate, label: formatWeekLabel(weekStart, endDate), days }
}

const minutesFromTimestamp = (timestamp: string, timeZone: string) => {
  const localValue = formatTimestampForInput(timestamp, timeZone)
  return Number(localValue.slice(11, 13)) * 60 + Number(localValue.slice(14, 16))
}

const layoutDaySegments = (segments: CalendarTimedSegment[]) => {
  const sorted = [...segments].sort((left, right) =>
    left.startMinutes - right.startMinutes
    || left.endMinutes - right.endMinutes
    || left.event.title.localeCompare(right.event.title))
  let active: CalendarTimedSegment[] = []
  let group: CalendarTimedSegment[] = []
  let groupColumns = 1

  const finishGroup = () => {
    for (const segment of group) segment.columnCount = groupColumns
    group = []
    groupColumns = 1
  }

  for (const segment of sorted) {
    active = active.filter(({ endMinutes }) => endMinutes > segment.startMinutes)
    if (active.length === 0 && group.length > 0) finishGroup()
    const usedColumns = new Set(active.map(({ column }) => column))
    let column = 0
    while (usedColumns.has(column)) column += 1
    segment.column = column
    active.push(segment)
    group.push(segment)
    groupColumns = Math.max(groupColumns, active.length, column + 1)
  }
  finishGroup()
  return sorted
}

export const layoutWeekTimedEvents = (
  events: CalendarEvent[],
  week: CalendarWeekModel,
  timeZone: string,
) => week.days.flatMap(({ date }) => layoutCalendarDayTimedEvents(events, date, timeZone))

export const layoutCalendarDayTimedEvents = (
  events: CalendarEvent[],
  date: string,
  timeZone: string,
) => {
  const segments = events
    .filter((event): event is CalendarEvent & { startAt: string; endAt: string } => Boolean(
      !event.allDay && event.startAt && event.endAt && eventOccursOnDate(event, date, timeZone),
    ))
    .map<CalendarTimedSegment>((event) => {
      const startDate = formatTimestampForInput(event.startAt, timeZone).slice(0, 10)
      const endDate = formatTimestampForInput(event.endAt, timeZone).slice(0, 10)
      return {
        event,
        date,
        startMinutes: startDate === date ? minutesFromTimestamp(event.startAt, timeZone) : 0,
        endMinutes: endDate === date ? minutesFromTimestamp(event.endAt, timeZone) : 24 * 60,
        column: 0,
        columnCount: 1,
      }
    })
    .filter(({ endMinutes, startMinutes }) => endMinutes > startMinutes)
  return layoutDaySegments(segments)
}

export const calendarSlotDateTimes = (date: string, hour: number) => {
  const safeHour = Math.max(0, Math.min(23, Math.trunc(hour)))
  const startAt = `${date}T${String(safeHour).padStart(2, '0')}:00`
  const endAt = safeHour === 23
    ? `${addLocalDays(date, 1)}T00:00`
    : `${date}T${String(safeHour + 1).padStart(2, '0')}:00`
  return { startAt, endAt }
}

export const formatCalendarHour = (hour: number) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  hour: 'numeric',
}).format(new Date(Date.UTC(2026, 0, 1, hour)))
