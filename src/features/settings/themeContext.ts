import { createContext, use } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

export const useTheme = () => {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider.')
  return context
}
