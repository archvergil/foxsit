import type { LocalApiClient } from '@/lib/localApi'
import {
  createChecklistItemSchema,
  createTaskProjectSchema,
  createTaskSchema,
  updateChecklistItemSchema,
  updateTaskProjectSchema,
  updateTaskSchema,
} from './schemas'
import type { TasksRepository } from './repository'
import type { TaskFilters, TaskStatus } from './types'

const taskParams = (filters: TaskFilters) => {
  const params = new URLSearchParams()
  if (filters.status !== undefined) params.set('status', filters.status)
  if (filters.projectId !== undefined) {
    params.set('projectId', filters.projectId === null ? 'null' : filters.projectId)
  }
  if (filters.scheduledDate !== undefined) params.set('scheduledDate', filters.scheduledDate)
  if (filters.scheduledAfter !== undefined) params.set('scheduledAfter', filters.scheduledAfter)
  if (filters.scheduledBefore !== undefined) params.set('scheduledBefore', filters.scheduledBefore)
  if (filters.dueBefore !== undefined) params.set('dueBefore', filters.dueBefore)
  const query = params.toString()
  return query ? `/v1/tasks?${query}` : '/v1/tasks'
}

export const createLocalTasksRepository = (client: LocalApiClient): TasksRepository => ({
  listProjects: (_userId, includeArchived = false) =>
    client.get(`/v1/projects?includeArchived=${includeArchived}`),
  createProject: (_userId, input) =>
    client.post('/v1/projects', createTaskProjectSchema.parse(input)),
  updateProject: (_userId, projectId, input) =>
    client.patch(`/v1/projects/${projectId}`, updateTaskProjectSchema.parse(input)),
  deleteProject: (_userId, projectId) => client.delete(`/v1/projects/${projectId}`),
  listTasks: (_userId, filters = {}) => client.get(taskParams(filters)),
  createTask: (_userId, input) => client.post('/v1/tasks', createTaskSchema.parse(input)),
  updateTask: (_userId, taskId, input) =>
    client.patch(`/v1/tasks/${taskId}`, updateTaskSchema.parse(input)),
  setTaskStatus: (_userId, taskId, status: TaskStatus) =>
    client.patch(`/v1/tasks/${taskId}/status`, { status }),
  convertTaskToCalendarEvent: (_userId, taskId, startTime) =>
    client.post(`/v1/tasks/${taskId}/calendar-event`, { startTime }),
  deleteTask: (_userId, taskId) => client.delete(`/v1/tasks/${taskId}`),
  reorderTasks: (_userId, orderedTaskIds) =>
    client.patch('/v1/tasks/reorder', { orderedTaskIds }),
  listChecklistItems: (_userId, taskId) => client.get(`/v1/tasks/${taskId}/checklist`),
  createChecklistItem: (_userId, input) =>
    client.post('/v1/checklist', createChecklistItemSchema.parse(input)),
  updateChecklistItem: (_userId, itemId, input) =>
    client.patch(`/v1/checklist/${itemId}`, updateChecklistItemSchema.parse(input)),
  deleteChecklistItem: (_userId, itemId) => client.delete(`/v1/checklist/${itemId}`),
})
