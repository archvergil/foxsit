import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { useProfile } from '@/features/settings/profileQueries'
import { resolveTimeZone } from '@/lib/dates'
import { useHabitsRepository } from './habitsRepositoryContext'
import { habitQueryKeys, type HabitLogRange } from './repository'
import type { Habit, HabitInput, HabitLog, HabitLogInput, HabitProjectInput } from './types'

const useHabitIdentity = () => {
  const { session } = useAuth()
  if (!session) throw new Error('Habits requires an authenticated session.')
  return { userId: session.user.id, session }
}

export const useHabitDateContext = () => {
  const { userId, session } = useHabitIdentity()
  const profile = useProfile(userId)
  return {
    userId,
    timeZone: resolveTimeZone(profile.data?.timezone ?? session.user.user_metadata.timezone),
    weekStartsOn: profile.data?.week_starts_on ?? 1,
  }
}

export const useHabits = (includeInactive = false) => {
  const repository = useHabitsRepository()
  const { userId } = useHabitIdentity()
  return useQuery({
    queryKey: habitQueryKeys.list(userId, includeInactive),
    queryFn: () => repository.listHabits(userId, includeInactive),
  })
}

export const useHabitProjects = () => {
  const repository = useHabitsRepository()
  const { userId } = useHabitIdentity()
  return useQuery({ queryKey: habitQueryKeys.projects(userId), queryFn: () => repository.listProjects(userId) })
}

export const useCreateHabitProject = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'projects', 'create', userId],
    mutationFn: (input: HabitProjectInput) => repository.createProject(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitQueryKeys.projects(userId) }),
  })
}

export const useUpdateHabitProject = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'projects', 'update', userId],
    mutationFn: ({ projectId, input }: { projectId: string; input: HabitProjectInput }) => repository.updateProject(userId, projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitQueryKeys.projects(userId) }),
  })
}

export const useDeleteHabitProject = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'projects', 'delete', userId],
    mutationFn: (projectId: string) => repository.deleteProject(userId, projectId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: habitQueryKeys.projects(userId) }),
        queryClient.invalidateQueries({ queryKey: habitQueryKeys.lists(userId) }),
      ])
    },
  })
}

export const useHabitLogs = (range: HabitLogRange, enabled = true) => {
  const repository = useHabitsRepository()
  const { userId } = useHabitIdentity()
  return useQuery({
    queryKey: habitQueryKeys.logRange(userId, range),
    queryFn: () => repository.listLogs(userId, range),
    enabled,
  })
}

export const useCreateHabit = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'create', userId],
    mutationFn: (input: HabitInput) => repository.createHabit(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitQueryKeys.lists(userId) }),
  })
}

export const useUpdateHabit = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'update', userId],
    mutationFn: ({ habitId, input }: { habitId: string; input: HabitInput }) =>
      repository.updateHabit(userId, habitId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitQueryKeys.lists(userId) }),
  })
}

export const useDeleteHabit = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'delete', userId],
    mutationFn: (habitId: string) => repository.deleteHabit(userId, habitId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: habitQueryKeys.lists(userId) }),
      queryClient.invalidateQueries({ queryKey: habitQueryKeys.logs(userId) }),
      queryClient.invalidateQueries({ queryKey: ['rewards', 'dashboard', userId] }),
    ]),
  })
}

export const useClearHabitHistory = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation({
    mutationKey: ['habits', 'history', 'clear', userId],
    mutationFn: (habitId: string) => repository.clearHabitHistory(userId, habitId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: habitQueryKeys.logs(userId) }),
      queryClient.invalidateQueries({ queryKey: ['rewards', 'dashboard', userId] }),
    ]),
  })
}

interface ReorderHabitsContext {
  snapshots: Array<[QueryKey, Habit[] | undefined]>
}

export const useReorderHabits = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation<Habit[], Error, Habit[], ReorderHabitsContext>({
    mutationKey: ['habits', 'reorder', userId],
    mutationFn: (orderedHabits) => repository.reorderHabits(userId, orderedHabits.map(({ id }) => id)),
    onMutate: async (orderedHabits) => {
      const listKey = habitQueryKeys.lists(userId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const snapshots = queryClient.getQueriesData<Habit[]>({ queryKey: listKey })
      const positions = new Map(orderedHabits.map((habit, index) => [habit.id, (index + 1) * 1000]))
      for (const [queryKey, habits] of snapshots) {
        queryClient.setQueryData<Habit[]>(queryKey, habits?.map((habit) => ({
          ...habit,
          position: positions.get(habit.id) ?? habit.position,
        })).sort((left, right) => left.position - right.position || left.createdAt.localeCompare(right.createdAt)))
      }
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, habits] of context?.snapshots ?? []) queryClient.setQueryData(queryKey, habits)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitQueryKeys.lists(userId) }),
  })
}

export const useUpsertHabitLog = () => {
  const repository = useHabitsRepository()
  const queryClient = useQueryClient()
  const { userId } = useHabitIdentity()
  return useMutation<HabitLog, Error, HabitLogInput, { snapshots: Array<[QueryKey, HabitLog[] | undefined]> }>({
    mutationKey: ['habits', 'progress', userId],
    mutationFn: (input: HabitLogInput) => repository.upsertLog(userId, input),
    onMutate: async (input) => {
      const logsKey = habitQueryKeys.logs(userId)
      await queryClient.cancelQueries({ queryKey: logsKey })
      const snapshots = queryClient.getQueriesData<HabitLog[]>({ queryKey: logsKey })
      const timestamp = new Date().toISOString()
      for (const [queryKey, logs] of snapshots) {
        const range = queryKey[3] as HabitLogRange | undefined
        if (!range || input.localDate < range.dateStart || input.localDate > range.dateEnd) continue
        if (range.habitId && range.habitId !== input.habitId) continue
        const current = logs?.find((log) => log.habitId === input.habitId && log.localDate === input.localDate)
        const optimistic: HabitLog = {
          id: current?.id ?? `optimistic-${input.habitId}-${input.localDate}`,
          userId,
          ...input,
          source: 'manual',
          sourceId: null,
          createdAt: current?.createdAt ?? timestamp,
          updatedAt: timestamp,
        }
        queryClient.setQueryData<HabitLog[]>(queryKey, [
          ...(logs ?? []).filter((log) => log.habitId !== input.habitId || log.localDate !== input.localDate),
          optimistic,
        ])
      }
      return { snapshots }
    },
    onError: (_error, _input, context) => {
      for (const [queryKey, logs] of context?.snapshots ?? []) queryClient.setQueryData(queryKey, logs)
    },
    onSuccess: (saved) => {
      for (const [queryKey, logs] of queryClient.getQueriesData<HabitLog[]>({ queryKey: habitQueryKeys.logs(userId) })) {
        if (!logs?.some((log) => log.habitId === saved.habitId && log.localDate === saved.localDate)) continue
        queryClient.setQueryData<HabitLog[]>(queryKey, logs.map((log) => (
          log.habitId === saved.habitId && log.localDate === saved.localDate ? saved : log
        )))
      }
      void queryClient.invalidateQueries({ queryKey: ['rewards', 'dashboard', userId] })
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: habitQueryKeys.logs(userId) }) },
  })
}
