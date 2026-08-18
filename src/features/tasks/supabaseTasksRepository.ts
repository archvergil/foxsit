import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import {
  createChecklistItemSchema,
  createTaskProjectSchema,
  createTaskSchema,
  taskColorTokenSchema,
  taskPrioritySchema,
  taskStatusSchema,
  updateChecklistItemSchema,
  updateTaskProjectSchema,
  updateTaskSchema,
} from './schemas'
import { transitionTaskStatus } from './taskStatus'
import type { TasksRepository } from './repository'
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

type ProjectRow = Database['public']['Tables']['task_projects']['Row']
type ProjectUpdate = Database['public']['Tables']['task_projects']['Update']
type TaskRow = Database['public']['Tables']['tasks']['Row']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']
type ChecklistRow = Database['public']['Tables']['task_checklist_items']['Row']
type ChecklistUpdate = Database['public']['Tables']['task_checklist_items']['Update']

export class TasksRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TasksRepositoryError'
  }
}

const assertData = <T>(data: T | null, error: unknown, action: string): T => {
  if (error) {
    throw new TasksRepositoryError(`Could not ${action}.`, { cause: error })
  }
  if (data === null) {
    throw new TasksRepositoryError(`Could not ${action}: the record was not found.`)
  }
  return data
}

const assertWrite = (data: { id: string } | null, error: unknown, action: string) => {
  assertData(data, error, action)
}

