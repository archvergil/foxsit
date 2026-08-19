import { CheckSquare2, Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Task } from '@/features/tasks/types'
import { habitAccentStyle } from '@/features/habits/habitVisuals'
import { localDateKey } from '@/lib/dates'
import {
  calendarWeekdays,
  eventOccursOnDate,
  formatCalendarDateLabel,
  formatCalendarEventTime,
  taskOccursOnDate,
  type CalendarMonthModel,
} from './calendarMonth'
import type { CalendarEvent } from './types'
import type { CalendarHabitItem } from './habitCalendarAdapter'

interface CalendarMonthGridProps {
  month: CalendarMonthModel
  weekStartsOn: number
  selectedDate: string
  timeZone: string
  events: CalendarEvent[]
  tasks: Task[]
  habits: CalendarHabitItem[]
  onSelectDate: (date: string) => void
  onEditEvent: (event: CalendarEvent) => void
}

export function CalendarMonthGrid({
  month,
  weekStartsOn,
  selectedDate,
  timeZone,
  events,
  tasks,
  habits,
  onSelectDate,
  onEditEvent,
}: CalendarMonthGridProps) {
  const today = localDateKey(new Date(), timeZone)
  return (
    <section className="calendar-month" aria-label={month.label}>
      <div className="calendar-weekdays" aria-hidden>
        {calendarWeekdays(weekStartsOn).map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="calendar-month-grid">
        {month.days.map((day) => {
          const dayEvents = events.filter((event) => eventOccursOnDate(event, day.date, timeZone))
          const dayTasks = tasks.filter((task) => taskOccursOnDate(task, day.date, timeZone))
          const dayHabits = habits.filter((habit) => habit.date === day.date)
          const itemCount = dayEvents.length + dayTasks.length + dayHabits.length
          const habitSlots = Math.max(0, 3 - dayEvents.length - dayTasks.length)
          const mobileMarkers = [
            ...dayEvents.map((event) => ({ key: `event-${event.id}`, className: `calendar-marker--${event.colorToken}`, style: undefined })),
            ...dayTasks.map((task) => ({ key: `task-${task.id}`, className: 'calendar-marker--task', style: undefined })),
            ...dayHabits.map((habit) => ({ key: `habit-${habit.id}`, className: `calendar-marker--${habit.colorToken}`, style: habitAccentStyle(habit) })),
          ]
          return (
            <article
              className={`calendar-day${day.inMonth ? '' : ' calendar-day--outside'}${day.date === selectedDate ? ' calendar-day--selected' : ''}`}
              key={day.date}
            >
              <button
                className={`calendar-day__number${day.date === today ? ' calendar-day__number--today' : ''}`}
                type="button"
                aria-label={`Select ${formatCalendarDateLabel(day.date)}${itemCount ? `, ${itemCount} items` : ''}`}
                aria-pressed={day.date === selectedDate}
                onClick={() => onSelectDate(day.date)}
              >
                {day.dayNumber}
              </button>
              <div className="calendar-day__items">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    className={`calendar-item-chip calendar-item-chip--${event.colorToken}`}
                    type="button"
                    key={event.id}
                    aria-label={`Edit event ${event.title}`}
                    onClick={() => onEditEvent(event)}
                  >
                    <span className="calendar-item-chip__time">{event.allDay ? '' : formatCalendarEventTime(event, timeZone).split('–')[0]}</span>
                    <span className="calendar-item-chip__title">{event.title}</span>
                  </button>
                ))}
                {dayEvents.length < 3 ? dayTasks.slice(0, 3 - dayEvents.length).map((task) => (
                  <Link
                    className="calendar-item-chip calendar-item-chip--task"
                    to={task.scheduledDate === today ? '/tasks/today' : '/tasks/upcoming'}
                    key={task.id}
                    aria-label={`Open task ${task.title}`}
                  >
                    <CheckSquare2 aria-hidden />
                    <span className="calendar-item-chip__title">{task.title}</span>
                  </Link>
                )) : null}
                {habitSlots ? dayHabits.slice(0, habitSlots).map((habit) => (
                  <Link className={`calendar-item-chip calendar-item-chip--habit calendar-item-chip--${habit.colorToken}`} style={habitAccentStyle(habit)} to="/habits" key={habit.id} aria-label={`Open habit ${habit.title}`}>
                    <Leaf aria-hidden /><span className="calendar-item-chip__title">{habit.title}</span>
                  </Link>
                )) : null}
                {itemCount > 3 ? <span className="calendar-day__more">+{itemCount - 3} more</span> : null}
              </div>
              {itemCount ? (
                <span className="calendar-day__mobile-markers" aria-hidden>
                  {mobileMarkers.slice(0, 4).map((marker) => <i className={marker.className} style={marker.style} key={marker.key} />)}
                  {mobileMarkers.length > 4 ? <b aria-label="More items">...</b> : null}
                </span>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
