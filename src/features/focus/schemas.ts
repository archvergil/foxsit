import { z } from 'zod'

export const focusPhaseSchema = z.enum(['focus', 'short_break', 'long_break'])

export const createFocusSessionSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
  plannedSeconds: z.number().int().min(1).max(86_400),
  focusedSeconds: z.number().int().min(0).max(86_400),
  sessionType: focusPhaseSchema,
  completed: z.boolean(),
}).superRefine((value, context) => {
  if (new Date(value.endedAt).getTime() < new Date(value.startedAt).getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endedAt'], message: 'End time must follow start time.' })
  }
  if (value.focusedSeconds > value.plannedSeconds) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['focusedSeconds'], message: 'Focused time cannot exceed planned time.' })
  }
  if (value.completed && value.focusedSeconds !== value.plannedSeconds) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['focusedSeconds'], message: 'A completed session must reach its planned time.' })
  }
  if (value.taskId && value.sessionType !== 'focus') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['taskId'], message: 'Only focus sessions can be linked to a task.' })
  }
})
