import type {
  CreateChecklistItemInput,
  CreateTaskInput,
  CreateTaskProjectInput,
  Task,
  TaskChecklistItem,
  TaskFilters,
  TaskProject,
  TaskStatus,
  UpdateChecklistItemInput,
  UpdateTaskInput,
  UpdateTaskProjectInput,
} from './types'

export interface TasksRepository {
  listProjects(userId: string, includeArchived?: boolean): Promise<TaskProject[]>
  createProject(userId: string, input: CreateTaskProjectInput): Promise<TaskProject>
  updateProject(userId: string, projectId: string, input: UpdateTaskProjectInput): Promise<TaskProject>
  deleteProject(userId: string, projectId: string): Promise<void>
  listTasks(userId: string, filters?: TaskFilters): Promise<Task[]>
  createTask(userId: string, input: CreateTaskInput): Promise<Task>
  updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task>
  setTaskStatus(userId: string, taskId: string, status: TaskStatus, now?: Date): Promise<Task>
  convertTaskToCalendarEvent(userId: string, taskId: string, startTime: string): Promise<string>
  deleteTask(userId: string, taskId: string): Promise<void>
  reorderTasks(userId: string, orderedTaskIds: string[]): Promise<Task[]>
  listChecklistItems(userId: string, taskId: string): Promise<TaskChecklistItem[]>
  createChecklistItem(userId: string, input: CreateChecklistItemInput): Promise<TaskChecklistItem>
  updateChecklistItem(
    userId: string,
    itemId: string,
    input: UpdateChecklistItemInput,
  ): Promise<TaskChecklistItem>
  deleteChecklistItem(userId: string, itemId: string): Promise<void>
}

export const taskQueryKeys = {
  all: ['tasks'] as const,
  projects: (userId: string) => ['tasks', 'projects', userId] as const,
  lists: (userId: string) => ['tasks', 'list', userId] as const,
  list: (userId: string, filters: TaskFilters) =>
    ['tasks', 'list', userId, filters] as const,
  checklist: (userId: string, taskId: string) =>
    ['tasks', 'checklist', userId, taskId] as const,
}
