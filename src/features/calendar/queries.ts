import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/authContext'
import { useProfile } from '@/features/settings/profileQueries'
import { resolveTimeZone } from '@/lib/dates'
import { useCalendarRepository } from './calendarRepositoryContext'
import { calendarQueryKeys } from './repository'
import type { CalendarEventInput, CalendarEventRange } from './types'

const useCalendarIdentity = () => {
  const { session } = useAuth()
  if (!session) throw new Error('Calendar requires an authenticated session.')
  return { userId: session.user.id, session }
}

export const useCalendarDateContext = () => {
  const { userId, session } = useCalendarIdentity()
  const profile = useProfile(userId)
  return {
    userId,
    timeZone: resolveTimeZone(profile.data?.timezone ?? session.user.user_metadata.timezone),
    weekStartsOn: profile.data?.week_starts_on ?? 1,
    showEvents: profile.data?.calendar_show_events ?? true,
    showTasks: profile.data?.calendar_show_tasks ?? true,
    showHabits: profile.data?.calendar_show_habits ?? true,
  }
}

export const useCalendarEvents = (range: CalendarEventRange) => {
  const repository = useCalendarRepository()
  const { userId } = useCalendarIdentity()
  return useQuery({
    queryKey: calendarQueryKeys.list(userId, range),
    queryFn: () => repository.listEvents(userId, range),
  })
}

export const useCreateCalendarEvent = () => {
  const repository = useCalendarRepository()
  const queryClient = useQueryClient()
  const { userId } = useCalendarIdentity()
  return useMutation({
    mutationKey: ['calendar', 'create', userId],
    mutationFn: (input: CalendarEventInput) => repository.createEvent(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarQueryKeys.lists(userId) }),
  })
}

export const useUpdateCalendarEvent = () => {
  const repository = useCalendarRepository()
  const queryClient = useQueryClient()
  const { userId } = useCalendarIdentity()
  return useMutation({
    mutationKey: ['calendar', 'update', userId],
    mutationFn: ({ eventId, input }: { eventId: string; input: CalendarEventInput }) =>
      repository.updateEvent(userId, eventId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarQueryKeys.lists(userId) }),
  })
}

export const useDeleteCalendarEvent = () => {
  const repository = useCalendarRepository()
  const queryClient = useQueryClient()
  const { userId } = useCalendarIdentity()
  return useMutation({
    mutationKey: ['calendar', 'delete', userId],
    mutationFn: (eventId: string) => repository.deleteEvent(userId, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarQueryKeys.lists(userId) }),
  })
}
