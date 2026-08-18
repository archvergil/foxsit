import { CalendarClock, CheckSquare2, Leaf, MapPin, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { habitAccentStyle } from '@/features/habits/habitVisuals'
import type { Task } from '@/features/tasks/types'
import { localDateKey } from '@/lib/dates'
import { formatCalendarDateLabel, formatCalendarEventTime } from './calendarMonth'
import type { CalendarEvent } from './types'
import { formatCalendarHabitProgress, type CalendarHabitItem } from './habitCalendarAdapter'

export function CalendarDayAgenda({
  date,
  timeZone,
  events,
  tasks,
  habits,
  onCreate,
  onEdit,
}: {
  date: string
  timeZone: string
  events: CalendarEvent[]
  tasks: Task[]
  habits: CalendarHabitItem[]
  onCreate: () => void
  onEdit: (event: CalendarEvent) => void
}) {
  const today = localDateKey(new Date(), timeZone)
  return (
    <aside className="calendar-agenda" aria-labelledby="calendar-agenda-title">
      <header>
        <span>
          <span className="eyebrow">Selected day</span>
          <h2 id="calendar-agenda-title">{formatCalendarDateLabel(date)}</h2>
        </span>
        <Button variant="secondary" type="button" onClick={onCreate}><Plus aria-hidden />Event</Button>
      </header>
      {events.length === 0 && tasks.length === 0 && habits.length === 0 ? (
        <div className="calendar-agenda__empty">
          <CalendarClock aria-hidden />
          <strong>Open day.</strong>
          <p>Add an event or schedule a task when you are ready.</p>
        </div>
      ) : (
        <div className="calendar-agenda__list">
          {events.map((event) => (
            <button className="calendar-agenda-item" type="button" onClick={() => onEdit(event)} key={event.id}>
              <span className={`calendar-agenda-item__color calendar-agenda-item__color--${event.colorToken}`} />
              <span>
                <strong>{event.title}</strong>
                <small>{formatCalendarEventTime(event, timeZone)}{event.location ? ` · ${event.location}` : ''}</small>
              </span>
              {event.location ? <MapPin aria-hidden /> : <CalendarClock aria-hidden />}
            </button>
          ))}
          {tasks.map((task) => (
            <Link className="calendar-agenda-item calendar-agenda-item--task" to={date === today ? '/tasks/today' : '/tasks/upcoming'} key={task.id}>
              <span className="calendar-agenda-item__color" />
              <span><strong>{task.title}</strong><small>Task · opens in Tasks</small></span>
              <CheckSquare2 aria-hidden />
            </Link>
          ))}
          {habits.map((habit) => (
            <Link className={`calendar-agenda-item calendar-agenda-item--habit calendar-agenda-item--${habit.colorToken}`} style={habitAccentStyle(habit)} to="/habits" key={habit.id} aria-label={`Open habit ${habit.title}`}>
              <span className={`calendar-agenda-item__color calendar-agenda-item__color--${habit.colorToken}`} />
              <span><strong>{habit.title}</strong><small>Habit · {formatCalendarHabitProgress(habit)}</small></span>
              <Leaf aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}
