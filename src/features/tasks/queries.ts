import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { useProfile } from '@/features/settings/profileQueries'
import { resolveTimeZone } from '@/lib/dates'
import { taskMatchesFilters } from './taskFilters'
import { taskQueryKeys } from './repository'
import { transitionTaskStatus } from './taskStatus'
import { useTasksRepository } from './tasksRepositoryContext'
import type {
  CreateChecklistItemInput,
  CreateTaskInput,
  CreateTaskProjectInput,
  Task,
  TaskChecklistItem,
  TaskFilters,
  TaskStatus,
  UpdateChecklistItemInput,
  UpdateTaskInput,
  UpdateTaskProjectInput,
} from './types'

const useTaskIdentity = () => {
  const { session } = useAuth()
  if (!session) throw new Error('Tasks require an authenticated session.')
  return { userId: session.user.id }
}

const updateCachedList = (tasks: Task[] | undefined, nextTask: Task, queryKey: QueryKey) => {
  if (!tasks) return tasks
  const filters = queryKey[3] as TaskFilters | undefined
  if (!filters) return tasks

  const withoutTask = tasks.filter(({ id }) => id !== nextTask.id)
  if (!taskMatchesFilters(nextTask, filters)) return withoutTask
  return [...withoutTask, nextTask].sort(
    (left, right) => left.position - right.position || left.createdAt.localeCompare(right.createdAt),
  )
}

const syncTaskToCachedLists = (queryClient: QueryClient, userId: string, task: Task) => {
  for (const [queryKey, tasks] of queryClient.getQueriesData<Task[]>({ queryKey: taskQueryKeys.lists(userId) })) {
    queryClient.setQueryData<Task[]>(queryKey, updateCachedList(tasks, task, queryKey))
  }
}

export const useTaskDateContext = () => {
  const identity = useTaskIdentity()
  const profile = useProfile(identity.userId)
  const { session } = useAuth()
  return {
    ...identity,
    timeZone: resolveTimeZone(profile.data?.timezone ?? session?.user.user_metadata.timezone),
  }
}

export const useTaskProjects = () => {
  const repository = useTasksRepository()
  const { userId } = useTaskIdentity()
  return useQuery({
    queryKey: taskQueryKeys.projects(userId),
    queryFn: () => repository.listProjects(userId),
  })
}

export const useCreateTaskProject = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'projects', 'create', userId],
    mutationFn: (input: CreateTaskProjectInput) => repository.createProject(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.projects(userId) }),
  })
}

export const useUpdateTaskProject = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'projects', 'update', userId],
    mutationFn: ({ projectId, input }: { projectId: string; input: UpdateTaskProjectInput }) =>
      repository.updateProject(userId, projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.projects(userId) }),
  })
}

export const useDeleteTaskProject = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'projects', 'delete', userId],
    mutationFn: (projectId: string) => repository.deleteProject(userId, projectId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskQueryKeys.projects(userId) }),
        queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) }),
      ])
    },
  })
}

export const useTaskList = (filters: TaskFilters) => {
  const repository = useTasksRepository()
  const { userId } = useTaskIdentity()
  return useQuery({
    queryKey: taskQueryKeys.list(userId, filters),
    queryFn: () => repository.listTasks(userId, filters),
  })
}

export const useCreateTask = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'create', userId],
    mutationFn: (input: CreateTaskInput) => repository.createTask(userId, input),
    onSuccess: (task) => {
      syncTaskToCachedLists(queryClient, userId, task)
      void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) })
    },
  })
}

export const useUpdateTask = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'update', userId],
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      repository.updateTask(userId, taskId, input),
    onSuccess: (task) => {
      syncTaskToCachedLists(queryClient, userId, task)
      void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) })
    },
  })
}

export const useDeleteTask = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'delete', userId],
    mutationFn: (taskId: string) => repository.deleteTask(userId, taskId),
    onSuccess: (_data, taskId) => {
      for (const [queryKey, tasks] of queryClient.getQueriesData<Task[]>({ queryKey: taskQueryKeys.lists(userId) })) {
        queryClient.setQueryData<Task[]>(queryKey, tasks?.filter((task) => task.id !== taskId))
      }
      void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) })
      void queryClient.invalidateQueries({ queryKey: ['focus'] })
    },
  })
}

export const useConvertTaskToCalendarEvent = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'convert-to-event', userId],
    mutationFn: ({ taskId, startTime }: { taskId: string; startTime: string }) =>
      repository.convertTaskToCalendarEvent(userId, taskId, startTime),
    onSuccess: (_eventId, { taskId }) => {
      for (const [queryKey, tasks] of queryClient.getQueriesData<Task[]>({ queryKey: taskQueryKeys.lists(userId) })) {
        queryClient.setQueryData<Task[]>(queryKey, tasks?.filter((task) => task.id !== taskId))
      }
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) }),
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['focus'] }),
      ])
    },
  })
}

