import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { AppLoading } from '@/components/feedback/AppLoading'
import { RouteErrorPage } from '@/components/feedback/RouteErrorPage'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/authContext'
import { routeModules } from './routeModules'

const LoginPage = lazy(routeModules.LoginPage)
const SignupPage = lazy(routeModules.SignupPage)
const ForgotPasswordPage = lazy(routeModules.ForgotPasswordPage)
const ResetPasswordPage = lazy(routeModules.ResetPasswordPage)
const TodayPage = lazy(routeModules.TodayPage)
const CalendarPage = lazy(routeModules.CalendarPage)
const TasksPage = lazy(routeModules.TasksPage)
const FocusPage = lazy(routeModules.FocusPage)
const HabitsPage = lazy(routeModules.HabitsPage)
const WorkoutPage = lazy(routeModules.WorkoutPage)
const SettingsPage = lazy(routeModules.SettingsPage)
const RewardsPage = lazy(routeModules.RewardsPage)

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
