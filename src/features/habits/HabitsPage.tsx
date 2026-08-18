import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FolderPlus, Leaf, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { VisualBanner } from '@/components/visual/VisualBanner'
import { localDateKey } from '@/lib/dates'
import { HabitEditor } from './HabitEditor'
import { HabitInsightsPage } from './HabitInsightsPage'
import { HabitProjectEditor } from './HabitProjectEditor'
import { HabitProjectGlyph } from './HabitProjectGlyph'
import { mergeVisibleHabitOrder, moveHabitInList } from './habitOrdering'
import { isHabitScheduledOn } from './habitRules'
import { HabitTodayCard } from './HabitTodayCard'
import { HabitViewSwitch } from './HabitViewSwitch'
import { useHabitDateContext, useHabitLogs, useHabitProjects, useHabits, useReorderHabits, useUpsertHabitLog } from './queries'
import type { Habit, HabitProject } from './types'

function HabitsTodayPage() {
  const { timeZone } = useHabitDateContext()
  const today = localDateKey(new Date(), timeZone)
  const habitsQuery = useHabits()
  const projectsQuery = useHabitProjects()
  const logsQuery = useHabitLogs({ dateStart: today, dateEnd: today })
  const progressMutation = useUpsertHabitLog()
  const reorderMutation = useReorderHabits()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [projectEditor, setProjectEditor] = useState<HabitProject | 'new' | null>(null)
  const habits = habitsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const scheduledHabits = habits.filter((habit) => isHabitScheduledOn(habit, today))
  const logsByHabit = new Map((logsQuery.data ?? []).map((log) => [log.habitId, log]))
  const completed = scheduledHabits.filter((habit) => logsByHabit.get(habit.id)?.status === 'completed').length
  const openCreate = () => { setEditingHabit(undefined); setEditorOpen(true) }
  const persistVisibleOrder = (visibleOrder: Habit[]) => reorderMutation.mutate(mergeVisibleHabitOrder(habits, visibleOrder))
  const habitsInSameProject = (habit: Habit) => scheduledHabits.filter((candidate) =>
    (candidate.projectId ?? null) === (habit.projectId ?? null))
  const moveHabit = (habit: Habit, direction: 'up' | 'down') => persistVisibleOrder(
    moveHabitInList(habitsInSameProject(habit), habit.id, direction),
  )
  const finishDrag = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const activeHabit = scheduledHabits.find(({ id }) => id === active.id)
    const overHabit = scheduledHabits.find(({ id }) => id === over.id)
    if (!activeHabit || !overHabit || (activeHabit.projectId ?? null) !== (overHabit.projectId ?? null)) return
    const projectHabits = habitsInSameProject(activeHabit)
    const from = projectHabits.findIndex(({ id }) => id === active.id)
    const to = projectHabits.findIndex(({ id }) => id === over.id)
    if (from >= 0 && to >= 0) persistVisibleOrder(arrayMove(projectHabits, from, to))
  }

  return (
    <section className="page-stack habits-page">
      <header className="habits-workspace-header">
        <span><span className="eyebrow">Habits · {today}</span><h1>Today&apos;s rhythm</h1><p>Small actions, kept visible.</p></span>
        <span className="habits-workspace-header__actions"><Button variant="secondary" type="button" onClick={() => setProjectEditor('new')}><FolderPlus aria-hidden />New project</Button><Button type="button" onClick={openCreate}><Plus aria-hidden />New habit</Button></span>
      </header>
      <div className="habits-toolbar">
        <HabitViewSwitch active="today" />
        <div className="habits-summary"><span className="habits-summary__icon"><Leaf aria-hidden /></span><strong>{completed}<small> / {scheduledHabits.length} complete</small></strong><span className="habits-summary__bar"><i style={{ width: `${scheduledHabits.length ? completed / scheduledHabits.length * 100 : 0}%` }} /></span></div>
      </div>
      {habitsQuery.isPending || logsQuery.isPending || projectsQuery.isPending ? (
        <div className="habits-loading" role="status" aria-label="Loading habits"><span /><span /><span /></div>
      ) : habitsQuery.error || logsQuery.error || projectsQuery.error ? (
        <div className="habits-error" role="alert"><strong>Habits could not be loaded.</strong><p>Your progress was not changed. Check your connection and try again.</p><Button variant="secondary" type="button" onClick={() => void Promise.all([habitsQuery.refetch(), logsQuery.refetch(), projectsQuery.refetch()])}>Try again</Button></div>
      ) : (
        <div className={`habits-layout${editorOpen ? ' habits-layout--editing' : ''}`}>
          <div className="habits-list" aria-live="polite">
            {habits.length === 0 && projects.length === 0 ? (
              <div className="habits-empty"><Leaf aria-hidden /><strong>Your first habit starts here.</strong><p>Choose a small action and a schedule you can actually keep.</p><Button type="button" onClick={openCreate}>Create habit</Button></div>
            ) : scheduledHabits.length === 0 && projects.length === 0 ? (
              <div className="habits-empty"><Leaf aria-hidden /><strong>Nothing scheduled today.</strong><p>Your active habits return on their configured days.</p></div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={finishDrag}>
                <SortableContext items={scheduledHabits.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
                  <div className="habit-project-groups">
                    {projects.map((project) => {
                      const projectHabits = scheduledHabits.filter((habit) => habit.projectId === project.id)
                      return (
                        <section className="habit-project-group" key={project.id}>
                          <VisualBanner assetId={project.bannerAsset} monochrome={project.bannerMonochrome} className={`habit-project-banner habit-project-banner--${project.colorToken}`}>
                            <span className="habit-project-banner__identity"><i><HabitProjectGlyph icon={project.icon} /></i><span><span className="eyebrow">Habit project</span><strong>{project.name}</strong><small>{projectHabits.length} scheduled today</small></span></span>
                            <button type="button" aria-label={`Edit habit project ${project.name}`} onClick={() => setProjectEditor(project)}><Pencil aria-hidden /></button>
                          </VisualBanner>
                          <div className="habit-project-group__list">
                            {projectHabits.length ? projectHabits.map((habit) => {
                              const index = projectHabits.findIndex(({ id }) => id === habit.id)
                              return <HabitTodayCard key={habit.id} habit={habit} log={logsByHabit.get(habit.id)} date={today} pending={progressMutation.isPending && progressMutation.variables?.habitId === habit.id} index={index} habitCount={projectHabits.length} isReordering={reorderMutation.isPending} onMove={moveHabit} onProgress={(input) => progressMutation.mutateAsync(input).then(() => undefined)} onEdit={() => { setEditingHabit(habit); setEditorOpen(true) }} />
                            }) : <p className="habit-project-group__empty">No habits from this project are scheduled today.</p>}
                          </div>
                        </section>
                      )
                    })}
                    {scheduledHabits.some((habit) => !habit.projectId || !projects.some((project) => project.id === habit.projectId)) ? (
                      <section className="habit-project-group habit-project-group--unfiled">
                        {projects.length ? <header><span className="eyebrow">Unfiled habits</span></header> : null}
                        <div className="habit-project-group__list">{(() => {
                          const unfiledHabits = scheduledHabits.filter((habit) => !habit.projectId || !projects.some((project) => project.id === habit.projectId))
                          return unfiledHabits.map((habit, index) => <HabitTodayCard key={habit.id} habit={habit} log={logsByHabit.get(habit.id)} date={today} pending={progressMutation.isPending && progressMutation.variables?.habitId === habit.id} index={index} habitCount={unfiledHabits.length} isReordering={reorderMutation.isPending} onMove={moveHabit} onProgress={(input) => progressMutation.mutateAsync(input).then(() => undefined)} onEdit={() => { setEditingHabit(habit); setEditorOpen(true) }} />)
                        })()}</div>
                      </section>
                    ) : null}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {progressMutation.error || reorderMutation.error ? <p className="habits-mutation-error" role="alert">{(progressMutation.error ?? reorderMutation.error)?.message}</p> : null}
          </div>
          {editorOpen ? <HabitEditor key={editingHabit?.id ?? 'new'} habit={editingHabit} projects={projects} newPosition={Math.max(0, ...habits.map(({ position }) => position)) + 1000} onClose={() => setEditorOpen(false)} onSaved={() => setEditorOpen(false)} /> : null}
          {projectEditor ? <HabitProjectEditor key={projectEditor === 'new' ? 'new-project' : projectEditor.id} project={projectEditor === 'new' ? undefined : projectEditor} projects={projects} onClose={() => setProjectEditor(null)} /> : null}
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
