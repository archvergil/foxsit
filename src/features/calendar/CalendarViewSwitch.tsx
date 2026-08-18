import { NavLink } from 'react-router-dom'

export function CalendarViewSwitch({
  active,
  dayDate,
}: {
  active: 'month' | 'week' | 'day'
  dayDate: string
}) {
  return (
    <nav className="calendar-view-switch" aria-label="Calendar view">
      <NavLink className={active === 'month' ? 'calendar-view-switch__active' : ''} to="/calendar" end>Month</NavLink>
      <NavLink className={active === 'week' ? 'calendar-view-switch__active' : ''} to="/calendar/week">Week</NavLink>
      <NavLink className={active === 'day' ? 'calendar-view-switch__active' : ''} to={`/calendar/day/${dayDate}`}>Day</NavLink>
    </nav>
  )
}
