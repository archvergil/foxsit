import { z } from 'zod'

import { isValidLocalDate, localDateTimeToTimestamp } from '@/lib/dates'
import type { CalendarEventInput } from './types'

export const calendarColorTokenSchema = z.enum(['mint', 'coral', 'blue', 'sand', 'slate'])
const localDateSchema = z.string().refine(isValidLocalDate, 'Enter a valid date.')
const timestampSchema = z.string().datetime({ offset: true })

export const calendarEventInputSchema = z.object({
  title: z.string().trim().min(1, 'Event title is required.').max(200),
  description: z.string().trim().max(10_000).nullable(),
  allDay: z.boolean(),
  startAt: timestampSchema.nullable(),
  endAt: timestampSchema.nullable(),
  startDate: localDateSchema.nullable(),
  endDate: localDateSchema.nullable(),
  category: z.string().trim().min(1).max(120).nullable(),
  colorToken: calendarColorTokenSchema,
  location: z.string().trim().min(1).max(240).nullable(),
}).superRefine((event, context) => {
  if (event.allDay) {
    if (!event.startDate || !event.endDate || event.startAt || event.endAt) {
      context.addIssue({ code: 'custom', path: ['startDate'], message: 'All-day events require dates only.' })
    } else if (event.endDate < event.startDate) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date.' })
    }
  } else if (!event.startAt || !event.endAt || event.startDate || event.endDate) {
    context.addIssue({ code: 'custom', path: ['startAt'], message: 'Timed events require start and end times.' })
  } else if (new Date(event.endAt).getTime() <= new Date(event.startAt).getTime()) {
    context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time must be after start time.' })
  }
})

const localDateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  'Enter a valid local date and time.',
)

export const calendarEventFormSchema = z.object({
  title: z.string().trim().min(1, 'Event title is required.').max(200),
  description: z.string().max(10_000),
  allDay: z.boolean(),
  startAt: z.union([z.literal(''), localDateTimeSchema]),
  endAt: z.union([z.literal(''), localDateTimeSchema]),
  startDate: z.union([z.literal(''), localDateSchema]),
  endDate: z.union([z.literal(''), localDateSchema]),
  category: z.string().max(120),
  colorToken: calendarColorTokenSchema,
  location: z.string().max(240),
}).superRefine((event, context) => {
  if (event.allDay) {
    if (!event.startDate) context.addIssue({ code: 'custom', path: ['startDate'], message: 'Start date is required.' })
    if (!event.endDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date is required.' })
    if (event.startDate && event.endDate && event.endDate < event.startDate) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date.' })
    }
  } else {
    if (!event.startAt) context.addIssue({ code: 'custom', path: ['startAt'], message: 'Start time is required.' })
    if (!event.endAt) context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time is required.' })
    if (event.startAt && event.endAt && event.endAt <= event.startAt) {
      context.addIssue({ code: 'custom', path: ['endAt'], message: 'End time must be after start time.' })
    }
  }
})

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>

export type CalendarFormResolution =
  | { success: true; data: CalendarEventInput }
  | { success: false; field: 'startAt' | 'endAt'; message: string }

export const resolveCalendarEventForm = (
  values: CalendarEventFormValues,
  timeZone: string,
): CalendarFormResolution => {
  if (values.allDay) {
    return {
      success: true,
      data: calendarEventInputSchema.parse({
        title: values.title,
        description: values.description.trim() || null,
        allDay: true,
        startAt: null,
        endAt: null,
        startDate: values.startDate,
        endDate: values.endDate,
        category: values.category.trim() || null,
        colorToken: values.colorToken,
        location: values.location.trim() || null,
      }),
    }
  }

  const startAt = localDateTimeToTimestamp(values.startAt, timeZone)
  if (!startAt) return { success: false, field: 'startAt', message: `That time does not exist in ${timeZone}.` }
  const endAt = localDateTimeToTimestamp(values.endAt, timeZone)
  if (!endAt) return { success: false, field: 'endAt', message: `That time does not exist in ${timeZone}.` }

  return {
    success: true,
    data: calendarEventInputSchema.parse({
      title: values.title,
      description: values.description.trim() || null,
      allDay: false,
      startAt,
      endAt,
      startDate: null,
      endDate: null,
      category: values.category.trim() || null,
      colorToken: values.colorToken,
      location: values.location.trim() || null,
    }),
  }
}
