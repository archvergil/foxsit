import { LogOut, Settings2 } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { OnlineStatus } from '@/components/feedback/OnlineStatus'
import { BrandMark } from '@/components/ui/BrandMark'
import { APP_NAME } from '@/config/product'
import { backendEnvironment } from '@/config/backend'
import { useAuth } from '@/features/auth/authContext'
import { ActiveFocusPlayer } from '@/features/focus/ActiveFocusPlayer'
import { useProfile } from '@/features/settings/profileQueries'
import { MobileNavigation } from './MobileNavigation'
import { NavItem } from './NavItem'
import { primaryNavigation, utilityNavigation } from './navigation'

const userLabel = (email: string | undefined, displayName: unknown) =>
  typeof displayName === 'string' && displayName.trim() ? displayName : email ?? 'Account'

export function AppShell() {
  const { session, signOut } = useAuth()
  const profile = useProfile(session?.user.id ?? '')
  const label = userLabel(session?.user.email, profile.data?.display_name ?? session?.user.user_metadata.display_name)
  const initial = label.charAt(0).toUpperCase()
  const avatarUrl = profile.data?.avatar_url

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <div className="sidebar__brand brand-lockup">
          <span className="brand-lockup__mark">
            <BrandMark decorative />
          </span>
          <span>{APP_NAME}</span>
        </div>
        <nav className="sidebar__nav" aria-label="Main navigation">
          {primaryNavigation.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>
        <nav className="sidebar__utility" aria-label="Account navigation">
          {utilityNavigation.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>
        <div className="account-chip">
          <span className="account-chip__avatar" aria-hidden>{avatarUrl ? <img src={avatarUrl} alt="" /> : initial}</span>
          <span className="account-chip__identity">
            <strong>{label}</strong>
            <span>{backendEnvironment.mode === 'local' ? 'Local data' : 'Personal'}</span>
          </span>
          <button type="button" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut aria-hidden />
          </button>
        </div>
      </aside>

      <div className="app-shell__body">
        <header className="mobile-header">
          <div className="brand-lockup">
            <span className="brand-lockup__mark">
              <BrandMark decorative />
            </span>
            <span>{APP_NAME}</span>
          </div>
          <span className="mobile-header__account">
            <span className="mobile-header__avatar" aria-label={`Signed in as ${label}`}>{avatarUrl ? <img src={avatarUrl} alt="" /> : initial}</span>
            <Link className="mobile-header__settings" to="/settings" aria-label="Open settings"><Settings2 aria-hidden /></Link>
          </span>
        </header>
        <OnlineStatus />
        <main id="main-content" className="app-content" tabIndex={-1}>
          <Outlet />
        </main>
        <ActiveFocusPlayer />
        <MobileNavigation />
      </div>
    </div>
  )
}
