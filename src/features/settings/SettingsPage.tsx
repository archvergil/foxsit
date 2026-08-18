import { Database, Dumbbell, Gift, LogOut, Monitor, Moon, Sun, TimerReset } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { useTheme, type ThemePreference } from './themeContext'

const themeOptions: Array<{
  value: ThemePreference
  label: string
  description: string
  icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', description: 'Warm paper surfaces', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Deep charcoal surfaces', icon: Moon },
  { value: 'system', label: 'System', description: 'Follow this device', icon: Monitor },
]

export default function SettingsPage() {
  const { pathname } = useLocation()
  const { preference, setPreference } = useTheme()
  const { session, signOut } = useAuth()
  const page = pathname.endsWith('/appearance') ? 'Appearance' : pathname.endsWith('/data') ? 'Data' : 'Settings'

  return (
    <section className="page-stack settings-page">
      <PageHeader
        eyebrow="Personal workspace"
        title={page}
        description="Local preferences apply immediately. Account preferences will sync through your profile."
      />

      <div className="settings-layout">
        <nav className="settings-shortcuts" aria-label="More destinations">
          <Link to="/focus"><TimerReset aria-hidden /><span><strong>Focus</strong><small>Pomodoro and history</small></span></Link>
          <Link to="/workout"><Dumbbell aria-hidden /><span><strong>Workout</strong><small>Routines and sessions</small></span></Link>
          <Link to="/rewards"><Gift aria-hidden /><span><strong>Rewards</strong><small>Coins, credits and history</small></span></Link>
          <Link to="/settings/data"><Database aria-hidden /><span><strong>Data</strong><small>Export and account controls</small></span></Link>
        </nav>

        <article className="settings-card">
          <div>
            <span className="eyebrow">Appearance</span>
            <h2>Choose your surface</h2>
            <p>The preference is stored locally now and is ready to sync to the profile row.</p>
          </div>
          <fieldset className="theme-options">
            <legend className="visually-hidden">Theme</legend>
            {themeOptions.map(({ value, label, description, icon: Icon }) => (
              <label className="theme-option" key={value}>
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={preference === value}
                  onChange={() => setPreference(value)}
                />
                <span className="theme-option__icon"><Icon aria-hidden /></span>
                <span><strong>{label}</strong><small>{description}</small></span>
              </label>
            ))}
          </fieldset>
        </article>

        <article className="settings-card settings-card--account">
          <div>
            <span className="eyebrow">Account</span>
            <h2>{session?.user.email}</h2>
            <p>Your session is stored securely by Supabase and can be ended on this device.</p>
          </div>
          <Button variant="secondary" onClick={() => void signOut()}>
            <LogOut aria-hidden /> Sign out
          </Button>
        </article>
      </div>
    </section>
  )
}
