export type TaskColorToken = 'mint' | 'coral' | 'blue' | 'sand' | 'slate'
export type TaskPriority = 'none' | 'low' | 'medium' | 'high'
export type TaskStatus = 'open' | 'completed' | 'archived'

export interface TaskProject {
  id: string
  userId: string
  name: string
  colorToken: TaskColorToken
  icon: string | null
  parentProjectId?: string | null | undefined
  bannerAsset?: string | null | undefined
  bannerMonochrome?: boolean | undefined
  position: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  userId: string
  projectId: string | null
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  scheduledDate: string | null
  dueAt: string | null
  estimateMinutes: number | null
  position: number
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskChecklistItem {
  id: string
  userId: string
  taskId: string
  title: string
  completed: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateTaskProjectInput {
  name: string
  colorToken: TaskColorToken
  icon?: string | null
  parentProjectId?: string | null
  bannerAsset?: string | null
  bannerMonochrome?: boolean
  position?: number
}

export interface UpdateTaskProjectInput {
  name?: string
  colorToken?: TaskColorToken
  icon?: string | null
  parentProjectId?: string | null
  bannerAsset?: string | null
  bannerMonochrome?: boolean
  position?: number
  archivedAt?: string | null
}

export interface CreateTaskInput {
  title: string
  projectId?: string | null
  notes?: string | null
  priority?: TaskPriority
  scheduledDate?: string | null
  dueAt?: string | null
  estimateMinutes?: number | null
  position?: number
}

export interface UpdateTaskInput {
  title?: string
  projectId?: string | null
  notes?: string | null
  priority?: TaskPriority
  scheduledDate?: string | null
  dueAt?: string | null
  estimateMinutes?: number | null
  position?: number
}

export interface TaskFilters {
  status?: TaskStatus
  projectId?: string | null
  projectIds?: string[]
  scheduledDate?: string
  scheduledAfter?: string
  scheduledBefore?: string
  dueBefore?: string
}

export interface CreateChecklistItemInput {
  taskId: string
  title: string
  position?: number
}

export interface UpdateChecklistItemInput {
  title?: string
  completed?: boolean
  position?: number
}
