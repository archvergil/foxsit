import type { Habit, HabitInput, HabitLog, HabitLogInput, HabitProject, HabitProjectInput } from './types'

export interface HabitLogRange {
  dateStart: string
  dateEnd: string
  habitId?: string | undefined
}

export interface HabitsRepository {
  listProjects(userId: string): Promise<HabitProject[]>
  createProject(userId: string, input: HabitProjectInput): Promise<HabitProject>
  updateProject(userId: string, projectId: string, input: HabitProjectInput): Promise<HabitProject>
  deleteProject(userId: string, projectId: string): Promise<void>
  listHabits(userId: string, includeInactive?: boolean): Promise<Habit[]>
  createHabit(userId: string, input: HabitInput): Promise<Habit>
  updateHabit(userId: string, habitId: string, input: HabitInput): Promise<Habit>
  deleteHabit(userId: string, habitId: string): Promise<void>
  clearHabitHistory(userId: string, habitId: string): Promise<void>
  reorderHabits(userId: string, orderedHabitIds: string[]): Promise<Habit[]>
  listLogs(userId: string, range: HabitLogRange): Promise<HabitLog[]>
  upsertLog(userId: string, input: HabitLogInput): Promise<HabitLog>
}

export const habitQueryKeys = {
  all: ['habits'] as const,
  projects: (userId: string) => ['habits', 'projects', userId] as const,
  lists: (userId: string) => ['habits', 'list', userId] as const,
  list: (userId: string, includeInactive: boolean) => ['habits', 'list', userId, includeInactive] as const,
  logs: (userId: string) => ['habits', 'logs', userId] as const,
  logRange: (userId: string, range: HabitLogRange) => ['habits', 'logs', userId, range] as const,
}
