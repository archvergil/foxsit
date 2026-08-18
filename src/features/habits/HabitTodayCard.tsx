import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, Check, GripVertical, Minus, Pencil, Plus, RotateCcw, SkipForward } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

import { nextHabitLog, type HabitProgressAction } from './habitRules'
import { HabitGlyph } from './HabitGlyph'
import { habitAccentStyle } from './habitVisuals'
import type { Habit, HabitLog } from './types'

export function HabitTodayCard({ habit, log, date, pending, index, habitCount, isReordering, onProgress, onEdit, onMove }: {
  habit: Habit
  log?: HabitLog | undefined
  date: string
  pending: boolean
  index: number
  habitCount: number
  isReordering: boolean
  onProgress: (input: ReturnType<typeof nextHabitLog>) => Promise<void>
  onEdit: () => void
  onMove: (habit: Habit, direction: 'up' | 'down') => void
}) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: habit.id,
    disabled: isReordering,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...habitAccentStyle(habit),
  }
  const count = log?.status === 'skipped' ? 0 : log?.count ?? 0
  const completed = log?.status === 'completed'
  const skipped = log?.status === 'skipped'
  const progress = Math.min(100, count / habit.targetCount * 100)
  const [skipEditorOpen, setSkipEditorOpen] = useState(false)
  const [skipReason, setSkipReason] = useState(log?.note ?? '')
  const apply = (action: HabitProgressAction) => onProgress(nextHabitLog(habit, log, date, action))

  const confirmSkip = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await onProgress({
        ...nextHabitLog(habit, log, date, 'skip'),
        note: skipReason.trim() || null,
      })
      setSkipEditorOpen(false)
    } catch {
      // The parent keeps the durable mutation error visible.
    }
  }

  return (
    <article ref={setNodeRef} style={style} className={`habit-today-card habit-today-card--${habit.colorToken}${completed ? ' habit-today-card--completed' : ''}${skipped ? ' habit-today-card--skipped' : ''}${isDragging ? ' habit-today-card--dragging' : ''}`}>
      <button
        className="habit-today-card__completion"
        type="button"
        disabled={pending || skipped}
        aria-label={completed ? `${habit.title} completed. Mark as incomplete` : `Mark ${habit.title} done`}
        onClick={() => void apply(completed ? 'decrement' : 'increment')}
      >
        {completed ? <Check aria-hidden /> : <span />}
      </button>
      <span className="habit-today-card__icon"><HabitGlyph icon={habit.icon} /></span>
      <div className="habit-today-card__body">
        <header>
          <span><strong>{habit.title}</strong><small>{habit.description ?? `${habit.targetCount} ${habit.unit ?? (habit.targetCount === 1 ? 'time' : 'times')} today`}</small></span>
          <span className="habit-today-card__header-actions">
            <button ref={setActivatorNodeRef} type="button" aria-label={`Drag to reorder ${habit.title}`} disabled={isReordering} {...attributes} {...listeners}><GripVertical aria-hidden /></button>
            <button type="button" aria-label={`Move ${habit.title} up`} disabled={index === 0 || isReordering} onClick={() => onMove(habit, 'up')}><ArrowUp aria-hidden /></button>
            <button type="button" aria-label={`Move ${habit.title} down`} disabled={index === habitCount - 1 || isReordering} onClick={() => onMove(habit, 'down')}><ArrowDown aria-hidden /></button>
            <button type="button" aria-label={`Edit habit ${habit.title}`} onClick={onEdit}><Pencil aria-hidden /></button>
          </span>
        </header>
        <div className="habit-today-card__progress" aria-label={`${count} of ${habit.targetCount} ${habit.unit ?? 'times'}`}><span><i style={{ width: `${progress}%` }} /></span><strong>{skipped ? 'Skipped' : `${count}/${habit.targetCount} ${habit.unit ?? (habit.targetCount === 1 ? 'time' : 'times')}`}</strong></div>
        <div className="habit-today-card__actions">
          {habit.targetCount > 1 && count > 0 && !skipped ? <button type="button" disabled={pending} aria-label={`Decrease ${habit.title}`} onClick={() => void apply('decrement')}><Minus aria-hidden /></button> : null}
          <button className="habit-today-card__primary" type="button" disabled={pending || skipped} aria-label={completed ? `Undo ${habit.title}` : `Increment ${habit.title}`} onClick={() => void apply(completed ? 'decrement' : 'increment')}>
            {completed ? <><RotateCcw aria-hidden />Undo</> : <>{habit.targetCount === 1 ? <Check aria-hidden /> : <Plus aria-hidden />}{habit.targetCount === 1 ? 'Done' : 'Add'}</>}
          </button>
          <button type="button" disabled={pending} aria-label={skipped ? `Restore ${habit.title}` : `Skip ${habit.title}`} onClick={() => skipped ? void apply('unskip') : setSkipEditorOpen(true)}>{skipped ? <RotateCcw aria-hidden /> : <SkipForward aria-hidden />}{skipped ? 'Restore' : 'Skip'}</button>
        </div>
        {skipEditorOpen ? (
          <form className="habit-skip-editor" aria-label={`Skip ${habit.title}`} onSubmit={(event) => void confirmSkip(event)}>
            <label><span>Reason <small>optional</small></span><input autoFocus maxLength={1000} value={skipReason} onChange={(event) => setSkipReason(event.target.value)} placeholder="Travel, recovery, rest…" /></label>
            <span><button type="button" disabled={pending} onClick={() => setSkipEditorOpen(false)}>Cancel</button><button type="submit" disabled={pending}>Confirm skip</button></span>
          </form>
        ) : null}
      </div>
    </article>
  )
}
