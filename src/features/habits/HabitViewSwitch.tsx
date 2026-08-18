import { NavLink } from 'react-router-dom'

export function HabitViewSwitch({ active }: { active: 'today' | 'insights' }) {
  return (
    <nav className="segmented-control segmented-control--two habit-view-switch" aria-label="Habit view" data-active-index={active === 'today' ? 0 : 1}>
      <NavLink className={active === 'today' ? 'is-active' : ''} to="/habits" end>Today</NavLink>
      <NavLink className={active === 'insights' ? 'is-active' : ''} to="/habits/insights">Insights</NavLink>
    </nav>
  )
}
