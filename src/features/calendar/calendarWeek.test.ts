import { describe, expect, it } from 'vitest'

import type { CalendarEvent } from './types'
import {
  buildCalendarWeek,
  calendarSlotDateTimes,
  layoutCalendarDayTimedEvents,
  layoutWeekTimedEvents,
  shiftCalendarWeek,
  startOfCalendarWeek,
} from './calendarWeek'

const event = (id: string, title: string, startAt: string, endAt: string): CalendarEvent => ({
  id,
  userId: '20000000-0000-4000-8000-000000000002',
  title,
  description: null,
  allDay: false,
  startAt,
  endAt,
  startDate: null,
  endDate: null,
  category: null,
  colorToken: 'blue',
  location: null,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
})

describe('Calendar week model', () => {
  it('honors the profile week start and navigates across years', () => {
    expect(startOfCalendarWeek('2026-08-19', 1)).toBe('2026-08-17')
    expect(startOfCalendarWeek('2026-08-19', 0)).toBe('2026-08-16')
    expect(shiftCalendarWeek('2025-12-29', 1)).toBe('2026-01-05')
    expect(buildCalendarWeek('2025-12-29')).toMatchObject({
      endDate: '2026-01-04',
      label: 'Dec 29, 2025–Jan 4, 2026',
    })
  })

  it('assigns deterministic columns to overlapping events', () => {
    const week = buildCalendarWeek('2026-08-17')
    const segments = layoutWeekTimedEvents([
      event('a', 'First', '2026-08-17T12:00:00.000Z', '2026-08-17T14:00:00.000Z'),
      event('b', 'Second', '2026-08-17T13:00:00.000Z', '2026-08-17T15:00:00.000Z'),
      event('c', 'Later', '2026-08-17T16:00:00.000Z', '2026-08-17T17:00:00.000Z'),
    ], week, 'UTC')

    expect(segments.map(({ event: item, column, columnCount }) => [item.id, column, columnCount])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 1],
    ])
  })

  it('clips overnight events to each local day and creates safe one-hour slots', () => {
    const week = buildCalendarWeek('2026-08-17')
    const segments = layoutWeekTimedEvents([
      event('overnight', 'Overnight', '2026-08-18T02:30:00.000Z', '2026-08-18T04:30:00.000Z'),
    ], week, 'America/Sao_Paulo')

    expect(segments.map(({ date, startMinutes, endMinutes }) => ({ date, startMinutes, endMinutes }))).toEqual([
      { date: '2026-08-17', startMinutes: 23 * 60 + 30, endMinutes: 24 * 60 },
      { date: '2026-08-18', startMinutes: 0, endMinutes: 90 },
    ])
    expect(calendarSlotDateTimes('2026-08-17', 23)).toEqual({
      startAt: '2026-08-17T23:00',
      endAt: '2026-08-18T00:00',
    })
    expect(layoutCalendarDayTimedEvents([
      event('overnight', 'Overnight', '2026-08-18T02:30:00.000Z', '2026-08-18T04:30:00.000Z'),
    ], '2026-08-18', 'America/Sao_Paulo')).toMatchObject([
      { date: '2026-08-18', startMinutes: 0, endMinutes: 90 },
    ])
  })
})
