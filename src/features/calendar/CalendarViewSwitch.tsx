import { NavLink } from 'react-router-dom'

export function CalendarViewSwitch({
  active,
  dayDate,
}: {
  active: 'month' | 'week' | 'day'
  dayDate: string
}) {
  return (
    <nav className="segmented-control segmented-control--three calendar-view-switch" aria-label="Calendar view" data-active-index={active === 'month' ? 0 : active === 'week' ? 1 : 2}>
      <NavLink className={active === 'month' ? 'is-active' : ''} to="/calendar" end>Month</NavLink>
      <NavLink className={active === 'week' ? 'is-active' : ''} to="/calendar/week">Week</NavLink>
      <NavLink className={active === 'day' ? 'is-active' : ''} to={`/calendar/day/${dayDate}`}>Day</NavLink>
    </nav>
  )
}