const mapProject = (row: ProjectRow): TaskProject => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  colorToken: taskColorTokenSchema.parse(row.color_token),
  icon: row.icon,
  position: row.position,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapTask = (row: TaskRow): Task => ({
  id: row.id,
  userId: row.user_id,
  projectId: row.project_id,
  title: row.title,
  notes: row.notes,
  status: taskStatusSchema.parse(row.status),
  priority: taskPrioritySchema.parse(row.priority),
  scheduledDate: row.scheduled_date,
  dueAt: row.due_at,
  estimateMinutes: row.estimate_minutes,
  position: row.position,
  completedAt: row.completed_at,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapChecklistItem = (row: ChecklistRow): TaskChecklistItem => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.task_id,
  title: row.title,
  completed: row.completed,
  position: row.position,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toProjectUpdate = (input: UpdateTaskProjectInput): ProjectUpdate => {
  const parsed = updateTaskProjectSchema.parse(input)
  const update: ProjectUpdate = {}
  if (parsed.name !== undefined) update.name = parsed.name
  if (parsed.colorToken !== undefined) update.color_token = parsed.colorToken
  if (parsed.icon !== undefined) update.icon = parsed.icon
  if (parsed.position !== undefined) update.position = parsed.position
  if (parsed.archivedAt !== undefined) update.archived_at = parsed.archivedAt
  return update
}

const toTaskUpdate = (input: UpdateTaskInput): TaskUpdate => {
  const parsed = updateTaskSchema.parse(input)
  const update: TaskUpdate = {}
  if (parsed.title !== undefined) update.title = parsed.title
  if (parsed.projectId !== undefined) update.project_id = parsed.projectId
  if (parsed.notes !== undefined) update.notes = parsed.notes
  if (parsed.priority !== undefined) update.priority = parsed.priority
  if (parsed.scheduledDate !== undefined) update.scheduled_date = parsed.scheduledDate
  if (parsed.dueAt !== undefined) update.due_at = parsed.dueAt
  if (parsed.estimateMinutes !== undefined) update.estimate_minutes = parsed.estimateMinutes
  if (parsed.position !== undefined) update.position = parsed.position
  return update
}

const toChecklistUpdate = (input: UpdateChecklistItemInput): ChecklistUpdate => {
  const parsed = updateChecklistItemSchema.parse(input)
  const update: ChecklistUpdate = {}
  if (parsed.title !== undefined) update.title = parsed.title
  if (parsed.completed !== undefined) update.completed = parsed.completed
  if (parsed.position !== undefined) update.position = parsed.position
  return update
}

export const createSupabaseTasksRepository = (
  client: SupabaseClient<Database>,
): TasksRepository => ({
  listProjects: async (userId, includeArchived = false) => {
    let query = client
      .from('task_projects')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (!includeArchived) query = query.is('archived_at', null)
    const { data, error } = await query
    return assertData(data, error, 'load projects').map(mapProject)
  },

  createProject: async (userId: string, input: CreateTaskProjectInput) => {
    const parsed = createTaskProjectSchema.parse(input)
    const { data, error } = await client
      .from('task_projects')
      .insert({
        user_id: userId,
        name: parsed.name,
        color_token: parsed.colorToken,
        icon: parsed.icon ?? null,
        position: parsed.position ?? Date.now(),
      })
      .select('*')
      .single()
    return mapProject(assertData(data, error, 'create the project'))
  },

  updateProject: async (userId, projectId, input) => {
    const { data, error } = await client
      .from('task_projects')
      .update(toProjectUpdate(input))
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('*')
      .single()
    return mapProject(assertData(data, error, 'update the project'))
  },

  deleteProject: async (userId, projectId) => {
    const { data, error } = await client
      .from('task_projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    assertWrite(data, error, 'delete the project')
  },

  listTasks: async (userId: string, filters: TaskFilters = {}) => {
    let query = client
      .from('tasks')
      .select('*')
      .eq('user_id', userId)

    if (filters.status === 'completed') {
      query = query.order('completed_at', { ascending: false, nullsFirst: false })
    } else if (filters.scheduledAfter !== undefined || filters.scheduledBefore !== undefined) {
      query = query
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('position', { ascending: true })
    } else {
      query = query.order('position', { ascending: true })
    }

    if (filters.status !== undefined) query = query.eq('status', filters.status)
    if (filters.projectId === null) query = query.is('project_id', null)
    else if (filters.projectId !== undefined) query = query.eq('project_id', filters.projectId)
    if (filters.scheduledDate !== undefined) {
      query = query.eq('scheduled_date', filters.scheduledDate)
    }
    if (filters.scheduledAfter !== undefined) {
      query = query.gt('scheduled_date', filters.scheduledAfter)
    }
    if (filters.scheduledBefore !== undefined) {
      query = query.lte('scheduled_date', filters.scheduledBefore)
    }
    if (filters.dueBefore !== undefined) query = query.lte('due_at', filters.dueBefore)

    const { data, error } = await query
    return assertData(data, error, 'load tasks').map(mapTask)
  },

  createTask: async (userId: string, input: CreateTaskInput) => {
    const parsed = createTaskSchema.parse(input)
    const { data, error } = await client
      .from('tasks')
      .insert({
        user_id: userId,
        title: parsed.title,
        project_id: parsed.projectId ?? null,
        notes: parsed.notes ?? null,
        priority: parsed.priority,
        scheduled_date: parsed.scheduledDate ?? null,
        due_at: parsed.dueAt ?? null,
        estimate_minutes: parsed.estimateMinutes ?? null,
        position: parsed.position ?? Date.now(),
      })
      .select('*')
      .single()
    return mapTask(assertData(data, error, 'create the task'))
  },

  updateTask: async (userId, taskId, input) => {
    const { data, error } = await client
      .from('tasks')
      .update(toTaskUpdate(input))
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('*')
      .single()
    return mapTask(assertData(data, error, 'update the task'))
  },

  setTaskStatus: async (userId, taskId, status: TaskStatus, now = new Date()) => {
    const currentResult = await client
      .from('tasks')
      .select('status, completed_at, archived_at')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()
    const current = assertData(currentResult.data, currentResult.error, 'load the task')
    const next = transitionTaskStatus(
      {
        status: taskStatusSchema.parse(current.status),
        completedAt: current.completed_at,
        archivedAt: current.archived_at,
      },
      status,
      now,
    )
    const { data, error } = await client
      .from('tasks')
      .update({
        status: next.status,
        completed_at: next.completedAt,
        archived_at: next.archivedAt,
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('*')
      .single()
    return mapTask(assertData(data, error, 'change the task status'))
  },

  deleteTask: async (userId, taskId) => {
    const { data, error } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    assertWrite(data, error, 'delete the task')
  },

  reorderTasks: async (_userId, orderedTaskIds) => {
    const { data, error } = await client.rpc('reorder_tasks', { p_task_ids: orderedTaskIds })
    return assertData(data, error, 'reorder tasks').map(mapTask)
  },

  listChecklistItems: async (userId, taskId) => {
    const { data, error } = await client
      .from('task_checklist_items')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .order('position', { ascending: true })
    return assertData(data, error, 'load checklist items').map(mapChecklistItem)
  },

  createChecklistItem: async (userId: string, input: CreateChecklistItemInput) => {
    const parsed = createChecklistItemSchema.parse(input)
    const { data, error } = await client
      .from('task_checklist_items')
      .insert({
        user_id: userId,
        task_id: parsed.taskId,
        title: parsed.title,
        position: parsed.position ?? 1000,
      })
      .select('*')
      .single()
    return mapChecklistItem(assertData(data, error, 'create the checklist item'))
  },

  updateChecklistItem: async (userId, itemId, input) => {
    const { data, error } = await client
      .from('task_checklist_items')
      .update(toChecklistUpdate(input))
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('*')
      .single()
    return mapChecklistItem(assertData(data, error, 'update the checklist item'))
  },

  deleteChecklistItem: async (userId, itemId) => {
    const { data, error } = await client
      .from('task_checklist_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    assertWrite(data, error, 'delete the checklist item')
  },
})
