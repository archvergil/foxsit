const loadLogin = () => import('@/features/auth/LoginPage')
const loadSignup = () => import('@/features/auth/SignupPage')
const loadForgotPassword = () => import('@/features/auth/ForgotPasswordPage')
const loadResetPassword = () => import('@/features/auth/ResetPasswordPage')
const loadToday = () => import('@/features/home/TodayPage')
const loadCalendar = () => import('@/features/calendar/CalendarPage')
const loadTasks = () => import('@/features/tasks/TasksPage')
const loadFocus = () => import('@/features/focus/FocusPage')
const loadHabits = () => import('@/features/habits/HabitsPage')
const loadWorkout = () => import('@/features/workout/WorkoutPage')
const loadSettings = () => import('@/features/settings/SettingsPage')
const loadRewards = () => import('@/features/rewards/RewardsPage')

export const routeModules = {
  LoginPage: loadLogin,
  SignupPage: loadSignup,
  ForgotPasswordPage: loadForgotPassword,
  ResetPasswordPage: loadResetPassword,
  TodayPage: loadToday,
  CalendarPage: loadCalendar,
  TasksPage: loadTasks,
  FocusPage: loadFocus,
  HabitsPage: loadHabits,
  WorkoutPage: loadWorkout,
  SettingsPage: loadSettings,
  RewardsPage: loadRewards,
}

const authenticatedRouteLoaders = [
  loadToday,
  loadCalendar,
  loadTasks,
  loadFocus,
  loadHabits,
  loadWorkout,
  loadSettings,
  loadRewards,
]

export const preloadRoute = (path: string) => {
  const loader = path.startsWith('/calendar') ? loadCalendar
    : path.startsWith('/tasks') ? loadTasks
      : path.startsWith('/focus') ? loadFocus
        : path.startsWith('/habits') ? loadHabits
          : path.startsWith('/workout') ? loadWorkout
            : path.startsWith('/settings') ? loadSettings
              : path.startsWith('/rewards') ? loadRewards
                : path.startsWith('/today') ? loadToday
                  : null
  if (loader) void loader()
}

export const preloadAuthenticatedRoutes = () => Promise.allSettled(
  authenticatedRouteLoaders.map((loader) => loader()),
)
