import { isHabitExpectedOn } from '@/features/habits/habitRules'
import type { Habit, HabitLog, HabitLogStatus } from '@/features/habits/types'
import { localDateKey } from '@/lib/dates'

export interface CalendarHabitItem {
  id: string
  habitId: string
  date: string
  title: string
  colorToken: Habit['colorToken']
  count: number
  targetCount: number
  unit: string | null
  status: HabitLogStatus | 'pending'
}

export const projectHabitCalendarItems = (
  habits: Habit[],
  logs: HabitLog[],
  dateStart: string,
  dateEnd: string,
  timeZone: string,
) => {
  const logsByHabitDate = new Map(logs.map((log) => [`${log.habitId}:${log.localDate}`, log]))
  const items: CalendarHabitItem[] = []
  for (const habit of habits) {
    const activeStart = localDateKey(new Date(habit.createdAt), timeZone)
    const activeEnd = habit.archivedAt ? localDateKey(new Date(habit.archivedAt), timeZone) : dateEnd
    for (let date = dateStart; date <= dateEnd;) {
      if (isHabitExpectedOn(habit, date, activeStart, activeEnd)) {
        const log = logsByHabitDate.get(`${habit.id}:${date}`)
        items.push({
          id: `${habit.id}:${date}`,
          habitId: habit.id,
          date,
          title: habit.title,
          colorToken: habit.colorToken,
          count: log?.status === 'skipped' ? 0 : log?.count ?? 0,
          targetCount: habit.targetCount,
          unit: habit.unit,
          status: log?.status ?? 'pending',
        })
      }
      const next = new Date(`${date}T00:00:00.000Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      date = next.toISOString().slice(0, 10)
    }
  }
  const positions = new Map(habits.map((habit) => [habit.id, habit.position]))
  return items.sort((left, right) => left.date.localeCompare(right.date)
    || (positions.get(left.habitId) ?? 0) - (positions.get(right.habitId) ?? 0))
}

export const formatCalendarHabitProgress = (item: CalendarHabitItem) => {
  if (item.status === 'skipped') return 'Skipped'
  if (item.status === 'completed') return 'Complete'
  return `${item.count}/${item.targetCount} ${item.unit ?? (item.targetCount === 1 ? 'time' : 'times')}`
}
