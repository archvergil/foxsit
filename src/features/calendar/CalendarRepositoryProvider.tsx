import type { ReactNode } from 'react'

import { backendEnvironment } from '@/config/backend'
import { LocalApiClient } from '@/lib/localApi'
import { supabase } from '@/lib/supabase'
import { CalendarRepositoryContext } from './calendarRepositoryContext'
import { createLocalCalendarRepository } from './localCalendarRepository'
import type { CalendarRepository } from './repository'
import { createSupabaseCalendarRepository } from './supabaseCalendarRepository'

const defaultRepository = backendEnvironment.mode === 'local'
  ? createLocalCalendarRepository(new LocalApiClient(backendEnvironment.url))
  : supabase
    ? createSupabaseCalendarRepository(supabase)
    : null

export function CalendarRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode
  repository?: CalendarRepository | null
}) {
  return <CalendarRepositoryContext.Provider value={repository}>{children}</CalendarRepositoryContext.Provider>
}
