import { z } from 'zod'

import { isValidLocalDate } from '@/lib/dates'
import type { HabitInput, HabitLogInput } from './types'

export const habitColorTokenSchema = z.enum(['mint', 'coral', 'blue', 'sand', 'slate'])
export const habitScheduleTypeSchema = z.enum(['daily', 'weekdays'])
export const habitLogStatusSchema = z.enum(['in_progress', 'completed', 'skipped'])
export const habitIconSchema = z.enum([
  'circle-check-big',
  'glass-water',
  'book-open',
  'dumbbell',
  'footprints',
  'brain',
])
const weekdaySchema = z.number().int().min(0).max(6)

export const habitInputSchema = z.object({
  title: z.string().trim().min(1, 'Habit title is required.').max(200),
  description: z.string().trim().max(10_000).nullable(),
  icon: habitIconSchema,
  colorToken: habitColorTokenSchema,
  scheduleType: habitScheduleTypeSchema,
  weekdays: z.array(weekdaySchema).min(1).max(7).nullable(),
  targetCount: z.number().int().min(1).max(10_000),
  unit: z.string().trim().min(1).max(40).nullable(),
  position: z.number().min(0),
  isActive: z.boolean(),
}).superRefine((habit, context) => {
  if (habit.scheduleType === 'daily' && habit.weekdays !== null) {
    context.addIssue({ code: 'custom', path: ['weekdays'], message: 'Daily habits cannot specify weekdays.' })
  }
  if (habit.scheduleType === 'weekdays' && (!habit.weekdays || new Set(habit.weekdays).size !== habit.weekdays.length)) {
    context.addIssue({ code: 'custom', path: ['weekdays'], message: 'Choose one or more unique weekdays.' })
  }
})

export const habitFormSchema = z.object({
  title: z.string().trim().min(1, 'Habit title is required.').max(200),
  description: z.string().max(10_000),
  icon: habitIconSchema,
  colorToken: habitColorTokenSchema,
  scheduleType: habitScheduleTypeSchema,
  weekdays: z.array(z.coerce.number().pipe(weekdaySchema)).max(7),
  targetCount: z.coerce.number().int().min(1, 'Target must be at least 1.').max(10_000),
  unit: z.string().max(40),
}).superRefine((habit, context) => {
  if (habit.scheduleType === 'weekdays' && habit.weekdays.length === 0) {
    context.addIssue({ code: 'custom', path: ['weekdays'], message: 'Choose at least one day.' })
  }
})

export type HabitFormValues = z.infer<typeof habitFormSchema>

export const habitToInput = (habit: HabitInput, isActive = habit.isActive): HabitInput => ({
  title: habit.title,
  description: habit.description,
  icon: habit.icon,
  colorToken: habit.colorToken,
  scheduleType: habit.scheduleType,
  weekdays: habit.weekdays,
  targetCount: habit.targetCount,
  unit: habit.unit,
  position: habit.position,
  isActive,
})

export const resolveHabitForm = (values: HabitFormValues, position = 1000): HabitInput => habitInputSchema.parse({
  title: values.title,
  description: values.description.trim() || null,
  icon: values.icon,
  colorToken: values.colorToken,
  scheduleType: values.scheduleType,
  weekdays: values.scheduleType === 'daily' ? null : [...new Set(values.weekdays)].sort((left, right) => left - right),
  targetCount: values.targetCount,
  unit: values.unit.trim() || null,
  position,
  isActive: true,
})

export const habitLogInputSchema = z.object({
  habitId: z.string().uuid(),
  localDate: z.string().refine(isValidLocalDate, 'Enter a valid local date.'),
  count: z.number().int().min(0),
  status: habitLogStatusSchema,
  note: z.string().max(1000).nullable(),
}).superRefine((log, context) => {
  if (log.status === 'skipped' && log.count !== 0) {
    context.addIssue({ code: 'custom', path: ['count'], message: 'Skipped habits must have zero progress.' })
  }
  if (log.status === 'completed' && log.count === 0) {
    context.addIssue({ code: 'custom', path: ['count'], message: 'Completed habits require progress.' })
  }
}) satisfies z.ZodType<HabitLogInput>
