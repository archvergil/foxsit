import {
  CalendarDays,
  CheckSquare2,
  CircleEllipsis,
  Dumbbell,
  Gauge,
  Leaf,
  Settings2,
  TimerReset,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export const primaryNavigation: NavigationItem[] = [
  { label: 'Today', to: '/today', icon: Gauge },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare2 },
  { label: 'Focus', to: '/focus', icon: TimerReset },
  { label: 'Habits', to: '/habits', icon: Leaf },
  { label: 'Workout', to: '/workout', icon: Dumbbell },
]

export const utilityNavigation: NavigationItem[] = [
  { label: 'Settings', to: '/settings', icon: Settings2 },
]

export const mobileNavigation: NavigationItem[] = [
  { label: 'Today', to: '/today', icon: Gauge },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare2 },
  { label: 'Habits', to: '/habits', icon: Leaf },
  { label: 'More', to: '/settings', icon: CircleEllipsis },
]
