import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  ThemeContext,
  isThemePreference,
  type ThemePreference,
  type ThemeContextValue,
} from './themeContext'

const THEME_STORAGE_KEY = 'app-theme'

const getInitialPreference = (): ThemePreference => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

const systemPrefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.themePreference = preference
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  }, [preference, resolvedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: setPreferenceState,
    }),
    [preference, resolvedTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
