export interface WorkoutRestTimerSnapshot {
  startedAt: number | null
  durationMs: number
}

export const remainingWorkoutRestMs = (
  timer: WorkoutRestTimerSnapshot,
  now = Date.now(),
) => timer.startedAt === null
  ? 0
  : Math.max(0, timer.durationMs - Math.max(0, now - timer.startedAt))

export const formatWorkoutDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
