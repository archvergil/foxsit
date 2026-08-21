import { describe, expect, it } from 'vitest'

import type { CalendarEvent } from './types'
import {
  changeTimedCalendarEvent,
  formatCalendarInteractionTime,
  isCalendarQuickTap,
  moveTimedCalendarEvent,
} from './calendarEventMove'

const event: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Planning',
  description: null,
  allDay: false,
  startAt: '2026-08-17T12:00:00.000Z',
  endAt: '2026-08-17T13:30:00.000Z',
  startDate: null,
  endDate: null,
  category: 'Work',
  colorToken: 'blue',
  location: null,
  createdAt: '2026-08-17T10:00:00.000Z',
  updatedAt: '2026-08-17T10:00:00.000Z',
}

describe('moveTimedCalendarEvent', () => {
  it('moves a timed event to another local day and hour while preserving duration', () => {
    const moved = moveTimedCalendarEvent(event, { date: '2026-08-19', minutes: 9 * 60 + 30 }, 'America/Sao_Paulo')

    expect(moved).toMatchObject({
      allDay: false,
      startDate: null,
      endDate: null,
      startAt: '2026-08-19T12:30:00.000Z',
      endAt: '2026-08-19T14:00:00.000Z',
    })
  })

  it('does not turn all-day events into timed events', () => {
    expect(moveTimedCalendarEvent({ ...event, allDay: true, startAt: null, endAt: null, startDate: '2026-08-17', endDate: '2026-08-17' }, { date: '2026-08-18', minutes: 600 }, 'UTC')).toBeNull()
  })

  it('resizes either event edge in 15-minute increments', () => {
    expect(changeTimedCalendarEvent(event, {
      kind: 'resize-start',
      drop: { date: '2026-08-17', minutes: 9 * 60 + 30 },
    }, 'America/Sao_Paulo')).toMatchObject({
      startAt: '2026-08-17T12:30:00.000Z',
      endAt: '2026-08-17T13:30:00.000Z',
    })

    expect(changeTimedCalendarEvent(event, {
      kind: 'resize-end',
      drop: { date: '2026-08-17', minutes: 11 * 60 },
    }, 'America/Sao_Paulo')).toMatchObject({
      startAt: '2026-08-17T12:00:00.000Z',
      endAt: '2026-08-17T14:00:00.000Z',
    })
  })

  it('rejects a resize shorter than 15 minutes', () => {
    expect(changeTimedCalendarEvent(event, {
      kind: 'resize-end',
      drop: { date: '2026-08-17', minutes: 9 * 60 },
    }, 'America/Sao_Paulo')).toBeNull()
  })

  it('formats the live interaction time for direct feedback', () => {
    expect(formatCalendarInteractionTime({
      eventId: event.id,
      kind: 'move',
      drop: { date: '2026-08-18', minutes: 9 * 60 + 15 },
      deltaX: 20,
      deltaY: 14,
    })).toBe('Move to 09:15')
  })

  it('distinguishes a quick touch from a hold or scroll gesture', () => {
    expect(isCalendarQuickTap(180, 2, 3)).toBe(true)
    expect(isCalendarQuickTap(351, 0, 0)).toBe(false)
    expect(isCalendarQuickTap(120, 7, 0)).toBe(false)
  })
})
