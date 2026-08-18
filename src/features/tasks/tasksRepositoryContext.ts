import { createContext, use } from 'react'

import type { TasksRepository } from './repository'

export const TasksRepositoryContext = createContext<TasksRepository | null>(null)

export const useTasksRepository = () => {
  const repository = use(TasksRepositoryContext)
  if (!repository) {
    throw new Error('The Tasks repository requires a configured Supabase client.')
  }
  return repository
}
