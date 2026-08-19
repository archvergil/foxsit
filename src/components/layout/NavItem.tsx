import { NavLink } from 'react-router-dom'

import { preloadRoute } from '@/app/routeModules'
import type { NavigationItem } from './navigation'

export function NavItem({ item, compact = false, activeOverride = false }: { item: NavigationItem; compact?: boolean; activeOverride?: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      className={({ isActive }) => `nav-item${isActive || activeOverride ? ' nav-item--active' : ''}`}
      to={item.to}
      aria-label={compact ? item.label : undefined}
      onFocus={() => preloadRoute(item.to)}
      onPointerEnter={() => preloadRoute(item.to)}
      onPointerDown={() => preloadRoute(item.to)}
      {...(item.end === undefined ? {} : { end: item.end })}
    >
      <Icon aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  )
}
