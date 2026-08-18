import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { AppLoading } from '@/components/feedback/AppLoading'
import { RouteErrorPage } from '@/components/feedback/RouteErrorPage'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/authContext'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const SignupPage = lazy(() => import('@/features/auth/SignupPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
const TodayPage = lazy(() => import('@/features/home/TodayPage'))
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'))
const TasksPage = lazy(() => import('@/features/tasks/TasksPage'))
const FocusPage = lazy(() => import('@/features/focus/FocusPage'))
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage'))
const WorkoutPage = lazy(() => import('@/features/workout/WorkoutPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const RewardsPage = lazy(() => import('@/features/rewards/RewardsPage'))

function SuspenseLayout() {
  return <Suspense fallback={<AppLoading />}><Outlet /></Suspense>
}

function RootRedirect() {
  const { status } = useAuth()
  if (status === 'loading') return <AppLoading />
  return <Navigate to={status === 'authenticated' ? '/today' : '/login'} replace />
}

function RequireAuth() {
  const { status } = useAuth()
  if (status === 'loading') return <AppLoading />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return <AppShell />
}

export const router = createBrowserRouter([
  {
    element: <SuspenseLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <RootRedirect /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/today', element: <TodayPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/calendar/week', element: <CalendarPage /> },
          { path: '/calendar/day/:date', element: <CalendarPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/tasks/today', element: <TasksPage /> },
          { path: '/tasks/upcoming', element: <TasksPage /> },
          { path: '/tasks/completed', element: <TasksPage /> },
          { path: '/tasks/project/:projectId', element: <TasksPage /> },
          { path: '/focus', element: <FocusPage /> },
          { path: '/rewards', element: <RewardsPage /> },
          { path: '/habits', element: <HabitsPage /> },
          { path: '/habits/insights', element: <HabitsPage /> },
          { path: '/workout', element: <WorkoutPage /> },
          { path: '/workout/routines', element: <WorkoutPage /> },
          { path: '/workout/routine/:routineId', element: <WorkoutPage /> },
          { path: '/workout/session/active', element: <WorkoutPage /> },
          { path: '/workout/history', element: <WorkoutPage /> },
          { path: '/workout/exercise/:exerciseId', element: <WorkoutPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/appearance', element: <SettingsPage /> },
          { path: '/settings/data', element: <SettingsPage /> },
        ],
      },
      { path: '*', element: <RouteErrorPage /> },
    ],
  },
])
