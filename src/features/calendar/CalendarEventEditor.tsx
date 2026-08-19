import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatTimestampForInput } from '@/lib/dates'
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from './queries'
import {
  calendarEventFormSchema,
  resolveCalendarEventForm,
  type CalendarEventFormValues,
} from './schemas'
import { calendarSlotDateTimes } from './calendarWeek'
import type { CalendarEvent } from './types'

const formDefaults = (
  date: string,
  timeZone: string,
  event?: CalendarEvent,
  initialStartHour = 9,
): CalendarEventFormValues => {
  const slot = calendarSlotDateTimes(date, initialStartHour)
  if (!event) return {
    title: '', description: '', allDay: false,
    startAt: slot.startAt, endAt: slot.endAt, startDate: date, endDate: date,
    category: '', colorToken: 'blue', location: '',
  }
  return {
    title: event.title,
    description: event.description ?? '',
    allDay: event.allDay,
    startAt: formatTimestampForInput(event.startAt, timeZone),
    endAt: formatTimestampForInput(event.endAt, timeZone),
    startDate: event.startDate ?? date,
    endDate: event.endDate ?? date,
    category: event.category ?? '',
    colorToken: event.colorToken,
    location: event.location ?? '',
  }
}

export function CalendarEventEditor({
  date, timeZone, event, initialStartHour, onClose, onSaved, onDeleted,
}: {
  date: string
  timeZone: string
  event?: CalendarEvent | undefined
  initialStartHour?: number | undefined
  onClose: () => void
  onSaved: (event: CalendarEvent) => void
  onDeleted: () => void
}) {
  const createEvent = useCreateCalendarEvent()
  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()
  const form = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: formDefaults(date, timeZone, event, initialStartHour),
  })
  const allDay = useWatch({ control: form.control, name: 'allDay' })
  const pending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending
  const writeError = createEvent.error ?? updateEvent.error ?? deleteEvent.error

  const submit = form.handleSubmit(async (values) => {
    const resolved = resolveCalendarEventForm(values, timeZone)
    if (!resolved.success) {
      form.setError(resolved.field, { message: resolved.message })
      return
    }
    try {
      const saved = event
        ? await updateEvent.mutateAsync({ eventId: event.id, input: resolved.data })
        : await createEvent.mutateAsync(resolved.data)
      onSaved(saved)
    } catch {
      // Keep the editor and values available for retry.
    }
  })

  const remove = async () => {
    if (!event) return
    try {
      await deleteEvent.mutateAsync(event.id)
      onDeleted()
    } catch {
      // The durable-write error remains visible in the editor.
    }
  }

  return (
    <aside className="calendar-editor" aria-label={event ? `Edit event ${event.title}` : 'Create event'}>
      <header>
        <span><span className="eyebrow">{event ? 'Event details' : 'New event'}</span><h2>{event ? 'Edit event' : 'Plan something'}</h2></span>
        <button type="button" aria-label="Close event editor" onClick={onClose}><X aria-hidden /></button>
      </header>
      <form onSubmit={(submitEvent) => void submit(submitEvent)}>
        <label className="calendar-editor__wide">
          <span>Title</span>
          <input autoFocus {...form.register('title')} aria-invalid={Boolean(form.formState.errors.title)} />
          {form.formState.errors.title ? <small role="alert">{form.formState.errors.title.message}</small> : null}
        </label>
        <label className="calendar-editor__all-day calendar-editor__wide">
          <input type="checkbox" {...form.register('allDay')} /><span>All-day event</span>
        </label>
        {allDay ? (
          <>
            <label><span>Start date</span><input type="date" {...form.register('startDate')} />{form.formState.errors.startDate ? <small role="alert">{form.formState.errors.startDate.message}</small> : null}</label>
            <label><span>End date</span><input type="date" {...form.register('endDate')} />{form.formState.errors.endDate ? <small role="alert">{form.formState.errors.endDate.message}</small> : null}</label>
          </>
        ) : (
          <>
            <label><span>Starts · {timeZone}</span><input type="datetime-local" {...form.register('startAt')} />{form.formState.errors.startAt ? <small role="alert">{form.formState.errors.startAt.message}</small> : null}</label>
            <label><span>Ends · {timeZone}</span><input type="datetime-local" {...form.register('endAt')} />{form.formState.errors.endAt ? <small role="alert">{form.formState.errors.endAt.message}</small> : null}</label>
          </>
        )}
        <label><span>Category</span><input placeholder="Optional" {...form.register('category')} /></label>
        <label><span>Color</span><select {...form.register('colorToken')}><option value="mint">Mint</option><option value="coral">Coral</option><option value="blue">Blue</option><option value="sand">Sand</option><option value="slate">Slate</option></select></label>
        <label className="calendar-editor__wide"><span>Location</span><input placeholder="Optional" {...form.register('location')} /></label>
        <label className="calendar-editor__wide"><span>Description</span><textarea rows={4} placeholder="Optional context" {...form.register('description')} /></label>
        <Button className="calendar-editor__wide" type="submit" isLoading={createEvent.isPending || updateEvent.isPending}>{event ? 'Save event' : 'Create event'}</Button>
      </form>
      {writeError ? <p className="calendar-editor__error" role="alert">{writeError.message}</p> : null}
      {event ? (
        <ConfirmDialog
          actionLabel="Delete event"
          description="This event will be permanently removed from your calendar. This action cannot be undone."
          onConfirm={remove}
          pending={deleteEvent.isPending}
          title={`Delete “${event.title}”?`}
          trigger={<Button variant="quiet" type="button" disabled={pending}><Trash2 aria-hidden />Delete event</Button>}
        />
      ) : null}
    </aside>
  )
}
