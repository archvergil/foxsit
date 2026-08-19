import { useLocation } from 'react-router-dom'

import { NavItem } from './NavItem'
import { mobileNavigation } from './navigation'

export function MobileNavigation() {
  const { pathname } = useLocation()
  const directIndex = mobileNavigation.findIndex((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
  const activeIndex = directIndex
  return (
    <nav className="mobile-nav" aria-label="Main navigation" {...(activeIndex >= 0 ? { 'data-active-index': activeIndex } : {})}>
      {mobileNavigation.map((item, index) => <NavItem key={item.to} item={item} compact activeOverride={index === activeIndex} />)}
    </nav>
  )
}
