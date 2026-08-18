import { ArrowRight, CalendarDays, Dumbbell, Leaf, TimerReset } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { TodayTasksCard } from '@/features/tasks/TodayTasksCard'
import { useTaskDateContext } from '@/features/tasks/queries'
import { formatDayHeading } from '@/lib/dates'

const modules = [
  { title: 'Calendar', detail: 'See time at a glance', to: '/calendar', icon: CalendarDays, tone: 'blue' },
  { title: 'Habits', detail: 'Keep the rhythm visible', to: '/habits', icon: Leaf, tone: 'sand' },
  { title: 'Focus', detail: 'Start with intention', to: '/focus', icon: TimerReset, tone: 'coral' },
] as const

export default function TodayPage() {
  const { timeZone } = useTaskDateContext()

  return (
    <section className="page-stack today-page">
      <PageHeader
        eyebrow={formatDayHeading(new Date(), timeZone)}
        title="Your day, in one calm view."
        description="Start with the work you chose for today, then move through the rest of your day."
      />

      <div className="today-grid">
        <article className="today-hero-card">
          <div>
            <span className="eyebrow">Daily workspace</span>
            <h2>Start with what matters now.</h2>
            <p>Your Tasks area is live. The remaining modules will join this view as their real data contracts land.</p>
          </div>
          <div className="today-hero-card__orbit" aria-hidden>
            <span>01</span><span>Now</span>
          </div>
        </article>

        <TodayTasksCard />

        <div className="today-module-grid">
          {modules.map(({ title, detail, to, icon: Icon, tone }) => (
            <Link className={`today-module-card today-module-card--${tone}`} to={to} key={title}>
              <Icon aria-hidden />
              <div><strong>{title}</strong><span>{detail}</span></div>
              <ArrowRight aria-hidden />
            </Link>
          ))}
        </div>

        <Link className="workout-strip" to="/workout">
          <span className="workout-strip__icon"><Dumbbell aria-hidden /></span>
          <span><strong>Workout</strong><span>Routines, active sessions and progress</span></span>
          <ArrowRight aria-hidden />
        </Link>
      </div>
    </section>
  )
}
