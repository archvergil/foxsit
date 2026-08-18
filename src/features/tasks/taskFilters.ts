import type { Task, TaskFilters } from './types'

const isAtOrBefore = (value: string | null, limit: string) =>
  value !== null && new Date(value).getTime() <= new Date(limit).getTime()

export const taskMatchesFilters = (task: Task, filters: TaskFilters) => {
  if (filters.status !== undefined && task.status !== filters.status) return false
  if (filters.projectId !== undefined && task.projectId !== filters.projectId) return false
  if (filters.scheduledDate !== undefined && task.scheduledDate !== filters.scheduledDate) {
    return false
  }
  if (
    filters.scheduledAfter !== undefined &&
    (task.scheduledDate === null || task.scheduledDate <= filters.scheduledAfter)
  ) {
    return false
  }
  if (
    filters.scheduledBefore !== undefined &&
    (task.scheduledDate === null || task.scheduledDate > filters.scheduledBefore)
  ) {
    return false
  }
  if (filters.dueBefore !== undefined && !isAtOrBefore(task.dueAt, filters.dueBefore)) {
    return false
  }
  return true
}
