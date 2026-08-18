import type { ReactNode } from 'react'

import { supabase } from '@/lib/supabase'
import { backendEnvironment } from '@/config/backend'
import { LocalApiClient } from '@/lib/localApi'
import { createLocalTasksRepository } from './localTasksRepository'
import type { TasksRepository } from './repository'
import { createSupabaseTasksRepository } from './supabaseTasksRepository'
import { TasksRepositoryContext } from './tasksRepositoryContext'

const defaultRepository = backendEnvironment.mode === 'local'
  ? createLocalTasksRepository(new LocalApiClient(backendEnvironment.url))
  : supabase
    ? createSupabaseTasksRepository(supabase)
    : null

export function TasksRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode
  repository?: TasksRepository | null
}) {
  return (
    <TasksRepositoryContext.Provider value={repository}>
      {children}
    </TasksRepositoryContext.Provider>
  )
}
