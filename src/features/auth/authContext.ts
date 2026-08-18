import { createContext, use } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'configuration-missing'

export interface AuthContextValue {
  session: Session | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const context = use(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
