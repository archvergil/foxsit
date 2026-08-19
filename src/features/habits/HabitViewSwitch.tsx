import { NavLink } from 'react-router-dom'

import { SegmentedControl } from '@/components/ui/SegmentedControl'

export function HabitViewSwitch({ active }: { active: 'today' | 'insights' }) {
  return (
    <SegmentedControl activeIndex={active === 'today' ? 0 : 1} className="habit-view-switch" label="Habit view" name="habit-view" options={2}>
      <NavLink className={active === 'today' ? 'is-active' : ''} to="/habits" end>Today</NavLink>
      <NavLink className={active === 'insights' ? 'is-active' : ''} to="/habits/insights">Insights</NavLink>
    </SegmentedControl>
  )
}