interface ReorderTasksVariables {
  orderedTasks: Task[]
}

interface ReorderTasksContext {
  snapshots: Array<[QueryKey, Task[] | undefined]>
}

export const useReorderTasks = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation<Task[], Error, ReorderTasksVariables, ReorderTasksContext>({
    mutationKey: ['tasks', 'reorder', userId],
    mutationFn: ({ orderedTasks }) => repository.reorderTasks(
      userId,
      orderedTasks.map(({ id }) => id),
    ),
    onMutate: async ({ orderedTasks }) => {
      const listKey = taskQueryKeys.lists(userId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: listKey })
      const positions = new Map(orderedTasks.map((task, index) => [task.id, (index + 1) * 1000]))
      for (const [queryKey, tasks] of snapshots) {
        queryClient.setQueryData<Task[]>(queryKey, tasks?.map((task) => ({
          ...task,
          position: positions.get(task.id) ?? task.position,
        })).sort((left, right) => left.position - right.position || left.createdAt.localeCompare(right.createdAt)))
      }
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, tasks] of context?.snapshots ?? []) queryClient.setQueryData(queryKey, tasks)
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) }) },
  })
}

export const useTaskChecklist = (taskId: string | null) => {
  const repository = useTasksRepository()
  const { userId } = useTaskIdentity()
  return useQuery({
    queryKey: taskQueryKeys.checklist(userId, taskId ?? 'none'),
    queryFn: () => taskId ? repository.listChecklistItems(userId, taskId) : Promise.resolve([]),
    enabled: Boolean(taskId),
  })
}

export const useCreateChecklistItem = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'checklist', 'create', userId],
    mutationFn: (input: CreateChecklistItemInput) => repository.createChecklistItem(userId, input),
    onSuccess: (item) => queryClient.invalidateQueries({
      queryKey: taskQueryKeys.checklist(userId, item.taskId),
    }),
  })
}

interface ChecklistUpdateVariables {
  taskId: string
  itemId: string
  input: UpdateChecklistItemInput
}

export const useUpdateChecklistItem = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation<TaskChecklistItem, Error, ChecklistUpdateVariables, { previous: TaskChecklistItem[] | undefined }>({
    mutationKey: ['tasks', 'checklist', 'update', userId],
    mutationFn: ({ itemId, input }) => repository.updateChecklistItem(userId, itemId, input),
    onMutate: async ({ taskId, itemId, input }) => {
      const key = taskQueryKeys.checklist(userId, taskId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskChecklistItem[]>(key)
      queryClient.setQueryData<TaskChecklistItem[]>(key, (items = []) => items.map((item) => (
        item.id === itemId ? { ...item, ...input } : item
      )))
      return { previous }
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        taskQueryKeys.checklist(userId, variables.taskId),
        context?.previous,
      )
    },
    onSettled: (_data, _error, variables) => queryClient.invalidateQueries({
      queryKey: taskQueryKeys.checklist(userId, variables.taskId),
    }),
  })
}

export const useDeleteChecklistItem = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()
  return useMutation({
    mutationKey: ['tasks', 'checklist', 'delete', userId],
    mutationFn: ({ itemId }: { taskId: string; itemId: string }) =>
      repository.deleteChecklistItem(userId, itemId),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({
      queryKey: taskQueryKeys.checklist(userId, variables.taskId),
    }),
  })
}

interface StatusMutationVariables {
  task: Task
  status: TaskStatus
}

interface StatusMutationContext {
  snapshots: Array<[QueryKey, Task[] | undefined]>
}

export const useSetTaskStatus = () => {
  const repository = useTasksRepository()
  const queryClient = useQueryClient()
  const { userId } = useTaskIdentity()

  return useMutation<Task, Error, StatusMutationVariables, StatusMutationContext>({
    mutationKey: ['tasks', 'status', userId],
    mutationFn: ({ task, status }) => repository.setTaskStatus(userId, task.id, status),
    onMutate: async ({ task, status }) => {
      const listKey = taskQueryKeys.lists(userId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: listKey })
      const transition = transitionTaskStatus(task, status, new Date())
      const optimisticTask: Task = {
        ...task,
        status: transition.status,
        completedAt: transition.completedAt,
        archivedAt: transition.archivedAt,
      }

      for (const [queryKey, tasks] of snapshots) {
        queryClient.setQueryData<Task[]>(queryKey, updateCachedList(tasks, optimisticTask, queryKey))
      }
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, tasks] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, tasks)
      }
    },
    onSuccess: (task) => syncTaskToCachedLists(queryClient, userId, task),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists(userId) }) },
  })
}
