import { createContext, use } from 'react'

import type { CalendarRepository } from './repository'

export const CalendarRepositoryContext = createContext<CalendarRepository | null>(null)

export const useCalendarRepository = () => {
  const repository = use(CalendarRepositoryContext)
  if (!repository) throw new Error('The Calendar repository requires a configured backend.')
  return repository
}
