import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { workoutQueryKeys } from './repository'
import type { FinishWorkoutSessionInput, SaveWorkoutSetInput, WorkoutRoutineExerciseInput, WorkoutRoutineInput } from './types'
import { useWorkoutRepository } from './workoutRepositoryContext'

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

const useInvalidateRoutines = () => {
  const queryClient = useQueryClient()
  const userId = useWorkoutIdentity()
  return {
    userId,
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
  const { userId, invalidate } = useInvalidateRoutines()
  return useMutation({
    mutationKey: ['workout', 'routine', 'delete', userId],
    mutationFn: (routineId: string) => repository.deleteRoutine(userId, routineId),
    onSuccess: invalidate,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutQueryKeys.activeSession(userId) }),
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
