import { CheckSquare2, Leaf } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import type { Task } from '@/features/tasks/types'
import { formatTimestampForInput, localDateKey } from '@/lib/dates'
import { eventOccursOnDate, formatCalendarDateLabel, formatCalendarEventTime, taskOccursOnDate } from './calendarMonth'
import { formatCalendarHour, layoutCalendarDayTimedEvents } from './calendarWeek'
import type { CalendarEvent } from './types'
import type { CalendarHabitItem } from './habitCalendarAdapter'

const HOUR_HEIGHT = 56
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export function CalendarDayGrid({
  date,
  timeZone,
  events,
  tasks,
  habits,
  onCreateAt,
  onEditEvent,
}: {
  date: string
  timeZone: string
  events: CalendarEvent[]
  tasks: Task[]
  habits: CalendarHabitItem[]
  onCreateAt: (hour: number) => void
  onEditEvent: (event: CalendarEvent) => void
}) {
  const today = localDateKey(new Date(), timeZone)
  const timedSegments = layoutCalendarDayTimedEvents(events, date, timeZone)
  const allDayEvents = events.filter((event) => event.allDay && eventOccursOnDate(event, date, timeZone))
  const dayTasks = tasks.filter((task) => taskOccursOnDate(task, date, timeZone))
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentHour = Number(formatTimestampForInput(new Date().toISOString(), timeZone).slice(11, 13))
    const openingHour = date === today ? Math.max(0, currentHour - 1) : 7
    if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = openingHour * HOUR_HEIGHT
  }, [date, timeZone, today])

  return (
    <section className="calendar-day-grid-shell" aria-label={`Schedule for ${formatCalendarDateLabel(date)}`}>
      <header className="calendar-day-grid__header">
        <span className="eyebrow">Day schedule</span>
        <strong>{formatCalendarDateLabel(date)}</strong>
      </header>
      <div className="calendar-day-grid__all-day">
        <span className="calendar-day-grid__all-day-label">All day</span>
        <div className="calendar-day-grid__all-day-cell">
          {allDayEvents.length === 0 && dayTasks.length === 0 && habits.length === 0 ? (
            <span className="calendar-day-grid__all-day-empty">No all-day items</span>
          ) : null}
          {allDayEvents.map((event) => (
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
              to={date === today ? '/tasks/today' : '/tasks/upcoming'}
              key={task.id}
              aria-label={`Open task ${task.title}`}
            ><CheckSquare2 aria-hidden />{task.title}</Link>
          ))}
          {habits.map((habit) => (
            <Link className={`calendar-week-all-day calendar-week-all-day--habit calendar-week-all-day--${habit.colorToken}`} to="/habits" key={habit.id} aria-label={`Open habit ${habit.title}`}><Leaf aria-hidden />{habit.title}</Link>
          ))}
        </div>
      </div>
      <div className="calendar-day-grid__body-scroll" ref={bodyScrollRef}>
        <div className="calendar-day-grid__body" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          <div className="calendar-day-grid__times" aria-hidden>
            {HOURS.map((hour) => (
              <span key={hour} style={{ top: `${hour * HOUR_HEIGHT}px` }}>{formatCalendarHour(hour)}</span>
            ))}
          </div>
          <div className={`calendar-day-grid__column${date === today ? ' calendar-day-grid__column--today' : ''}`}>
            {HOURS.map((hour) => (
              <button
                className="calendar-week-slot"
                type="button"
                key={hour}
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                aria-label={`Create event on ${formatCalendarDateLabel(date)} at ${formatCalendarHour(hour)}`}
                onClick={() => onCreateAt(hour)}
              />
            ))}
            {timedSegments.map((segment) => {
              const top = segment.startMinutes / 60 * HOUR_HEIGHT
              const height = Math.max(28, (segment.endMinutes - segment.startMinutes) / 60 * HOUR_HEIGHT)
              return (
                <button
                  className={`calendar-week-event calendar-week-event--${segment.event.colorToken}`}
                  type="button"
                  key={segment.event.id}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `${segment.column / segment.columnCount * 100}%`,
                    width: `${100 / segment.columnCount}%`,
                  }}
                  aria-label={`Edit event ${segment.event.title}`}
                  onClick={() => onEditEvent(segment.event)}
                >
                  <strong>{segment.event.title}</strong>
                  <span>{formatCalendarEventTime(segment.event, timeZone)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
