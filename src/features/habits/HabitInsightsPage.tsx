import { ArchiveRestore, CalendarRange, Flame, History, Trash2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { addLocalDays, formatLocalDateLabel, localDateKey } from '@/lib/dates'
import { HabitHeatmap } from './HabitHeatmap'
import { HabitViewSwitch } from './HabitViewSwitch'
import {
  buildHabitHistoryDays,
  calculateHabitInsightSummary,
  startOfHabitWeek,
  type HabitHistoryDay,
} from './habitRules'
import { useClearHabitHistory, useDeleteHabit, useHabitDateContext, useHabitLogs, useHabits, useUpdateHabit } from './queries'
import { habitToInput } from './schemas'
import type { Habit } from './types'

const percentage = (rate: number) => `${Math.round(rate * 100)}%`

const metricDetail = (metric: { completed: number; scheduled: number }) => metric.scheduled
  ? `${metric.completed} of ${metric.scheduled} scheduled days`
  : 'No scheduled days'

const historyStatus: Record<HabitHistoryDay['state'], string> = {
  unscheduled: 'Not scheduled',
  missed: 'Missed',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
}

function HabitMetric({ icon: Icon, label, value, detail }: {
  icon: typeof Flame
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="habit-insight-metric">
      <Icon aria-hidden />
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

const activeEndFor = (habit: Habit, today: string, timeZone: string) => habit.archivedAt
  ? localDateKey(new Date(habit.archivedAt), timeZone)
  : today

export function HabitInsightsPage() {
  const { timeZone, weekStartsOn } = useHabitDateContext()
  const today = localDateKey(new Date(), timeZone)
  const habitsQuery = useHabits(true)
  const habits = habitsQuery.data ?? []
  const [selectedId, setSelectedId] = useState<string>()
  const rangeStart = habits.reduce((earliest, habit) => {
    const createdOn = localDateKey(new Date(habit.createdAt), timeZone)
    return createdOn < earliest ? createdOn : earliest
  }, today)
  const logsQuery = useHabitLogs(
    { dateStart: rangeStart, dateEnd: today },
    habitsQuery.isSuccess && habits.length > 0,
  )
  const updateHabit = useUpdateHabit()
  const deleteHabit = useDeleteHabit()
  const clearHistory = useClearHabitHistory()
  const selected = habits.find((habit) => habit.id === selectedId) ?? habits[0]
  const selectedLogs = useMemo(
    () => selected ? (logsQuery.data ?? []).filter((log) => log.habitId === selected.id) : [],
    [logsQuery.data, selected],
  )

  const insight = useMemo(() => {
    if (!selected) return null
    const createdOn = localDateKey(new Date(selected.createdAt), timeZone)
    const archivedOn = selected.archivedAt ? localDateKey(new Date(selected.archivedAt), timeZone) : null
    const heatmapStart = startOfHabitWeek(addLocalDays(today, -83), weekStartsOn)
    const activeEnd = activeEndFor(selected, today, timeZone)
    return {
      createdOn,
      archivedOn,
      summary: calculateHabitInsightSummary(selected, selectedLogs, {
        today, createdOn, archivedOn, weekStartsOn,
      }),
      days: buildHabitHistoryDays(
        selected, selectedLogs, heatmapStart, today, createdOn, activeEnd,
      ),
    }
  }, [selected, selectedLogs, timeZone, today, weekStartsOn])

  const restore = async () => {
    if (!selected) return
    try {
      await updateHabit.mutateAsync({ habitId: selected.id, input: habitToInput(selected, true) })
    } catch {
      // Durable error remains visible below the actions.
    }
  }

  const remove = async () => {
    if (!selected) return
    await deleteHabit.mutateAsync(selected.id)
    setSelectedId(undefined)
  }

  const clear = async () => {
    if (!selected) return
    await clearHistory.mutateAsync(selected.id)
  }

  const recentHistory = insight?.days
    .filter((day) => day.scheduled || day.state !== 'unscheduled')
    .slice(-10)
    .reverse() ?? []
  const pending = updateHabit.isPending || deleteHabit.isPending || clearHistory.isPending
  const writeError = updateHabit.error ?? deleteHabit.error ?? clearHistory.error

  return (
    <section className="page-stack habits-page habit-insights-page">
      <PageHeader
        eyebrow="Habits · Insights"
        title="Read the pattern, not a guess."
        description={`Rates use scheduled local days in ${timeZone}; skipped days break streaks.`}
      />
      <HabitViewSwitch active="insights" />
      {habitsQuery.isPending || (habits.length > 0 && logsQuery.isPending) ? (
        <div className="habits-loading" role="status" aria-label="Loading habit insights"><span /><span /><span /></div>
      ) : habitsQuery.error || logsQuery.error ? (
        <div className="habits-error" role="alert">
          <strong>Habit insights could not be loaded.</strong>
          <p>No metric is estimated while history is unavailable.</p>
          <Button variant="secondary" type="button" onClick={() => void Promise.all([habitsQuery.refetch(), logsQuery.refetch()])}>Try again</Button>
        </div>
      ) : !selected || !insight ? (
        <div className="habits-empty">
          <History aria-hidden />
          <strong>History starts with a habit.</strong>
          <p>Create a habit and record real progress before insights appear.</p>
          <Link className="button button--primary" to="/habits"><span>Go to Today</span></Link>
        </div>
      ) : (
        <>
          <section className="habit-insight-selector" aria-label="Choose a habit">
            {habits.map((habit) => (
              <button
                key={habit.id}
                type="button"
                className={habit.id === selected.id ? 'habit-insight-selector__active' : ''}
                onClick={() => setSelectedId(habit.id)}
              >
                <span>{habit.title}</span>
                {!habit.isActive ? <small>Archived</small> : null}
              </button>
            ))}
          </section>

          <div className="habit-insight-metrics">
            <HabitMetric icon={Flame} label="Current streak" value={`${insight.summary.streaks.current}`} detail={selected.isActive ? 'scheduled completions' : 'archived'} />
            <HabitMetric icon={TrendingUp} label="Longest streak" value={`${insight.summary.streaks.longest}`} detail="scheduled completions" />
            <HabitMetric icon={CalendarRange} label="This week" value={percentage(insight.summary.week.rate)} detail={metricDetail(insight.summary.week)} />
            <HabitMetric icon={History} label="This month" value={percentage(insight.summary.month.rate)} detail={metricDetail(insight.summary.month)} />
          </div>

          <p className="habit-insight-fact">
            {insight.summary.month.scheduled
              ? `${selected.title}: ${insight.summary.month.completed} of ${insight.summary.month.scheduled} scheduled days completed this month.`
              : `${selected.title} has no scheduled days in the current month window.`}
            {insight.archivedOn ? ` Archived ${formatLocalDateLabel(insight.archivedOn)}; later days are excluded.` : ''}
          </p>

          <div className="habit-insight-layout">
            <HabitHeatmap days={insight.days} unit={selected.unit ?? (selected.targetCount === 1 ? 'time' : 'times')} />
            <section className="habit-history-card" aria-labelledby="habit-history-title">
              <header><span><span className="eyebrow">Daily history</span><h2 id="habit-history-title">Latest scheduled days</h2></span></header>
              {recentHistory.length ? (
                <ol>
                  {recentHistory.map((day) => (
                    <li key={day.date} className={`habit-history-card__day habit-history-card__day--${day.state}`}>
                      <time dateTime={day.date}>{formatLocalDateLabel(day.date)}</time>
                      <span><strong>{historyStatus[day.state]}</strong>{day.note ? <small>{day.note}</small> : null}</span>
                      <small>{day.state === 'in_progress' || day.state === 'completed' ? `${day.count}/${selected.targetCount}` : '—'}</small>
                    </li>
                  ))}
                </ol>
              ) : <p>No scheduled history in this range.</p>}
            </section>
          </div>

          {!selected.isActive ? (
            <section className="habit-archive-actions" aria-label={`Archived habit ${selected.title}`}>
              <span><strong>{selected.title} is archived.</strong><small>Its history stays available and no later day affects its rates.</small></span>
              <span>
                <Button variant="secondary" type="button" disabled={pending} onClick={() => void restore()}><ArchiveRestore aria-hidden />Restore</Button>
                <ConfirmDialog actionLabel="Delete habit" description="Delete the habit and all its records, or clear only its completion history and keep the habit." onConfirm={remove} pending={deleteHabit.isPending} secondaryAction={{ label: 'Clear history only', onAction: clear, pending: clearHistory.isPending }} title={`Delete “${selected.title}”?`} trigger={<Button variant="quiet" type="button" disabled={pending}><Trash2 aria-hidden />Delete</Button>} />
              </span>
            </section>
          ) : null}
          {writeError ? <p className="habits-mutation-error" role="alert">{writeError.message}</p> : null}
        </>
      )}
    </section>
  )
}
