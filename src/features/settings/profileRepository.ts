import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import type { LocalApiClient } from '@/lib/localApi'

export type UserProfile = Database['public']['Tables']['profiles']['Row']
export type CalendarDisplayPreferences = Pick<UserProfile, 'calendar_show_events' | 'calendar_show_tasks' | 'calendar_show_habits'>

export interface ProfileRepository {
  getProfile(userId: string): Promise<UserProfile>
  updateCalendarPreferences(userId: string, preferences: CalendarDisplayPreferences): Promise<UserProfile>
}

export const profileQueryKey = (userId: string) => ['profile', userId] as const

export const createSupabaseProfileRepository = (
  client: SupabaseClient<Database>,
): ProfileRepository => ({
  getProfile: async (userId) => {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) throw new Error('Could not load profile preferences.', { cause: error })
    return data
  },
  updateCalendarPreferences: async (userId, preferences) => {
    const { data, error } = await client.from('profiles').update(preferences).eq('id', userId).select('*').single()
    if (error || !data) throw new Error('Could not save Calendar preferences.', { cause: error })
    return data
  },
})

export const createLocalProfileRepository = (client: LocalApiClient): ProfileRepository => ({
  getProfile: () => client.get<UserProfile>('/v1/profile'),
  updateCalendarPreferences: (_userId, preferences) => client.patch<UserProfile>('/v1/profile/calendar', preferences),
})
