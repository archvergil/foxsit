import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.generated'
import type { LocalApiClient } from '@/lib/localApi'

export type UserProfile = Database['public']['Tables']['profiles']['Row']
export type CalendarDisplayPreferences = Pick<UserProfile, 'calendar_show_events' | 'calendar_show_tasks' | 'calendar_show_habits'>
export type ProfileDetails = Pick<UserProfile, 'display_name' | 'avatar_url'>

const localAvatarDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the profile photo.'))
  reader.onerror = () => reject(new Error('Could not read the profile photo.'))
  reader.readAsDataURL(file)
})

export interface ProfileRepository {
  getProfile(userId: string): Promise<UserProfile>
  updateCalendarPreferences(userId: string, preferences: CalendarDisplayPreferences): Promise<UserProfile>
  updateProfile(userId: string, details: ProfileDetails): Promise<UserProfile>
  uploadAvatar(userId: string, file: File): Promise<string>
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
  updateProfile: async (userId, details) => {
    const { data, error } = await client.from('profiles').update(details).eq('id', userId).select('*').single()
    if (error || !data) throw new Error('Could not save profile details.', { cause: error })
    return data
  },
  uploadAvatar: async (userId, file) => {
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/avatar.${extension}`
    const { error } = await client.storage.from('profile-avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw new Error('Could not upload profile photo.', { cause: error })
    const publicUrl = client.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl
    return `${publicUrl}?v=${Date.now()}`
  },
})

export const createLocalProfileRepository = (client: LocalApiClient): ProfileRepository => ({
  getProfile: () => client.get<UserProfile>('/v1/profile'),
  updateCalendarPreferences: (_userId, preferences) => client.patch<UserProfile>('/v1/profile/calendar', preferences),
  updateProfile: (_userId, details) => client.patch<UserProfile>('/v1/profile', details),
  uploadAvatar: async (_userId, file) => localAvatarDataUrl(file),
})
