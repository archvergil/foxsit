import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { workoutQueryKeys } from './repository'
import type { FinishWorkoutSessionInput, RenameWorkoutSessionExerciseInput, SaveWorkoutSetInput, WorkoutRoutine, WorkoutRoutineExerciseInput, WorkoutRoutineInput, WorkoutSession, WorkoutSet } from './types'
import { useOptionalWorkoutRepository, useWorkoutRepository } from './workoutRepositoryContext'

const useWorkoutIdentity = () => {
  const { session } = useAuth()
  if (!session) throw new Error('Workout requires an authenticated session.')
  return session.user.id
}

export const useWorkoutRoutines = () => {
  const repository = useWorkoutRepository()
  const userId = useWorkoutIdentity()
  return useQuery({
    queryKey: workoutQueryKeys.routines(userId),
    queryFn: () => repository.listRoutines(userId),
  })
}

export const useActiveWorkoutSession = () => {
  const repository = useWorkoutRepository()
  const userId = useWorkoutIdentity()
  return useQuery({
    queryKey: workoutQueryKeys.activeSession(userId),
    queryFn: () => repository.getActiveSession(userId),
  })
}

export const useWorkoutHistory = (enabled = true) => {
  const repository = useWorkoutRepository()
  const userId = useWorkoutIdentity()
  return useQuery({
    queryKey: workoutQueryKeys.history(userId),
    queryFn: () => repository.listCompletedSessions(userId),
    enabled,
  })
}

export const useOptionalActiveWorkoutSession = () => {
  const repository = useOptionalWorkoutRepository()
  const userId = useWorkoutIdentity()
  return useQuery({
    queryKey: workoutQueryKeys.activeSession(userId),
    queryFn: () => repository?.getActiveSession(userId) ?? Promise.resolve(null),
    enabled: repository !== null,
    initialData: repository === null ? null : undefined,
  })
}

export const useOptionalWorkoutHistory = () => {
  const repository = useOptionalWorkoutRepository()
  const userId = useWorkoutIdentity()
  return useQuery({
    queryKey: workoutQueryKeys.history(userId),
    queryFn: () => repository?.listCompletedSessions(userId) ?? Promise.resolve([]),
    enabled: repository !== null,
    initialData: repository === null ? [] : undefined,
  })
}

export const useOptionalWorkoutRoutines = () => {
  const repository = useOptionalWorkoutRepository()
  const userId = useWorkoutIdentity()
  return useQuery({
    queryKey: workoutQueryKeys.routines(userId),
    queryFn: () => repository?.listRoutines(userId) ?? Promise.resolve([]),
    enabled: repository !== null,
    initialData: repository === null ? [] : undefined,
  })
}

export const useDeleteWorkoutSession = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'history', 'delete', userId],
    mutationFn: (sessionId: string) => repository.deleteCompletedSession(userId, sessionId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history(userId) }),
      queryClient.invalidateQueries({ queryKey: ['rewards', 'dashboard', userId] }),
    ]),
  })
}

const useInvalidateRoutines = () => {
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return {
    userId,
    queryClient,
    invalidate: () => queryClient.invalidateQueries({ queryKey: workoutQueryKeys.routines(userId) }),
  }
}

export const useCreateWorkoutRoutine = () => {
  const repository = useWorkoutRepository()
  const { userId, invalidate } = useInvalidateRoutines()
  return useMutation({
    mutationKey: ['workout', 'routine', 'create', userId],
    mutationFn: (input: WorkoutRoutineInput) => repository.createRoutine(userId, input),
    onSuccess: invalidate,
  })
}

export const useUpdateWorkoutRoutine = () => {
  const repository = useWorkoutRepository()
  const { userId, invalidate } = useInvalidateRoutines()
  return useMutation({
    mutationKey: ['workout', 'routine', 'update', userId],
    mutationFn: ({ routineId, input }: { routineId: string; input: WorkoutRoutineInput }) =>
      repository.updateRoutine(userId, routineId, input),
    onSuccess: invalidate,
  })
}

