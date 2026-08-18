import type { FocusPhase } from './types'

export const notificationAvailability = () => {
  if (!('Notification' in window)) return 'unavailable' as const
  return window.Notification.permission
}

export const requestFocusNotifications = async () => {
  if (!('Notification' in window)) return 'unavailable' as const
  return window.Notification.requestPermission()
}

export const notifyPhaseComplete = (phase: FocusPhase) => {
  if (!('Notification' in window) || window.Notification.permission !== 'granted') return
  const title = phase === 'focus' ? 'Focus complete' : 'Break complete'
  const body = phase === 'focus' ? 'Your next break is ready.' : 'Ready for another focus session?'
  new window.Notification(title, { body, icon: '/icons/icon-192.png', tag: 'pomodoro-complete' })
}
