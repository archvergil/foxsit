export type HabitColorToken = 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
export type HabitIcon = 'circle-check-big' | 'glass-water' | 'book-open' | 'dumbbell' | 'footprints' | 'brain'
export type HabitScheduleType = 'daily' | 'weekdays'
export type HabitLogStatus = 'in_progress' | 'completed' | 'skipped'

export interface HabitProject {
  id: string
  userId: string
  name: string
  icon: string | null
  colorToken: HabitColorToken
  customColor: string | null
  bannerAsset: string | null
  bannerMonochrome: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface HabitProjectInput {
  name: string
  icon: string | null
  colorToken: HabitColorToken
  customColor: string | null
  bannerAsset: string | null
  bannerMonochrome: boolean
  position: number
}

export interface Habit {
  id: string
  userId: string
  title: string
  description: string | null
  icon: HabitIcon
  colorToken: HabitColorToken
  customColor?: string | null | undefined
  projectId?: string | null | undefined
  scheduleType: HabitScheduleType
  weekdays: number[] | null
  targetCount: number
  unit: string | null
  position: number
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface HabitInput {
  title: string
  description: string | null
  icon: HabitIcon
  colorToken: HabitColorToken
  customColor?: string | null | undefined
  projectId?: string | null | undefined
  scheduleType: HabitScheduleType
  weekdays: number[] | null
  targetCount: number
  unit: string | null
  position: number
  isActive: boolean
}

export interface HabitLog {
  id: string
  userId: string
  habitId: string
  localDate: string
  count: number
  status: HabitLogStatus
  note: string | null
  source: 'manual' | 'workout' | null
  sourceId: string | null
  createdAt: string
  updatedAt: string
}

export interface HabitLogInput {
  habitId: string
  localDate: string
  count: number
  status: HabitLogStatus
  note: string | null
}
