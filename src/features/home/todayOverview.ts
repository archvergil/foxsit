import { eventOccursOnDate } from '@/features/calendar/calendarMonth'
import { isHabitScheduledOn } from '@/features/habits/habitRules'
import { localDateKey } from '@/lib/dates'
import type { CalendarEvent } from '@/features/calendar/types'
import type { FocusSession } from '@/features/focus/types'
import type { Habit, HabitLog } from '@/features/habits/types'
import type { Task } from '@/features/tasks/types'
import type { WorkoutSession } from '@/features/workout/types'

export const todayAgenda = (events: CalendarEvent[], date: string, timeZone: string) => events
  .filter((event) => eventOccursOnDate(event, date, timeZone))
  .sort((left, right) => Number(left.allDay) - Number(right.allDay)
    || (left.startAt ?? '').localeCompare(right.startAt ?? ''))

export const todayHabitProgress = (habits: Habit[], logs: HabitLog[], date: string) => {
  const scheduled = habits.filter((habit) => isHabitScheduledOn(habit, date))
  const logsByHabit = new Map(logs.map((log) => [log.habitId, log]))
  const completed = scheduled.filter((habit) => logsByHabit.get(habit.id)?.status === 'completed').length
  return { scheduled, completed }
}

export const todayMetrics = ({
  tasks,
  habitsCompleted,
  habitsScheduled,
  focusSessions,
  workouts,
  timeZone,
  now = new Date(),
}: {
  tasks: Task[]
  habitsCompleted: number
  habitsScheduled: number
  focusSessions: FocusSession[]
  workouts: WorkoutSession[]
  timeZone: string
  now?: Date
}) => {
  const today = localDateKey(now, timeZone)
  return {
    tasksCompleted: tasks.filter((task) => task.completedAt && localDateKey(new Date(task.completedAt), timeZone) === today).length,
    habitsCompleted,
    habitsScheduled,
    focusMinutes: Math.round(focusSessions
      .filter((session) => session.sessionType === 'focus' && localDateKey(new Date(session.startedAt), timeZone) === today)
      .reduce((total, session) => total + session.focusedSeconds, 0) / 60),
    workoutsCompleted: workouts.filter((workout) => workout.endedAt && localDateKey(new Date(workout.endedAt), timeZone) === today).length,
  }
}
