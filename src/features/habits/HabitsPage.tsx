import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Leaf, Plus } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { localDateKey } from '@/lib/dates'
import { HabitEditor } from './HabitEditor'
import { mergeVisibleHabitOrder, moveHabitInList } from './habitOrdering'
import { HabitInsightsPage } from './HabitInsightsPage'
import { isHabitScheduledOn } from './habitRules'
import { HabitTodayCard } from './HabitTodayCard'
import { HabitViewSwitch } from './HabitViewSwitch'
import { useHabitDateContext, useHabitLogs, useHabits, useReorderHabits, useUpsertHabitLog } from './queries'
import type { Habit } from './types'

function HabitsTodayPage() {
  const { timeZone } = useHabitDateContext()
  const today = localDateKey(new Date(), timeZone)
  const habitsQuery = useHabits()
  const logsQuery = useHabitLogs({ dateStart: today, dateEnd: today })
  const progressMutation = useUpsertHabitLog()
  const reorderMutation = useReorderHabits()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const habits = habitsQuery.data ?? []
  const scheduledHabits = habits.filter((habit) => isHabitScheduledOn(habit, today))
  const logsByHabit = new Map((logsQuery.data ?? []).map((log) => [log.habitId, log]))
  const completed = scheduledHabits.filter((habit) => logsByHabit.get(habit.id)?.status === 'completed').length
  const openCreate = () => { setEditingHabit(undefined); setEditorOpen(true) }
  const persistVisibleOrder = (visibleOrder: Habit[]) => reorderMutation.mutate(mergeVisibleHabitOrder(habits, visibleOrder))
  const moveHabit = (habit: Habit, direction: 'up' | 'down') => persistVisibleOrder(
    moveHabitInList(scheduledHabits, habit.id, direction),
  )
  const finishDrag = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = scheduledHabits.findIndex(({ id }) => id === active.id)
    const to = scheduledHabits.findIndex(({ id }) => id === over.id)
    if (from >= 0 && to >= 0) persistVisibleOrder(arrayMove(scheduledHabits, from, to))
  }

  return (
    <section className="page-stack habits-page">
      <PageHeader eyebrow={`Habits · ${today}`} title="Keep the rhythm visible." description={`Today follows ${timeZone}; only scheduled habits count.`} actions={<Button type="button" onClick={openCreate}><Plus aria-hidden />New habit</Button>} />
      <HabitViewSwitch active="today" />
      <div className="habits-summary"><span className="habits-summary__icon"><Leaf aria-hidden /></span><span><span className="eyebrow">Today</span><strong>{completed} of {scheduledHabits.length} complete</strong></span><span className="habits-summary__bar"><i style={{ width: `${scheduledHabits.length ? completed / scheduledHabits.length * 100 : 0}%` }} /></span></div>
      {habitsQuery.isPending || logsQuery.isPending ? (
        <div className="habits-loading" role="status" aria-label="Loading habits"><span /><span /><span /></div>
      ) : habitsQuery.error || logsQuery.error ? (
        <div className="habits-error" role="alert"><strong>Habits could not be loaded.</strong><p>Your progress was not changed. Try the local connection again.</p><Button variant="secondary" type="button" onClick={() => void Promise.all([habitsQuery.refetch(), logsQuery.refetch()])}>Try again</Button></div>
      ) : (
        <div className={`habits-layout${editorOpen ? ' habits-layout--editing' : ''}`}>
          <div className="habits-list" aria-live="polite">
            {habits.length === 0 ? (
              <div className="habits-empty"><Leaf aria-hidden /><strong>Your first habit starts here.</strong><p>Choose a small action and a schedule you can actually keep.</p><Button type="button" onClick={openCreate}>Create habit</Button></div>
            ) : scheduledHabits.length === 0 ? (
              <div className="habits-empty"><Leaf aria-hidden /><strong>Nothing scheduled today.</strong><p>Your active habits return on their configured days.</p></div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={finishDrag}>
                <SortableContext items={scheduledHabits.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
                  {scheduledHabits.map((habit, index) => (
                    <HabitTodayCard key={habit.id} habit={habit} log={logsByHabit.get(habit.id)} date={today} pending={progressMutation.isPending && progressMutation.variables?.habitId === habit.id} index={index} habitCount={scheduledHabits.length} isReordering={reorderMutation.isPending} onMove={moveHabit} onProgress={(input) => progressMutation.mutateAsync(input).then(() => undefined)} onEdit={() => { setEditingHabit(habit); setEditorOpen(true) }} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {progressMutation.error || reorderMutation.error ? <p className="habits-mutation-error" role="alert">{(progressMutation.error ?? reorderMutation.error)?.message}</p> : null}
          </div>
          {editorOpen ? <HabitEditor key={editingHabit?.id ?? 'new'} habit={editingHabit} newPosition={Math.max(0, ...habits.map(({ position }) => position)) + 1000} onClose={() => setEditorOpen(false)} onSaved={() => setEditorOpen(false)} /> : null}
        </div>
      )}
    </section>
  )
}

export default function HabitsPage() {
  const { pathname } = useLocation()
  if (pathname === '/habits') return <HabitsTodayPage />
  return <HabitInsightsPage />
}
