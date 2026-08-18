import type { ReactNode } from 'react'

import { supabase } from '@/lib/supabase'
import type { WorkoutRepository } from './repository'
import { createSupabaseWorkoutRepository } from './supabaseWorkoutRepository'
import { WorkoutRepositoryContext } from './workoutRepositoryContext'

const defaultRepository = supabase ? createSupabaseWorkoutRepository(supabase) : null

export function WorkoutRepositoryProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode
  repository?: WorkoutRepository | null
}) {
  return <WorkoutRepositoryContext.Provider value={repository}>{children}</WorkoutRepositoryContext.Provider>
}
