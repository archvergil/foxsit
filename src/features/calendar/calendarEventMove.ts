import { useRef, useState, type PointerEvent } from 'react'

import { localDateTimeToTimestamp } from '@/lib/dates'
import type { CalendarEvent, CalendarEventInput } from './types'

export interface CalendarEventDrop {
  date: string
  minutes: number
}

const eventInput = (event: CalendarEvent): CalendarEventInput => ({
  title: event.title,
  description: event.description,
  allDay: event.allDay,
  startAt: event.startAt,
  endAt: event.endAt,
  startDate: event.startDate,
  endDate: event.endDate,
  category: event.category,
  colorToken: event.colorToken,
  location: event.location,
})

const localDateTime = (date: string, minutes: number) => {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** Produces a valid durable event update while preserving its elapsed duration. */
export const moveTimedCalendarEvent = (
  event: CalendarEvent,
  drop: CalendarEventDrop,
  timeZone: string,
): CalendarEventInput | null => {
  if (event.allDay || !event.startAt || !event.endAt) return null
  const startAt = localDateTimeToTimestamp(localDateTime(drop.date, drop.minutes), timeZone)
  if (!startAt) return null
  const duration = new Date(event.endAt).getTime() - new Date(event.startAt).getTime()
  const endAt = new Date(new Date(startAt).getTime() + duration).toISOString()
  return { ...eventInput(event), startAt, endAt, startDate: null, endDate: null, allDay: false }
}

interface DragState {
  event: CalendarEvent
  startX: number
  startY: number
  active: boolean
}

/** Pointer drag that works with a mouse, touch or pen without a desktop-only API. */
export const useCalendarEventDrag = ({
  onDrop,
  resolveDrop,
}: {
  onDrop: (event: CalendarEvent, drop: CalendarEventDrop) => void
  resolveDrop: (clientX: number, clientY: number) => CalendarEventDrop | null
}) => {
  const stateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)

  const clear = () => {
    stateRef.current = null
    setDraggingEventId(null)
  }

  return {
    draggingEventId,
    onPointerDown: (pointerEvent: PointerEvent<HTMLButtonElement>, event: CalendarEvent) => {
      if (pointerEvent.button !== 0) return
      stateRef.current = {
        event,
        startX: pointerEvent.clientX,
        startY: pointerEvent.clientY,
        active: false,
      }
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
    },
    onPointerMove: (pointerEvent: PointerEvent<HTMLButtonElement>) => {
      const state = stateRef.current
      if (!state || state.active) return
      if (Math.hypot(pointerEvent.clientX - state.startX, pointerEvent.clientY - state.startY) < 6) return
      state.active = true
      suppressClickRef.current = true
      setDraggingEventId(state.event.id)
    },
    onPointerUp: (pointerEvent: PointerEvent<HTMLButtonElement>) => {
      const state = stateRef.current
      if (!state) return
      if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
        pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId)
      }
      if (state.active) {
        const drop = resolveDrop(pointerEvent.clientX, pointerEvent.clientY)
        if (drop) onDrop(state.event, drop)
      }
      clear()
    },
    onPointerCancel: clear,
    consumeClick: () => {
      if (!suppressClickRef.current) return false
      suppressClickRef.current = false
      return true
    },
  }
}
