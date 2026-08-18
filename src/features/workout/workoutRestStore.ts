import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export interface WorkoutRestStore {
  ownerUserId: string | null
  sessionId: string | null
  exerciseName: string | null
  startedAt: number | null
  durationMs: number
  start: (input: {
    userId: string
    sessionId: string
    exerciseName: string
    durationSeconds: number
    now?: number
  }) => void
  clear: () => void
}

const emptyRestTimer = {
  ownerUserId: null,
  sessionId: null,
  exerciseName: null,
  startedAt: null,
  durationMs: 0,
}

const initializer = (set: StoreApi<WorkoutRestStore>['setState']): WorkoutRestStore => ({
  ...emptyRestTimer,
  start: ({ userId, sessionId, exerciseName, durationSeconds, now = Date.now() }) => set({
    ownerUserId: userId,
    sessionId,
    exerciseName,
    startedAt: now,
    durationMs: Math.max(0, durationSeconds) * 1000,
  }),
  clear: () => set(emptyRestTimer),
})

export const createWorkoutRestStore = (
  storage: StateStorage,
): UseBoundStore<StoreApi<WorkoutRestStore>> => create<WorkoutRestStore>()(persist(
  initializer,
  {
    name: 'app.workout-rest.v1',
    version: 1,
    storage: createJSONStorage(() => storage),
    partialize: ({ ownerUserId, sessionId, exerciseName, startedAt, durationMs }) => ({
      ownerUserId,
      sessionId,
      exerciseName,
      startedAt,
      durationMs,
    }),
  },
))

export const useWorkoutRestStore = createWorkoutRestStore(window.localStorage)
