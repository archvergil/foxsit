import { addLocalDays, localDateKey } from '@/lib/dates'
import type { Task } from '@/features/tasks/types'
import type { CalendarEvent } from './types'

export interface CalendarMonthDay {
  date: string
  dayNumber: number
  inMonth: boolean
}

export interface CalendarMonthModel {
  monthKey: string
  label: string
  gridStart: string
  gridEnd: string
  days: CalendarMonthDay[]
}

const dateFromKey = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`)
const dateKeyFromUtc = (date: Date) => date.toISOString().slice(0, 10)

export const monthKeyForDate = (date: Date, timeZone: string) => localDateKey(date, timeZone).slice(0, 7)

export const shiftMonthKey = (monthKey: string, months: number) => {
  const year = Number(monthKey.slice(0, 4))
  const month = Number(monthKey.slice(5, 7))
  return dateKeyFromUtc(new Date(Date.UTC(year, month - 1 + months, 1))).slice(0, 7)
}

export const buildCalendarMonth = (monthKey: string, weekStartsOn: number): CalendarMonthModel => {
  const firstDate = dateFromKey(`${monthKey}-01`)
  const offset = (firstDate.getUTCDay() - weekStartsOn + 7) % 7
  const gridStart = addLocalDays(`${monthKey}-01`, -offset)
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = addLocalDays(gridStart, index)
    return { date, dayNumber: Number(date.slice(8, 10)), inMonth: date.startsWith(monthKey) }
  })
  return {
    monthKey,
    label: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(firstDate),
    gridStart,
    gridEnd: days[41]?.date ?? gridStart,
    days,
  }
}

export const calendarWeekdays = (weekStartsOn: number) => {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: 7 }, (_, index) => names[(weekStartsOn + index) % 7] ?? '')
}

export const eventOccursOnDate = (event: CalendarEvent, date: string, timeZone: string) => {
  if (event.allDay) return Boolean(event.startDate && event.endDate && event.startDate <= date && event.endDate >= date)
  if (!event.startAt || !event.endAt) return false
  const startDate = localDateKey(new Date(event.startAt), timeZone)
  const inclusiveEnd = new Date(Math.max(new Date(event.startAt).getTime(), new Date(event.endAt).getTime() - 1))
  const endDate = localDateKey(inclusiveEnd, timeZone)
  return startDate <= date && endDate >= date
}

export const taskOccursOnDate = (task: Task, date: string, timeZone: string) => {
  if (task.scheduledDate) return task.scheduledDate === date
  return task.dueAt ? localDateKey(new Date(task.dueAt), timeZone) === date : false
}

export const formatCalendarEventTime = (event: CalendarEvent, timeZone: string) => {
  if (event.allDay || !event.startAt || !event.endAt) return 'All day'
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
  return `${formatter.format(new Date(event.startAt))}–${formatter.format(new Date(event.endAt))}`
}

export const formatCalendarDateLabel = (date: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(dateFromKey(date))
