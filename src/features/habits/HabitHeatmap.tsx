import { formatLocalDateLabel } from '@/lib/dates'
import type { HabitHistoryDay } from './habitRules'

const statusLabel: Record<HabitHistoryDay['state'], string> = {
  unscheduled: 'Not scheduled',
  missed: 'Missed',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
}

const dayTitle = (day: HabitHistoryDay, unit: string) => {
  const progress = day.state === 'in_progress' || day.state === 'completed'
    ? ` · ${day.count} ${unit}`
    : ''
  const reason = day.note ? ` · ${day.note}` : ''
  return `${formatLocalDateLabel(day.date)} · ${statusLabel[day.state]}${progress}${reason}`
}

export function HabitHeatmap({ days, unit }: { days: HabitHistoryDay[]; unit: string }) {
  const totals = days.reduce((result, day) => {
    if (day.state === 'completed') result.completed += 1
    if (day.state === 'skipped') result.skipped += 1
    if (day.state === 'missed') result.missed += 1
    return result
  }, { completed: 0, skipped: 0, missed: 0 })

  return (
    <section className="habit-heatmap-card" aria-labelledby="habit-heatmap-title">
      <header>
        <span><span className="eyebrow">Consistency</span><h2 id="habit-heatmap-title">Recent rhythm</h2></span>
        <small>12 weeks</small>
      </header>
      <div
        className="habit-heatmap"
        role="img"
        aria-label={`${totals.completed} completed, ${totals.skipped} skipped and ${totals.missed} missed scheduled days.`}
      >
        {days.map((day) => (
          <span
            key={day.date}
            className={`habit-heatmap__day habit-heatmap__day--${day.state}`}
            data-progress={day.progress >= 1 ? 'full' : day.progress > 0 ? 'partial' : 'none'}
            title={dayTitle(day, unit)}
            aria-hidden="true"
          />
        ))}
      </div>
      <footer className="habit-heatmap__legend" aria-hidden="true">
        <span><i className="habit-heatmap__day--completed" />Complete</span>
        <span><i className="habit-heatmap__day--in_progress" />Partial</span>
        <span><i className="habit-heatmap__day--skipped" />Skipped</span>
        <span><i className="habit-heatmap__day--missed" />Missed</span>
      </footer>
    </section>
  )
}
