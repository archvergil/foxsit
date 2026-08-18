import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { CalendarRepositoryProvider } from '@/features/calendar/CalendarRepositoryProvider'
import { FocusRepositoryProvider } from '@/features/focus/FocusRepositoryProvider'
import { HabitsRepositoryProvider } from '@/features/habits/HabitsRepositoryProvider'
import { ThemeProvider } from '@/features/settings/ThemeProvider'
import { ProfileRepositoryProvider } from '@/features/settings/ProfileRepositoryProvider'
import { RewardsRepositoryProvider } from '@/features/rewards/RewardsRepositoryProvider'
import { TasksRepositoryProvider } from '@/features/tasks/TasksRepositoryProvider'
import { WorkoutRepositoryProvider } from '@/features/workout/WorkoutRepositoryProvider'
import { queryClient } from './queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ProfileRepositoryProvider>
            <CalendarRepositoryProvider>
              <TasksRepositoryProvider>
                <FocusRepositoryProvider>
                  <HabitsRepositoryProvider>
                    <WorkoutRepositoryProvider>
                      <RewardsRepositoryProvider>{children}</RewardsRepositoryProvider>
                    </WorkoutRepositoryProvider>
                  </HabitsRepositoryProvider>
                </FocusRepositoryProvider>
              </TasksRepositoryProvider>
            </CalendarRepositoryProvider>
          </ProfileRepositoryProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
