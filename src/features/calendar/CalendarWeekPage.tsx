import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useHabitLogs, useHabits } from '@/features/habits/queries'
import { useTaskList } from '@/features/tasks/queries'
import { addLocalDays, localDateKey, localDateTimeToTimestamp } from '@/lib/dates'
import { CalendarDayAgenda } from './CalendarDayAgenda'
import { CalendarEventEditor } from './CalendarEventEditor'
import { CalendarViewSwitch } from './CalendarViewSwitch'
import { CalendarWeekGrid } from './CalendarWeekGrid'
import { buildCalendarWeek, shiftCalendarWeek, startOfCalendarWeek } from './calendarWeek'
import { eventOccursOnDate, taskOccursOnDate } from './calendarMonth'
import { useCalendarDateContext, useCalendarEvents } from './queries'
import type { CalendarEvent, CalendarEventRange } from './types'
import { projectHabitCalendarItems } from './habitCalendarAdapter'

export function CalendarWeekPage() {
  const { timeZone, weekStartsOn, showEvents, showTasks, showHabits } = useCalendarDateContext()
  const today = localDateKey(new Date(), timeZone)
  const [anchorDate, setAnchorDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>()
  const [initialStartHour, setInitialStartHour] = useState<number | undefined>()
  const weekStart = useMemo(() => startOfCalendarWeek(anchorDate, weekStartsOn), [anchorDate, weekStartsOn])
  const week = useMemo(() => buildCalendarWeek(weekStart), [weekStart])
  const range = useMemo<CalendarEventRange>(() => {
    const rangeStart = localDateTimeToTimestamp(`${week.startDate}T00:00`, timeZone)
    const rangeEnd = localDateTimeToTimestamp(`${addLocalDays(week.endDate, 1)}T00:00`, timeZone)
    if (!rangeStart || !rangeEnd) throw new Error(`Could not resolve the visible Calendar week in ${timeZone}.`)
    return { rangeStart, rangeEnd, localDateStart: week.startDate, localDateEnd: week.endDate }
  }, [timeZone, week.endDate, week.startDate])
  const eventsQuery = useCalendarEvents(range)
  const tasksQuery = useTaskList({ status: 'open' })
  const habitsQuery = useHabits(true)
  const habitLogsQuery = useHabitLogs({ dateStart: week.startDate, dateEnd: week.endDate })
  const events = showEvents ? (eventsQuery.data ?? []) : []
  const tasks = showTasks ? (tasksQuery.data ?? []) : []
  const habitItems = showHabits ? projectHabitCalendarItems(habitsQuery.data ?? [], habitLogsQuery.data ?? [], week.startDate, week.endDate, timeZone) : []
  const selectedEvents = events.filter((event) => eventOccursOnDate(event, selectedDate, timeZone))
  const selectedTasks = tasks.filter((task) => taskOccursOnDate(task, selectedDate, timeZone))
  const selectedHabits = habitItems.filter((habit) => habit.date === selectedDate)

  const openCreate = (date = selectedDate, hour?: number) => {
    setSelectedDate(date)
    setEditingEvent(undefined)
    setInitialStartHour(hour)
    setEditorOpen(true)
  }
  const openEdit = (event: CalendarEvent) => {
    const eventDate = event.startDate ?? (event.startAt ? localDateKey(new Date(event.startAt), timeZone) : selectedDate)
    setSelectedDate(eventDate)
    setEditingEvent(event)
    setInitialStartHour(undefined)
    setEditorOpen(true)
  }
  const navigateWeek = (offset: number) => {
    const nextStart = shiftCalendarWeek(weekStart, offset)
    setAnchorDate(nextStart)
    setSelectedDate(nextStart)
    setEditorOpen(false)
  }
  const goToday = () => {
    setAnchorDate(today)
    setSelectedDate(today)
    setEditorOpen(false)
  }

  return (
    <section className="page-stack calendar-page">
      <PageHeader
        eyebrow="Calendar · Week"
        title="Shape the week."
        description={`Events use ${timeZone}; tasks and habits remain owned by their modules.`}
        actions={<Button type="button" onClick={() => openCreate()}><Plus aria-hidden />New event</Button>}
      />
      <CalendarViewSwitch active="week" dayDate={selectedDate} />
      <div className="calendar-toolbar">
        <Button variant="secondary" type="button" onClick={goToday}>Today</Button>
        <h2 aria-live="polite">{week.label}</h2>
        <span className="calendar-toolbar__navigation">
          <button type="button" aria-label="Previous week" onClick={() => navigateWeek(-1)}><ChevronLeft aria-hidden /></button>
          <button type="button" aria-label="Next week" onClick={() => navigateWeek(1)}><ChevronRight aria-hidden /></button>
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
        <div className={`calendar-week-layout${editorOpen ? ' calendar-week-layout--editing' : ''}`}>
          <CalendarWeekGrid
            week={week}
            selectedDate={selectedDate}
            timeZone={timeZone}
            events={events}
            tasks={tasks}
            habits={habitItems}
            onSelectDate={(date) => { setSelectedDate(date); setEditorOpen(false) }}
            onCreateAt={openCreate}
            onEditEvent={openEdit}
          />
          {editorOpen ? (
            <CalendarEventEditor
              key={editingEvent?.id ?? `new-${selectedDate}-${initialStartHour ?? 9}`}
              date={selectedDate}
              timeZone={timeZone}
              event={editingEvent}
              initialStartHour={initialStartHour}
              onClose={() => setEditorOpen(false)}
              onSaved={(event) => {
                const eventDate = event.startDate ?? (event.startAt ? localDateKey(new Date(event.startAt), timeZone) : selectedDate)
                setSelectedDate(eventDate)
                setEditorOpen(false)
              }}
              onDeleted={() => setEditorOpen(false)}
            />
          ) : (
            <div className="calendar-week-mobile">
              <nav className="calendar-week-mobile__days" aria-label="Days in week">
                {week.days.map((day) => (
                  <button
                    className={day.date === selectedDate ? 'calendar-week-mobile__day--selected' : ''}
                    type="button"
                    key={day.date}
                    aria-label={`Show ${day.shortLabel} ${day.dayNumber}`}
                    aria-pressed={day.date === selectedDate}
                    onClick={() => setSelectedDate(day.date)}
                  ><span>{day.shortLabel}</span><strong>{day.dayNumber}</strong></button>
                ))}
              </nav>
              <CalendarDayAgenda
                date={selectedDate}
                timeZone={timeZone}
                events={selectedEvents}
                tasks={selectedTasks}
                habits={selectedHabits}
                onCreate={() => openCreate()}
                onEdit={openEdit}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
