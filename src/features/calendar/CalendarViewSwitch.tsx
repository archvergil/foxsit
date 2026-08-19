import { NavLink } from 'react-router-dom'

import { SegmentedControl } from '@/components/ui/SegmentedControl'

export function CalendarViewSwitch({
  active,
  dayDate,
}: {
  active: 'month' | 'week' | 'day'
  dayDate: string
}) {
  return (
    <SegmentedControl activeIndex={active === 'month' ? 0 : active === 'week' ? 1 : 2} className="calendar-view-switch" label="Calendar view" name="calendar-view" options={3}>
      <NavLink className={active === 'month' ? 'is-active' : ''} to="/calendar" end>Month</NavLink>
      <NavLink className={active === 'week' ? 'is-active' : ''} to="/calendar/week">Week</NavLink>
      <NavLink className={active === 'day' ? 'is-active' : ''} to={`/calendar/day/${dayDate}`}>Day</NavLink>
    </SegmentedControl>
  )
}
