import { NavLink } from 'react-router-dom'

import type { NavigationItem } from './navigation'

export function NavItem({ item, compact = false }: { item: NavigationItem; compact?: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      to={item.to}
      aria-label={compact ? item.label : undefined}
      {...(item.end === undefined ? {} : { end: item.end })}
    >
      <Icon aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  )
}
