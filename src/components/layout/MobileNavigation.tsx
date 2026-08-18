import { NavItem } from './NavItem'
import { mobileNavigation } from './navigation'

export function MobileNavigation() {
  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      {mobileNavigation.map((item) => <NavItem key={item.to} item={item} compact />)}
    </nav>
  )
}
