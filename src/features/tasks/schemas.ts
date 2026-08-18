import { z } from 'zod'

import { isValidLocalDate } from '@/lib/dates'
import { collectionBannerAssetIds } from '@/lib/bannerAssets'

export { isValidLocalDate }

export const taskColorTokenSchema = z.enum(['mint', 'coral', 'blue', 'sand', 'slate'])
export const taskBannerAssetSchema = z.string().refine(
  (value) => collectionBannerAssetIds.includes(value),
  'Choose a valid project banner.',
)
export const taskPrioritySchema = z.enum(['none', 'low', 'medium', 'high'])
export const taskStatusSchema = z.enum(['open', 'completed', 'archived'])
export const localDateSchema = z.string().refine(isValidLocalDate, 'Enter a valid local date.')
export const nullableLocalDateSchema = localDateSchema.nullable()
export const nullableTimestampSchema = z.string().datetime({ offset: true }).nullable()

export const createTaskProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.').max(120),
  colorToken: taskColorTokenSchema.default('mint'),
  icon: z.string().trim().min(1).max(80).nullable().optional(),
  parentProjectId: z.string().uuid().nullable().optional(),
  bannerAsset: taskBannerAssetSchema.nullable().optional(),
  bannerMonochrome: z.boolean().optional(),
  position: z.number().nonnegative().optional(),
})

export const updateTaskProjectSchema = createTaskProjectSchema
  .partial()
  .extend({ archivedAt: nullableTimestampSchema.optional() })
  .refine((input) => Object.keys(input).length > 0, 'Provide at least one project change.')

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').max(500),
  projectId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
  priority: taskPrioritySchema.default('none'),
  scheduledDate: nullableLocalDateSchema.optional(),
  dueAt: nullableTimestampSchema.optional(),
  estimateMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  position: z.number().nonnegative().optional(),
})

export const updateTaskSchema = createTaskSchema
  .omit({ title: true })
  .partial()
  .extend({ title: z.string().trim().min(1).max(500).optional() })
  .refine((input) => Object.keys(input).length > 0, 'Provide at least one task change.')

export const createChecklistItemSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1, 'Checklist title is required.').max(500),
  position: z.number().nonnegative().optional(),
})

export const updateChecklistItemSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    completed: z.boolean().optional(),
    position: z.number().nonnegative().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'Provide at least one checklist change.')
