import { addLocalDays } from '@/lib/dates'
import type { Habit, HabitLog, HabitLogInput, HabitLogStatus } from './types'

const weekdayForDate = (date: string) => new Date(`${date}T00:00:00.000Z`).getUTCDay()

export const followsHabitSchedule = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays'>,
  date: string,
) => habit.scheduleType === 'daily' || Boolean(habit.weekdays?.includes(weekdayForDate(date)))

export const isHabitScheduledOn = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays' | 'isActive'>,
  date: string,
) => habit.isActive && followsHabitSchedule(habit, date)

const isWithinActivityWindow = (date: string, activeStart: string, activeEnd: string) =>
  date >= activeStart && date <= activeEnd

export const isHabitExpectedOn = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays'>,
  date: string,
  activeStart: string,
  activeEnd: string,
) => isWithinActivityWindow(date, activeStart, activeEnd) && followsHabitSchedule(habit, date)

export const habitLogStatus = (count: number, targetCount: number, skipped = false): HabitLogStatus => {
  if (skipped) return 'skipped'
  return count >= targetCount ? 'completed' : 'in_progress'
}

export type HabitProgressAction = 'increment' | 'decrement' | 'skip' | 'unskip'

export const nextHabitLog = (
  habit: Pick<Habit, 'id' | 'targetCount'>,
  current: Pick<HabitLog, 'count' | 'status' | 'note'> | undefined,
  localDate: string,
  action: HabitProgressAction,
): HabitLogInput => {
  const currentCount = current?.status === 'skipped' ? 0 : current?.count ?? 0
  if (action === 'skip') return { habitId: habit.id, localDate, count: 0, status: 'skipped', note: current?.note ?? null }
  if (action === 'unskip') return { habitId: habit.id, localDate, count: 0, status: 'in_progress', note: null }
  const count = action === 'increment'
    ? Math.min(habit.targetCount, currentCount + 1)
    : Math.max(0, currentCount - 1)
  return {
    habitId: habit.id,
    localDate,
    count,
    status: habitLogStatus(count, habit.targetCount),
    note: current?.note ?? null,
  }
}

const completedOn = (habit: Pick<Habit, 'targetCount'>, log: HabitLog | undefined) =>
  log?.status === 'completed' && log.count >= habit.targetCount

export const calculateHabitStreaks = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays' | 'targetCount'>,
  logs: HabitLog[],
  startDate: string,
  throughDate: string,
  activeStart = startDate,
  activeEnd = throughDate,
) => {
  const logsByDate = new Map(logs.map((log) => [log.localDate, log]))
  const scheduledDates: string[] = []
  for (let date = startDate; date <= throughDate; date = addLocalDays(date, 1)) {
    if (isHabitExpectedOn(habit, date, activeStart, activeEnd)) scheduledDates.push(date)
  }

  let longest = 0
  let run = 0
  for (const date of scheduledDates) {
    if (completedOn(habit, logsByDate.get(date))) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }

  let current = 0
  for (let index = scheduledDates.length - 1; index >= 0; index -= 1) {
    const date = scheduledDates[index]
    if (!date) continue
    const log = logsByDate.get(date)
    if (date === throughDate && !completedOn(habit, log) && log?.status !== 'skipped') continue
    if (!completedOn(habit, log)) break
    current += 1
  }
  return { current, longest }
}

export const habitCompletionRate = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays' | 'targetCount'>,
  logs: HabitLog[],
  startDate: string,
  endDate: string,
  activeStart = startDate,
  activeEnd = endDate,
) => {
  const logsByDate = new Map(logs.map((log) => [log.localDate, log]))
  let scheduled = 0
  let completed = 0
  for (let date = startDate; date <= endDate; date = addLocalDays(date, 1)) {
    if (!isHabitExpectedOn(habit, date, activeStart, activeEnd)) continue
    scheduled += 1
    if (completedOn(habit, logsByDate.get(date))) completed += 1
  }
  return { completed, scheduled, rate: scheduled === 0 ? 0 : completed / scheduled }
}

export type HabitHistoryState = 'unscheduled' | 'missed' | 'in_progress' | 'completed' | 'skipped'

export interface HabitHistoryDay {
  date: string
  scheduled: boolean
  state: HabitHistoryState
  count: number
  progress: number
  note: string | null
}

export const buildHabitHistoryDays = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays' | 'targetCount'>,
  logs: HabitLog[],
  startDate: string,
  endDate: string,
  activeStart = startDate,
  activeEnd = endDate,
): HabitHistoryDay[] => {
  const logsByDate = new Map(logs.map((log) => [log.localDate, log]))
  const days: HabitHistoryDay[] = []
  for (let date = startDate; date <= endDate; date = addLocalDays(date, 1)) {
    const scheduled = isHabitExpectedOn(habit, date, activeStart, activeEnd)
    const log = logsByDate.get(date)
    const count = log?.status === 'skipped' ? 0 : log?.count ?? 0
    let state: HabitHistoryState = scheduled ? 'missed' : 'unscheduled'
    if (log?.status === 'skipped') state = 'skipped'
    else if (completedOn(habit, log)) state = 'completed'
    else if (count > 0) state = 'in_progress'
    days.push({
      date,
      scheduled,
      state,
      count,
      progress: Math.min(1, count / habit.targetCount),
      note: log?.note ?? null,
    })
  }
  return days
}

export const startOfHabitWeek = (date: string, weekStartsOn: number) => {
  const offset = (weekdayForDate(date) - weekStartsOn + 7) % 7
  return addLocalDays(date, -offset)
}

export interface HabitInsightSummary {
  streaks: { current: number; longest: number }
  week: ReturnType<typeof habitCompletionRate>
  month: ReturnType<typeof habitCompletionRate>
}

export const calculateHabitInsightSummary = (
  habit: Pick<Habit, 'scheduleType' | 'weekdays' | 'targetCount' | 'isActive'>,
  logs: HabitLog[],
  options: {
    today: string
    createdOn: string
    archivedOn: string | null
    weekStartsOn: number
  },
): HabitInsightSummary => {
  const activeEnd = options.archivedOn && options.archivedOn < options.today
    ? options.archivedOn
    : options.today
  const streaks = calculateHabitStreaks(
    habit,
    logs,
    options.createdOn,
    options.today,
    options.createdOn,
    activeEnd,
  )
  return {
    streaks: { current: habit.isActive ? streaks.current : 0, longest: streaks.longest },
    week: habitCompletionRate(
      habit,
      logs,
      startOfHabitWeek(options.today, options.weekStartsOn),
      options.today,
      options.createdOn,
      activeEnd,
    ),
    month: habitCompletionRate(
      habit,
      logs,
      `${options.today.slice(0, 8)}01`,
      options.today,
      options.createdOn,
      activeEnd,
    ),
  }
}
