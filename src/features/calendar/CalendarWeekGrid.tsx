import { CheckSquare2, Leaf } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import type { Task } from '@/features/tasks/types'
import { habitAccentStyle } from '@/features/habits/habitVisuals'
import { formatTimestampForInput, localDateKey } from '@/lib/dates'
import { eventOccursOnDate, formatCalendarDateLabel, formatCalendarEventTime, taskOccursOnDate } from './calendarMonth'
import { formatCalendarHour, layoutWeekTimedEvents, type CalendarWeekModel } from './calendarWeek'
import type { CalendarEvent } from './types'
import type { CalendarHabitItem } from './habitCalendarAdapter'
import {
  formatCalendarInteractionTime,
  useCalendarEventDrag,
  useCalendarQuickTap,
  type CalendarEventChange,
  type CalendarEventDrop,
} from './calendarEventMove'

const HOUR_HEIGHT = 56
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export function CalendarWeekGrid({
  week,
  selectedDate,
  timeZone,
  events,
  tasks,
  habits,
  onSelectDate,
  onCreateAt,
  onEditEvent,
  onChangeEvent,
}: {
  week: CalendarWeekModel
  selectedDate: string
  timeZone: string
  events: CalendarEvent[]
  tasks: Task[]
  habits: CalendarHabitItem[]
  onSelectDate: (date: string) => void
  onCreateAt: (date: string, hour: number) => void
  onEditEvent: (event: CalendarEvent) => void
  onChangeEvent: (event: CalendarEvent, change: CalendarEventChange) => void
}) {
  const today = localDateKey(new Date(), timeZone)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const resolveDrop = useCallback((clientX: number, clientY: number): CalendarEventDrop | null => {
    const body = bodyRef.current
    if (!body) return null
    const bodyRect = body.getBoundingClientRect()
    const relativeY = clientY - bodyRect.top
    if (relativeY < 0 || relativeY > 24 * HOUR_HEIGHT) return null
    const column = [...body.querySelectorAll<HTMLElement>('[data-calendar-date]')].find((item) => {
      const rect = item.getBoundingClientRect()
      return clientX >= rect.left && clientX <= rect.right
    })
    const date = column?.dataset.calendarDate
    if (!date) return null
    return { date, minutes: Math.min(24 * 60, Math.max(0, Math.round(relativeY / (HOUR_HEIGHT / 4)) * 15)) }
  }, [])
  const eventDrag = useCalendarEventDrag({ onChange: onChangeEvent, resolveDrop })
  const slotTap = useCalendarQuickTap()
  const timedSegments = layoutWeekTimedEvents(events, week, timeZone)

  useEffect(() => {
    const currentHour = Number(formatTimestampForInput(new Date().toISOString(), timeZone).slice(11, 13))
    const openingHour = week.days.some(({ date }) => date === today) ? Math.max(0, currentHour - 1) : 7
    if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = openingHour * HOUR_HEIGHT
  }, [timeZone, today, week.days])

  return (
    <section className="calendar-week-grid-shell" aria-label={`Week of ${week.label}`}>
      <div className="calendar-week-grid__scroll">
        <div className="calendar-week-grid">
          <div className="calendar-week-grid__days">
            <span className="calendar-week-grid__corner" aria-hidden>Week</span>
            {week.days.map((day) => (
              <button
                className={`${day.date === selectedDate ? 'calendar-week-day--selected ' : ''}${day.date === today ? 'calendar-week-day--today' : ''}`.trim()}
                type="button"
                key={day.date}
                aria-label={`Select ${formatCalendarDateLabel(day.date)}`}
                aria-pressed={day.date === selectedDate}
                onClick={() => onSelectDate(day.date)}
              >
                <span>{day.shortLabel}</span><strong>{day.dayNumber}</strong>
              </button>
            ))}
          </div>
          <div className="calendar-week-grid__all-day">
            <span className="calendar-week-grid__all-day-label">All day</span>
            {week.days.map((day) => {
              const dayEvents = events.filter((event) => event.allDay && eventOccursOnDate(event, day.date, timeZone))
              const dayTasks = tasks.filter((task) => taskOccursOnDate(task, day.date, timeZone))
              const dayHabits = habits.filter((habit) => habit.date === day.date)
              return (
                <div className="calendar-week-grid__all-day-cell" key={day.date}>
                  {dayEvents.map((event) => (
                    <button
                      className={`calendar-week-all-day calendar-week-all-day--${event.colorToken}`}
                      type="button"
                      key={event.id}
                      aria-label={`Edit event ${event.title}`}
                      onClick={() => onEditEvent(event)}
                    >{event.title}</button>
                  ))}
                  {dayTasks.map((task) => (
                    <Link
                      className="calendar-week-all-day calendar-week-all-day--task"
                      to={day.date === today ? '/tasks/today' : '/tasks/upcoming'}
                      key={task.id}
                      aria-label={`Open task ${task.title}`}
                    ><CheckSquare2 aria-hidden />{task.title}</Link>
                  ))}
                  {dayHabits.map((habit) => (
                    <Link className={`calendar-week-all-day calendar-week-all-day--habit calendar-week-all-day--${habit.colorToken}`} style={habitAccentStyle(habit)} to="/habits" key={habit.id} aria-label={`Open habit ${habit.title}`}><Leaf aria-hidden />{habit.title}</Link>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="calendar-week-grid__body-scroll" ref={bodyScrollRef}>
            <div className="calendar-week-grid__body" ref={bodyRef} style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              <div className="calendar-week-grid__times" aria-hidden>
                {HOURS.map((hour) => (
                  <span key={hour} style={{ top: `${hour * HOUR_HEIGHT}px` }}>{formatCalendarHour(hour)}</span>
                ))}
              </div>
              {week.days.map((day) => (
                <div className={`calendar-week-grid__column${day.date === today ? ' calendar-week-grid__column--today' : ''}`} data-calendar-date={day.date} key={day.date}>
                  {HOURS.map((hour) => (
                    <button
                      className="calendar-week-slot"
                      type="button"
                      key={hour}
                      style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                      aria-label={`Create event on ${formatCalendarDateLabel(day.date)} at ${formatCalendarHour(hour)}`}
                      onPointerDown={slotTap.onPointerDown}
                      onPointerMove={slotTap.onPointerMove}
                      onPointerUp={slotTap.onPointerUp}
                      onPointerCancel={slotTap.onPointerCancel}
                      onClick={() => { if (!slotTap.consumeClick()) onCreateAt(day.date, hour) }}
                    />
                  ))}
                  {timedSegments.filter((segment) => segment.date === day.date).map((segment) => {
                    const top = segment.startMinutes / 60 * HOUR_HEIGHT
                    const height = Math.max(28, (segment.endMinutes - segment.startMinutes) / 60 * HOUR_HEIGHT)
                    const preview = eventDrag.preview?.eventId === segment.event.id ? eventDrag.preview : null
                    const previewStartsHere = preview?.kind === 'resize-start' && preview.drop.date === segment.date
                    const previewEndsHere = preview?.kind === 'resize-end' && preview.drop.date === segment.date
                    const displayTop = previewStartsHere ? preview.drop.minutes / 60 * HOUR_HEIGHT : top
                    const displayHeight = previewStartsHere
                      ? Math.max(14, (segment.endMinutes - preview.drop.minutes) / 60 * HOUR_HEIGHT)
                      : previewEndsHere
                        ? Math.max(14, (preview.drop.minutes - segment.startMinutes) / 60 * HOUR_HEIGHT)
                        : height
                    const compact = displayHeight < 52
                    return (
                      <button
                        className={`calendar-week-event calendar-week-event--${segment.event.colorToken}${compact ? ' calendar-week-event--compact' : ''}${eventDrag.draggingEventId === segment.event.id ? ' calendar-week-event--dragging' : ''}`}
                        type="button"
                        key={`${segment.event.id}-${segment.date}`}
                        style={{
                          top: `${displayTop}px`,
                          height: `${displayHeight}px`,
                          left: `${segment.column / segment.columnCount * 100}%`,
                          width: `${100 / segment.columnCount}%`,
                          transform: preview?.kind === 'move'
                            ? `translate3d(${preview.deltaX}px, ${preview.deltaY}px, 0) scale(1.015)`
                            : undefined,
                        }}
                        aria-label={`Edit event ${segment.event.title}`}
                        onPointerDown={(pointerEvent) => eventDrag.onPointerDown(
                          pointerEvent,
                          segment.event,
                          'move',
                          null,
                          { date: segment.date, minutes: segment.startMinutes },
                        )}
                        onPointerMove={eventDrag.onPointerMove}
                        onPointerUp={eventDrag.onPointerUp}
                        onPointerCancel={eventDrag.onPointerCancel}
                        onClick={() => { if (!eventDrag.consumeClick()) onEditEvent(segment.event) }}
                      >
                        <i
                          className="calendar-week-event__resize calendar-week-event__resize--start"
                          aria-hidden
                          onPointerDown={(pointerEvent) => {
                            pointerEvent.stopPropagation()
                            eventDrag.onPointerDown(pointerEvent, segment.event, 'resize-start', segment.date)
                          }}
                        />
                        <strong>{segment.event.title}</strong>
                        <span>{preview ? formatCalendarInteractionTime(preview) : formatCalendarEventTime(segment.event, timeZone)}</span>
                        <i
                          className="calendar-week-event__resize calendar-week-event__resize--end"
                          aria-hidden
                          onPointerDown={(pointerEvent) => {
                            pointerEvent.stopPropagation()
                            eventDrag.onPointerDown(pointerEvent, segment.event, 'resize-end', segment.date)
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
