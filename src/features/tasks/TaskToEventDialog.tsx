import { CalendarPlus2, Clock3, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { formatTimestampForInput, localDateKey } from '@/lib/dates'
import { useConvertTaskToCalendarEvent } from './queries'
import type { Task } from './types'

const roundedDefaultTime = (timeZone: string) => {
  const value = formatTimestampForInput(new Date().toISOString(), timeZone)
  const hour = Number(value.slice(11, 13))
  const minute = Number(value.slice(14, 16))
  const rounded = Math.ceil(minute / 15) * 15
  const total = Math.min(23 * 60 + 45, hour * 60 + rounded)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function TaskToEventDialog({
  task,
  timeZone,
  onClose,
  onConverted,
}: {
  task: Task
  timeZone: string
  onClose: () => void
  onConverted: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [startTime, setStartTime] = useState(() => roundedDefaultTime(timeZone))
  const convertTask = useConvertTaskToCalendarEvent()
  const eventDate = task.scheduledDate ?? localDateKey(new Date(task.createdAt), timeZone)
  const duration = task.estimateMinutes ?? 60

  useEffect(() => inputRef.current?.focus(), [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !convertTask.isPending) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [convertTask.isPending, onClose])

  const convert = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return
    try {
      await convertTask.mutateAsync({ taskId: task.id, startTime })
      onConverted()
    } catch {
      // Keep the modal and selected time available for a durable retry.
    }
  }

  return (
    <div className="task-to-event-dialog__backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="task-to-event-dialog" role="dialog" aria-modal="true" aria-labelledby="task-to-event-title">
        <header>
          <span><CalendarPlus2 aria-hidden /><span><small>Calendar event</small><strong id="task-to-event-title">Choose a start time</strong></span></span>
          <button type="button" aria-label="Close task conversion" onClick={onClose}><X aria-hidden /></button>
        </header>
        <p><strong>{task.title}</strong> will move to {eventDate}. Its duration will be {duration} minutes.</p>
        <label>
          <span><Clock3 aria-hidden />Start time</span>
          <input ref={inputRef} type="time" step="900" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </label>
        {convertTask.error ? <p className="task-to-event-dialog__error" role="alert">The task could not be converted. Nothing was removed; try again.</p> : null}
        <footer>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" isLoading={convertTask.isPending} onClick={() => void convert()}><CalendarPlus2 aria-hidden />Turn into event</Button>
        </footer>
      </section>
    </div>
  )
}
