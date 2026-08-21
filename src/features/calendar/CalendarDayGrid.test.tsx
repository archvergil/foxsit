import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CalendarDayGrid } from './CalendarDayGrid'
import type { CalendarEvent } from './types'

const event: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Quick sync',
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

const renderGrid = () => {
  const onCreateAt = vi.fn()
  const onChangeEvent = vi.fn()
  const view = render(
    <CalendarDayGrid
      date="2026-08-17"
      timeZone="America/Sao_Paulo"
      events={[event]}
      tasks={[]}
      habits={[]}
      onCreateAt={onCreateAt}
      onEditEvent={vi.fn()}
      onChangeEvent={onChangeEvent}
    />,
  )
  const body = view.container.querySelector<HTMLElement>('.calendar-day-grid__body')
  if (!body) throw new Error('Calendar body was not rendered.')
  body.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, right: 400, top: 0, bottom: 1344,
    width: 400, height: 1344, toJSON: () => ({}),
  })
  return { ...view, onCreateAt, onChangeEvent }
}

afterEach(() => vi.useRealTimers())

describe('CalendarDayGrid pointer interactions', () => {
  it('shows a live snapped preview while moving an event and commits on release', () => {
    const { onChangeEvent } = renderGrid()
    const eventButton = screen.getByRole('button', { name: 'Edit event Quick sync' })

    fireEvent.pointerDown(eventButton, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 504 })
    fireEvent.pointerMove(eventButton, { pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 560 })

    expect(eventButton).toHaveTextContent('Move to 10:00')
    expect(eventButton.style.transform).toContain('translate3d(0px, 56px, 0)')

    fireEvent.pointerUp(eventButton, { pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 560 })
    expect(onChangeEvent).toHaveBeenCalledWith(event, {
      kind: 'move',
      drop: { date: '2026-08-17', minutes: 600 },
    })
  })

  it('previews and commits resizing from an event edge', () => {
    const { container, onChangeEvent } = renderGrid()
    const startHandle = container.querySelector<HTMLElement>('.calendar-week-event__resize--start')
    if (!startHandle) throw new Error('Start resize handle was not rendered.')

    fireEvent.pointerDown(startHandle, { button: 0, pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 504 })
    fireEvent.pointerMove(startHandle, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 532 })

    expect(screen.getByRole('button', { name: 'Edit event Quick sync' })).toHaveTextContent('Starts 09:30')
    fireEvent.pointerUp(startHandle, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 532 })
    expect(onChangeEvent).toHaveBeenCalledWith(event, {
      kind: 'resize-start',
      drop: { date: '2026-08-17', minutes: 570 },
    })
  })

  it('opens a slot for a quick tap but ignores a held touch', () => {
    vi.useFakeTimers()
    const { onCreateAt } = renderGrid()
    const slot = screen.getByRole('button', { name: 'Create event on Monday, August 17, 2026 at 9 AM' })

    fireEvent.pointerDown(slot, { pointerId: 3, pointerType: 'touch', clientX: 100, clientY: 504 })
    fireEvent.pointerUp(slot, { pointerId: 3, pointerType: 'touch', clientX: 100, clientY: 504 })
    fireEvent.click(slot)
    expect(onCreateAt).toHaveBeenCalledWith(9)

    fireEvent.pointerDown(slot, { pointerId: 4, pointerType: 'touch', clientX: 100, clientY: 504 })
    vi.advanceTimersByTime(400)
    fireEvent.pointerUp(slot, { pointerId: 4, pointerType: 'touch', clientX: 100, clientY: 504 })
    fireEvent.click(slot)
    expect(onCreateAt).toHaveBeenCalledTimes(1)
  })
})
