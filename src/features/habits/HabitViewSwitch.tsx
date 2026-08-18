import { NavLink } from 'react-router-dom'

export function HabitViewSwitch({ active }: { active: 'today' | 'insights' }) {
  return (
    <nav className="habit-view-switch" aria-label="Habit view">
      <NavLink className={active === 'today' ? 'habit-view-switch__active' : ''} to="/habits" end>Today</NavLink>
      <NavLink className={active === 'insights' ? 'habit-view-switch__active' : ''} to="/habits/insights">Insights</NavLink>
    </nav>
  )
}
