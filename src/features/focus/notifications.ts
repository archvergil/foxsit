import type { FocusPhase } from './types'

export const notificationAvailability = () => {
  if (!('Notification' in window)) return 'unavailable' as const
  return window.Notification.permission
}

export const requestFocusNotifications = async () => {
  if (!('Notification' in window)) return 'unavailable' as const
  return window.Notification.requestPermission()
}

export const notifyPhaseComplete = async (phase: FocusPhase) => {
  if (!('Notification' in window) || window.Notification.permission !== 'granted') return
  const title = phase === 'focus' ? 'Focus complete' : 'Break complete'
  const body = phase === 'focus' ? 'Your next break is ready.' : 'Ready for another focus session?'
  const options = { body, icon: '/icons/app-icon.png', tag: 'pomodoro-complete' }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
    return
  }

  new window.Notification(title, options)
}