export const useDeleteWorkoutRoutine = () => {
  const repository = useWorkoutRepository()
  const { userId, queryClient, invalidate } = useInvalidateRoutines()
  return useMutation({
    mutationKey: ['workout', 'routine', 'delete', userId],
    mutationFn: (routineId: string) => repository.deleteRoutine(userId, routineId),
    onSuccess: (_data, routineId) => {
      queryClient.setQueryData<WorkoutRoutine[]>(workoutQueryKeys.routines(userId), (routines) =>
        routines?.filter(({ id }) => id !== routineId))
      void invalidate()
    },
  })
}

export const useCreateWorkoutExercise = () => {
  const repository = useWorkoutRepository()
  const { userId, invalidate } = useInvalidateRoutines()
  return useMutation({
    mutationKey: ['workout', 'exercise', 'create', userId],
    mutationFn: (input: WorkoutRoutineExerciseInput) => repository.createExercise(userId, input),
    onSuccess: invalidate,
  })
}

export const useDeleteWorkoutExercise = () => {
  const repository = useWorkoutRepository()
  const { userId, invalidate } = useInvalidateRoutines()
  return useMutation({
    mutationKey: ['workout', 'exercise', 'delete', userId],
    mutationFn: (exerciseId: string) => repository.deleteExercise(userId, exerciseId),
    onSuccess: invalidate,
  })
}

export const useStartWorkoutSession = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'session', 'start', userId],
    mutationFn: (routineId: string) => repository.startSession(userId, routineId),
    onSuccess: (session) => queryClient.setQueryData(workoutQueryKeys.activeSession(userId), session),
  })
}

export const useSaveWorkoutSet = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'set', 'save', userId],
    mutationFn: (input: SaveWorkoutSetInput) => repository.saveSet(userId, input),
    onSuccess: (savedSet) => {
      queryClient.setQueryData<WorkoutSession | null>(workoutQueryKeys.activeSession(userId), (session) => session ? ({
        ...session,
        exercises: session.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set): WorkoutSet => set.id === savedSet.id ? savedSet : set),
        })),
      }) : session)
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.activeSession(userId) })
    },
  })
}

export const useRenameWorkoutSessionExercise = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'session-exercise', 'rename', userId],
    mutationFn: (input: RenameWorkoutSessionExerciseInput) => repository.renameSessionExercise(userId, input),
    onSuccess: (renamed) => {
      queryClient.setQueryData<WorkoutSession | null>(workoutQueryKeys.activeSession(userId), (session) => session ? ({
        ...session,
        exercises: session.exercises.map((exercise) => exercise.id === renamed.id
          ? { ...exercise, exerciseName: renamed.exerciseName, updatedAt: renamed.updatedAt }
          : exercise),
      }) : session)
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.activeSession(userId) })
    },
  })
}

export const useCancelWorkoutSession = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'session', 'cancel', userId],
    mutationFn: ({ sessionId, endedAt }: { sessionId: string; endedAt: string }) =>
      repository.cancelSession(userId, sessionId, endedAt),
    onSuccess: () => queryClient.setQueryData(workoutQueryKeys.activeSession(userId), null),
  })
}

export const useFinishWorkoutSession = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'session', 'finish', userId],
    mutationFn: (input: FinishWorkoutSessionInput) => repository.finishSession(userId, input),
    onSuccess: async () => {
      queryClient.setQueryData(workoutQueryKeys.activeSession(userId), null)
      await queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history(userId) })
    },
  })
}

export const useIncrementCrossfitRound = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'crossfit', 'round', userId],
    mutationFn: (sessionId: string) => repository.incrementCrossfitRound(userId, sessionId),
    onSuccess: async (result) => {
      if (result.status === 'completed') {
        queryClient.setQueryData(workoutQueryKeys.activeSession(userId), null)
        await queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history(userId) })
        return
      }
      queryClient.setQueryData<WorkoutSession | null>(workoutQueryKeys.activeSession(userId), (session) => session ? ({
        ...session,
        crossfitRoundsCompleted: result.roundsCompleted,
      }) : session)
    },
  })
}

export const useSettleCrossfitWorkout = () => {
  const repository = useWorkoutRepository()
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return useMutation({
    mutationKey: ['workout', 'crossfit', 'settle', userId],
    mutationFn: (sessionId: string) => repository.settleCrossfitSession(userId, sessionId),
    onSuccess: async () => {
      queryClient.setQueryData(workoutQueryKeys.activeSession(userId), null)
      await queryClient.invalidateQueries({ queryKey: workoutQueryKeys.history(userId) })
    },
  })
}
