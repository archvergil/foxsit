import { useRef, useState, type PointerEvent } from 'react'

import { addLocalDays, localDateTimeToTimestamp } from '@/lib/dates'
import type { CalendarEvent, CalendarEventInput } from './types'

export interface CalendarEventDrop {
  date: string
  minutes: number
}

export type CalendarEventInteractionKind = 'move' | 'resize-start' | 'resize-end'

export type CalendarEventChange =
  | { kind: 'move'; drop: CalendarEventDrop }
  | { kind: 'resize-start' | 'resize-end'; drop: CalendarEventDrop }

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
  if (minutes >= 24 * 60) return `${addLocalDays(date, 1)}T00:00`
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


/** Resizes one edge while enforcing a useful minimum event duration. */
export const resizeTimedCalendarEvent = (
  event: CalendarEvent,
  change: CalendarEventChange,
  timeZone: string,
): CalendarEventInput | null => {
  if (event.allDay || !event.startAt || !event.endAt || change.kind === 'move') return null
  const boundary = localDateTimeToTimestamp(localDateTime(change.drop.date, change.drop.minutes), timeZone)
  if (!boundary) return null
  const boundaryTime = new Date(boundary).getTime()
  const startTime = new Date(event.startAt).getTime()
  const endTime = new Date(event.endAt).getTime()
  const minimumDuration = 15 * 60 * 1000
  if (change.kind === 'resize-start' && boundaryTime > endTime - minimumDuration) return null
  if (change.kind === 'resize-end' && boundaryTime < startTime + minimumDuration) return null
  return {
    ...eventInput(event),
    startAt: change.kind === 'resize-start' ? boundary : event.startAt,
    endAt: change.kind === 'resize-end' ? boundary : event.endAt,
    startDate: null,
    endDate: null,
    allDay: false,
  }
}

export const changeTimedCalendarEvent = (
  event: CalendarEvent,
  change: CalendarEventChange,
  timeZone: string,
) => change.kind === 'move'
  ? moveTimedCalendarEvent(event, change.drop, timeZone)
  : resizeTimedCalendarEvent(event, change, timeZone)

interface DragState {
  event: CalendarEvent
  startX: number
  startY: number
  startedAt: number
  kind: CalendarEventInteractionKind
  lockDate: string | null
  originDrop: CalendarEventDrop | null
  pointerStartDrop: CalendarEventDrop | null
  active: boolean
}

interface TapState {
  pointerId: number
  startX: number
  startY: number
  startedAt: number
  moved: boolean
}

export interface CalendarEventPreview {
  eventId: string
  kind: CalendarEventInteractionKind
  drop: CalendarEventDrop
  deltaX: number
  deltaY: number
}

export const formatCalendarInteractionTime = (preview: CalendarEventPreview) => {
  const boundedMinutes = preview.drop.minutes % (24 * 60)
  const time = `${String(Math.floor(boundedMinutes / 60)).padStart(2, '0')}:${String(boundedMinutes % 60).padStart(2, '0')}`
  if (preview.kind === 'resize-start') return `Starts ${time}`
  if (preview.kind === 'resize-end') return `Ends ${time}`
  return `Move to ${time}`
}

export const isCalendarQuickTap = (elapsedMs: number, deltaX: number, deltaY: number) =>
  elapsedMs <= 350 && Math.hypot(deltaX, deltaY) < 6

/** Prevents a long touch or scroll gesture from being interpreted as a slot tap. */
export const useCalendarQuickTap = () => {
  const stateRef = useRef<TapState | null>(null)
  const suppressClickRef = useRef(false)

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') return
      stateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startedAt: Date.now(),
        moved: false,
      }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (!state || state.pointerId !== event.pointerId) return
      if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) >= 6) state.moved = true
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (!state || state.pointerId !== event.pointerId) return
      suppressClickRef.current = state.moved || !isCalendarQuickTap(
        Date.now() - state.startedAt,
        event.clientX - state.startX,
        event.clientY - state.startY,
      )
      stateRef.current = null
    },
    onPointerCancel: () => {
      if (stateRef.current) suppressClickRef.current = true
      stateRef.current = null
    },
    consumeClick: () => {
      if (!suppressClickRef.current) return false
      suppressClickRef.current = false
      return true
    },
  }
}

/** Pointer drag that works with a mouse, touch or pen without a desktop-only API. */
export const useCalendarEventDrag = ({
  onChange,
  resolveDrop,
}: {
  onChange: (event: CalendarEvent, change: CalendarEventChange) => void
  resolveDrop: (clientX: number, clientY: number) => CalendarEventDrop | null
}) => {
  const stateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [preview, setPreview] = useState<CalendarEventPreview | null>(null)

  const clear = () => {
    stateRef.current = null
    setDraggingEventId(null)
    setPreview(null)
  }

  const resolveInteractionDrop = (state: DragState, clientX: number, clientY: number) => {
    const rawDrop = resolveDrop(clientX, clientY)
    if (!rawDrop) return null
    if (state.kind === 'move' && state.originDrop && state.pointerStartDrop) {
      return {
        date: rawDrop.date,
        minutes: Math.min(23 * 60 + 45, Math.max(
          0,
          state.originDrop.minutes + rawDrop.minutes - state.pointerStartDrop.minutes,
        )),
      }
    }
    return state.lockDate ? { ...rawDrop, date: state.lockDate } : rawDrop
  }

  return {
    draggingEventId,
    preview,
    onPointerDown: (
      pointerEvent: PointerEvent<HTMLElement>,
      event: CalendarEvent,
      kind: CalendarEventInteractionKind = 'move',
      lockDate: string | null = null,
      originDrop: CalendarEventDrop | null = null,
    ) => {
      if (pointerEvent.button !== 0) return
      stateRef.current = {
        event,
        startX: pointerEvent.clientX,
        startY: pointerEvent.clientY,
        startedAt: Date.now(),
        kind,
        lockDate,
        originDrop,
        pointerStartDrop: resolveDrop(pointerEvent.clientX, pointerEvent.clientY),
        active: false,
      }
      pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId)
    },
    onPointerMove: (pointerEvent: PointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (!state) return
      const deltaX = pointerEvent.clientX - state.startX
      const deltaY = pointerEvent.clientY - state.startY
      if (!state.active) {
        if (Math.hypot(deltaX, deltaY) < 6) return
        state.active = true
        suppressClickRef.current = true
        setDraggingEventId(state.event.id)
      }
      const drop = resolveInteractionDrop(state, pointerEvent.clientX, pointerEvent.clientY)
      if (!drop) return
      pointerEvent.preventDefault()
      setPreview({
        eventId: state.event.id,
        kind: state.kind,
        drop,
        deltaX,
        deltaY,
      })
    },
    onPointerUp: (pointerEvent: PointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (!state) return
      if (pointerEvent.currentTarget.hasPointerCapture?.(pointerEvent.pointerId)) {
        pointerEvent.currentTarget.releasePointerCapture?.(pointerEvent.pointerId)
      }
      if (state.active) {
        const drop = resolveInteractionDrop(state, pointerEvent.clientX, pointerEvent.clientY)
        if (drop) onChange(state.event, { kind: state.kind, drop })
      } else if (Date.now() - state.startedAt > 350) {
        suppressClickRef.current = true
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
