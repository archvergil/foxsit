import { NavLink } from 'react-router-dom'

export function HabitViewSwitch({ active }: { active: 'today' | 'insights' }) {
  return (
    <nav className="segmented-control habit-view-switch" aria-label="Habit view">
      <NavLink className={active === 'today' ? 'is-active' : ''} to="/habits" end>Today</NavLink>
      <NavLink className={active === 'insights' ? 'is-active' : ''} to="/habits/insights">Insights</NavLink>
    </nav>
  )
}
