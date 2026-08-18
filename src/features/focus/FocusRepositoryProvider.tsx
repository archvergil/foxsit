import type { ReactNode } from 'react'

import { backendEnvironment } from '@/config/backend'
import { LocalApiClient } from '@/lib/localApi'
import { supabase } from '@/lib/supabase'
import { FocusRepositoryContext } from './focusRepositoryContext'
import { createLocalFocusRepository } from './localFocusRepository'
import type { FocusRepository } from './repository'
import { createSupabaseFocusRepository } from './supabaseFocusRepository'

const defaultRepository = backendEnvironment.mode === 'local'
  ? createLocalFocusRepository(new LocalApiClient(backendEnvironment.url))
  : supabase
    ? createSupabaseFocusRepository(supabase)
    : null

export function FocusRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode
  repository?: FocusRepository | null
}) {
  return (
    <FocusRepositoryContext.Provider value={repository}>
      {children}
    </FocusRepositoryContext.Provider>
  )
}
