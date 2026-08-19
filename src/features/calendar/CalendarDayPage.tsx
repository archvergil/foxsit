import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useHabitLogs, useHabits } from '@/features/habits/queries'
import { useTaskList } from '@/features/tasks/queries'
import { addLocalDays, isValidLocalDate, localDateKey, localDateTimeToTimestamp } from '@/lib/dates'
import { CalendarDayAgenda } from './CalendarDayAgenda'
import { CalendarDayGrid } from './CalendarDayGrid'
import { CalendarEventEditor } from './CalendarEventEditor'
import { moveTimedCalendarEvent, type CalendarEventDrop } from './calendarEventMove'
import { CalendarViewSwitch } from './CalendarViewSwitch'
import { eventOccursOnDate, formatCalendarDateLabel, taskOccursOnDate } from './calendarMonth'
import { useCalendarDateContext, useCalendarEvents, useUpdateCalendarEvent } from './queries'
import type { CalendarEvent, CalendarEventRange } from './types'
import { projectHabitCalendarItems } from './habitCalendarAdapter'

function CalendarDayPageBody({ date, timeZone, showEvents, showTasks, showHabits }: { date: string; timeZone: string; showEvents: boolean; showTasks: boolean; showHabits: boolean }) {
  const navigate = useNavigate()
  const today = localDateKey(new Date(), timeZone)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>()
  const [initialStartHour, setInitialStartHour] = useState<number | undefined>()
  const [moveError, setMoveError] = useState<string | null>(null)
  const updateEvent = useUpdateCalendarEvent()
  const range = useMemo<CalendarEventRange>(() => {
    const rangeStart = localDateTimeToTimestamp(`${date}T00:00`, timeZone)
    const rangeEnd = localDateTimeToTimestamp(`${addLocalDays(date, 1)}T00:00`, timeZone)
    if (!rangeStart || !rangeEnd) throw new Error(`Could not resolve the Calendar day in ${timeZone}.`)
    return { rangeStart, rangeEnd, localDateStart: date, localDateEnd: date }
  }, [date, timeZone])
  const eventsQuery = useCalendarEvents(range)
  const tasksQuery = useTaskList({ status: 'open' })
  const habitsQuery = useHabits(true)
  const habitLogsQuery = useHabitLogs({ dateStart: date, dateEnd: date })
  const events = showEvents ? (eventsQuery.data ?? []) : []
  const tasks = showTasks ? (tasksQuery.data ?? []) : []
  const dayEvents = events.filter((event) => eventOccursOnDate(event, date, timeZone))
  const dayTasks = tasks.filter((task) => taskOccursOnDate(task, date, timeZone))
  const habitItems = showHabits ? projectHabitCalendarItems(habitsQuery.data ?? [], habitLogsQuery.data ?? [], date, date, timeZone) : []

  const openCreate = (hour?: number) => {
    setEditingEvent(undefined)
    setInitialStartHour(hour)
    setEditorOpen(true)
  }
  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event)
    setInitialStartHour(undefined)
    setEditorOpen(true)
  }
  const moveToDate = (nextDate: string) => {
    setEditorOpen(false)
    void navigate(`/calendar/day/${nextDate}`)
  }
  const moveEvent = async (event: CalendarEvent, drop: CalendarEventDrop) => {
    const input = moveTimedCalendarEvent(event, drop, timeZone)
    if (!input) return
    setMoveError(null)
    try {
      await updateEvent.mutateAsync({ eventId: event.id, input })
    } catch {
      setMoveError('The event could not be moved. Its original time was kept.')
    }
  }

  return (
    <section className="page-stack calendar-page">
      <PageHeader
        eyebrow="Calendar · Day"
        title="Protect the day."
        description={`Events use ${timeZone}; tasks and habits remain owned by their modules.`}
        actions={<Button type="button" onClick={() => openCreate()}><Plus aria-hidden />New event</Button>}
      />
      <CalendarViewSwitch active="day" dayDate={date} />
      <div className="calendar-toolbar">
        <Button variant="secondary" type="button" onClick={() => moveToDate(today)}>Today</Button>
        <h2 aria-live="polite">{formatCalendarDateLabel(date)}</h2>
        <span className="calendar-toolbar__navigation">
          <button type="button" aria-label="Previous day" onClick={() => moveToDate(addLocalDays(date, -1))}><ChevronLeft aria-hidden /></button>
          <button type="button" aria-label="Next day" onClick={() => moveToDate(addLocalDays(date, 1))}><ChevronRight aria-hidden /></button>
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
        <div className="calendar-day-view-layout">
          <CalendarDayGrid
            date={date}
            timeZone={timeZone}
            events={events}
            tasks={tasks}
            habits={habitItems}
            onCreateAt={openCreate}
            onEditEvent={openEdit}
            onMoveEvent={(event, drop) => void moveEvent(event, drop)}
          />
          {editorOpen ? (
            <CalendarEventEditor
              key={editingEvent?.id ?? `new-${date}-${initialStartHour ?? 9}`}
              date={date}
              timeZone={timeZone}
              event={editingEvent}
              initialStartHour={initialStartHour}
              onClose={() => setEditorOpen(false)}
              onSaved={(event) => {
                const eventDate = event.startDate ?? (event.startAt ? localDateKey(new Date(event.startAt), timeZone) : date)
                setEditorOpen(false)
                if (eventDate !== date) void navigate(`/calendar/day/${eventDate}`)
              }}
              onDeleted={() => setEditorOpen(false)}
            />
          ) : (
            <CalendarDayAgenda
              date={date}
              timeZone={timeZone}
              events={dayEvents}
              tasks={dayTasks}
              habits={habitItems}
              onCreate={() => openCreate()}
              onEdit={openEdit}
            />
          )}
        </div>
      )}
      {moveError ? <p className="calendar-move-error" role="alert">{moveError}</p> : null}
    </section>
  )
}

export function CalendarDayPage() {
  const { date: routeDate } = useParams()
  const { timeZone, showEvents, showTasks, showHabits } = useCalendarDateContext()
  const today = localDateKey(new Date(), timeZone)
  if (!routeDate || !isValidLocalDate(routeDate)) return <Navigate to={`/calendar/day/${today}`} replace />
  return <CalendarDayPageBody key={routeDate} date={routeDate} timeZone={timeZone} showEvents={showEvents} showTasks={showTasks} showHabits={showHabits} />
}
