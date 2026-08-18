import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { backendEnvironment } from '@/config/backend'
import { logger } from '@/lib/logger'
import { LocalApiClient } from '@/lib/localApi'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const configurationError = () =>
  backendEnvironment.mode === 'unconfigured'
    ? backendEnvironment.reason
    : 'The configured backend is unavailable.'

const localAuth = backendEnvironment.mode === 'local'
  ? new LocalApiClient(backendEnvironment.url)
  : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    supabase || localAuth ? 'loading' : 'configuration-missing',
  )

  useEffect(() => {
    if (localAuth) {
      let mounted = true
      void localAuth.getSession()
        .then((restoredSession) => {
          if (!mounted) return
          setSession(restoredSession)
          setStatus(restoredSession ? 'authenticated' : 'anonymous')
        })
        .catch(() => {
          if (!mounted) return
          logger.warn('Could not reach the local authentication server.')
          setStatus('anonymous')
        })
      return () => { mounted = false }
    }

    if (!supabase) return undefined

    let mounted = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        logger.warn('Could not restore the authentication session.')
      }
      setSession(data.session)
      setStatus(data.session ? 'authenticated' : 'anonymous')
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'anonymous')
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      signIn: async (email, password) => {
        if (localAuth) {
          const nextSession = await localAuth.signIn(email, password)
          setSession(nextSession)
          setStatus('authenticated')
          return
        }
        if (!supabase) throw new Error(configurationError())
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signUp: async (email, password, displayName) => {
        if (localAuth) {
          const nextSession = await localAuth.signUp(
            email,
            password,
            displayName,
            browserTimezone(),
          )
          setSession(nextSession)
          setStatus('authenticated')
          return true
        }
        if (!supabase) throw new Error(configurationError())
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, timezone: browserTimezone() },
            emailRedirectTo: `${window.location.origin}/today`,
          },
        })
        if (error) throw error
        return Boolean(data.session)
      },
      signOut: async () => {
        if (localAuth) {
          await localAuth.signOut()
          setSession(null)
          setStatus('anonymous')
          return
        }
        if (!supabase) return
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
      requestPasswordReset: async (email) => {
        if (localAuth) return localAuth.requestPasswordReset()
        if (!supabase) throw new Error(configurationError())
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      },
      updatePassword: async (password) => {
        if (localAuth) return localAuth.updatePassword(password)
        if (!supabase) throw new Error(configurationError())
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      },
    }),
    [session, status],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
