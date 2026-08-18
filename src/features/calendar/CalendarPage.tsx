import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useHabitLogs, useHabits } from '@/features/habits/queries'
import { useTaskList } from '@/features/tasks/queries'
import { addLocalDays, localDateKey, localDateTimeToTimestamp } from '@/lib/dates'
import { CalendarDayAgenda } from './CalendarDayAgenda'
import { CalendarDayPage } from './CalendarDayPage'
import { CalendarEventEditor } from './CalendarEventEditor'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarViewSwitch } from './CalendarViewSwitch'
import { CalendarWeekPage } from './CalendarWeekPage'
import {
  buildCalendarMonth,
  eventOccursOnDate,
  monthKeyForDate,
  shiftMonthKey,
  taskOccursOnDate,
} from './calendarMonth'
import { useCalendarDateContext, useCalendarEvents } from './queries'
import type { CalendarEvent, CalendarEventRange } from './types'
import { projectHabitCalendarItems } from './habitCalendarAdapter'

function CalendarMonthPage() {
  const { timeZone, weekStartsOn } = useCalendarDateContext()
  const today = localDateKey(new Date(), timeZone)
  const [monthKey, setMonthKey] = useState(() => monthKeyForDate(new Date(), timeZone))
  const [selectedDate, setSelectedDate] = useState(today)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>()
  const month = useMemo(() => buildCalendarMonth(monthKey, weekStartsOn), [monthKey, weekStartsOn])
  const range = useMemo<CalendarEventRange>(() => {
    const rangeStart = localDateTimeToTimestamp(`${month.gridStart}T00:00`, timeZone)
    const rangeEnd = localDateTimeToTimestamp(`${addLocalDays(month.gridEnd, 1)}T00:00`, timeZone)
    if (!rangeStart || !rangeEnd) throw new Error(`Could not resolve the visible Calendar range in ${timeZone}.`)
    return { rangeStart, rangeEnd, localDateStart: month.gridStart, localDateEnd: month.gridEnd }
  }, [month.gridEnd, month.gridStart, timeZone])
  const eventsQuery = useCalendarEvents(range)
  const tasksQuery = useTaskList({ status: 'open' })
  const habitsQuery = useHabits(true)
  const habitLogsQuery = useHabitLogs({ dateStart: month.gridStart, dateEnd: month.gridEnd })
  const events = eventsQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const habitItems = projectHabitCalendarItems(habitsQuery.data ?? [], habitLogsQuery.data ?? [], month.gridStart, month.gridEnd, timeZone)
  const selectedEvents = events.filter((event) => eventOccursOnDate(event, selectedDate, timeZone))
  const selectedTasks = tasks.filter((task) => taskOccursOnDate(task, selectedDate, timeZone))
  const selectedHabits = habitItems.filter((habit) => habit.date === selectedDate)

  const navigateMonth = (offset: number) => {
    const nextMonth = shiftMonthKey(monthKey, offset)
    setMonthKey(nextMonth)
    setSelectedDate(`${nextMonth}-01`)
    setEditorOpen(false)
  }
  const goToday = () => {
    setMonthKey(today.slice(0, 7))
    setSelectedDate(today)
    setEditorOpen(false)
  }
  const createEvent = () => {
    setEditingEvent(undefined)
    setEditorOpen(true)
  }
  const editEvent = (event: CalendarEvent) => {
    const eventDate = event.startDate ?? (event.startAt ? localDateKey(new Date(event.startAt), timeZone) : selectedDate)
    setSelectedDate(eventDate)
    setEditingEvent(event)
    setEditorOpen(true)
  }

  return (
    <section className="page-stack calendar-page">
      <PageHeader
        eyebrow="Calendar · Month"
        title="Make time visible."
        description={`Events use ${timeZone}; tasks and habits remain owned by their modules.`}
        actions={<Button type="button" onClick={createEvent}><Plus aria-hidden />New event</Button>}
      />
      <CalendarViewSwitch active="month" dayDate={selectedDate} />
      <div className="calendar-toolbar">
        <Button variant="secondary" type="button" onClick={goToday}>Today</Button>
        <h2 aria-live="polite">{month.label}</h2>
        <span className="calendar-toolbar__navigation">
          <button type="button" aria-label="Previous month" onClick={() => navigateMonth(-1)}><ChevronLeft aria-hidden /></button>
          <button type="button" aria-label="Next month" onClick={() => navigateMonth(1)}><ChevronRight aria-hidden /></button>
        </span>
      </div>
      {eventsQuery.isPending || tasksQuery.isPending || habitsQuery.isPending || habitLogsQuery.isPending ? (
        <div className="calendar-loading" role="status" aria-label="Loading calendar"><span /><span /><span /></div>
      ) : eventsQuery.error || tasksQuery.error || habitsQuery.error || habitLogsQuery.error ? (
        <div className="calendar-error" role="alert">
          <strong>Calendar could not be loaded.</strong>
          <p>Your data was not changed. Check the local connection and try again.</p>
          <Button variant="secondary" type="button" onClick={() => void Promise.all([eventsQuery.refetch(), tasksQuery.refetch(), habitsQuery.refetch(), habitLogsQuery.refetch()])}>Try again</Button>
        </div>
      ) : (
        <div className="calendar-layout">
          <CalendarMonthGrid
            month={month}
            weekStartsOn={weekStartsOn}
            selectedDate={selectedDate}
            timeZone={timeZone}
            events={events}
            tasks={tasks}
            habits={habitItems}
            onSelectDate={(date) => { setSelectedDate(date); setEditorOpen(false) }}
            onEditEvent={editEvent}
          />
          {editorOpen ? (
            <CalendarEventEditor
              key={editingEvent?.id ?? `new-${selectedDate}`}
              date={selectedDate}
              timeZone={timeZone}
              event={editingEvent}
              onClose={() => setEditorOpen(false)}
              onSaved={(event) => {
                const eventDate = event.startDate ?? (event.startAt ? localDateKey(new Date(event.startAt), timeZone) : selectedDate)
                setSelectedDate(eventDate)
                setEditorOpen(false)
              }}
              onDeleted={() => setEditorOpen(false)}
            />
          ) : (
            <CalendarDayAgenda
              date={selectedDate}
              timeZone={timeZone}
              events={selectedEvents}
              tasks={selectedTasks}
              habits={selectedHabits}
              onCreate={createEvent}
              onEdit={editEvent}
            />
          )}
        </div>
      )}
    </section>
  )
}

export default function CalendarPage() {
  const { pathname } = useLocation()
  if (pathname === '/calendar') return <CalendarMonthPage />
  if (pathname === '/calendar/week') return <CalendarWeekPage />
  return <CalendarDayPage />
}
