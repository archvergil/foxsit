import { NavLink } from 'react-router-dom'

export function CalendarViewSwitch({
  active,
  dayDate,
}: {
  active: 'month' | 'week' | 'day'
  dayDate: string
}) {
  return (
    <nav className="segmented-control calendar-view-switch" aria-label="Calendar view">
      <NavLink className={active === 'month' ? 'is-active' : ''} to="/calendar" end>Month</NavLink>
      <NavLink className={active === 'week' ? 'is-active' : ''} to="/calendar/week">Week</NavLink>
      <NavLink className={active === 'day' ? 'is-active' : ''} to={`/calendar/day/${dayDate}`}>Day</NavLink>
    </nav>
  )
}
