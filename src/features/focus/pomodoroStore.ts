import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

import {
  DEFAULT_POMODORO_DURATIONS,
  durationForPhase,
  nextPomodoroPhase,
  remainingTimerMs,
  type PomodoroDurations,
} from './timer'
import type { FocusPhase } from './types'

export type PomodoroStatus = 'idle' | 'running' | 'paused'

interface StartPomodoroInput {
  userId: string
  phase?: FocusPhase
  taskId?: string | null
  now?: number
}

export interface PomodoroStore extends PomodoroDurations {
  ownerUserId: string | null
  status: PomodoroStatus
  phase: FocusPhase
  startedAt: number | null
  pausedAt: number | null
  accumulatedPausedMs: number
  durationMs: number
  taskId: string | null
  cycleIndex: number
  configure: (durations: PomodoroDurations) => void
  selectPhase: (phase: FocusPhase) => void
  start: (input: StartPomodoroInput) => void
  pause: (now?: number) => void
  resume: (now?: number) => void
  finishPhase: () => void
  clear: () => void
}

const activeReset = {
  ownerUserId: null,
  status: 'idle' as const,
  startedAt: null,
  pausedAt: null,
  accumulatedPausedMs: 0,
  taskId: null,
}

const storeInitializer = (set: StoreApi<PomodoroStore>['setState']): PomodoroStore => ({
  ...DEFAULT_POMODORO_DURATIONS,
  ...activeReset,
  phase: 'focus',
  durationMs: DEFAULT_POMODORO_DURATIONS.focusMs,
  cycleIndex: 0,

  configure: (durations) => set((state) => state.status === 'idle' ? {
    ...durations,
    durationMs: durationForPhase(state.phase, durations),
  } : state),

  selectPhase: (phase) => set((state) => state.status === 'idle' ? {
    phase,
    durationMs: durationForPhase(phase, state),
    taskId: phase === 'focus' ? state.taskId : null,
  } : state),

  start: ({ userId, phase, taskId = null, now = Date.now() }) => set((state) => {
    const nextPhase = phase ?? state.phase
    return {
      ownerUserId: userId,
      status: 'running',
      phase: nextPhase,
      startedAt: now,
      pausedAt: null,
      accumulatedPausedMs: 0,
      durationMs: durationForPhase(nextPhase, state),
      taskId: nextPhase === 'focus' ? taskId : null,
    }
  }),

  pause: (now = Date.now()) => set((state) => (
    state.status === 'running' && state.startedAt !== null && remainingTimerMs(state, now) > 0
      ? { status: 'paused', pausedAt: now }
      : state
  )),

  resume: (now = Date.now()) => set((state) => (
    state.status === 'paused' && state.pausedAt !== null
      ? {
          status: 'running',
          accumulatedPausedMs: state.accumulatedPausedMs + Math.max(0, now - state.pausedAt),
          pausedAt: null,
        }
      : state
  )),

  finishPhase: () => set((state) => {
    const next = nextPomodoroPhase(state.phase, state.cycleIndex)
    return {
      ...activeReset,
      phase: next.phase,
      cycleIndex: next.cycleIndex,
      durationMs: durationForPhase(next.phase, state),
    }
  }),

  clear: () => set((state) => ({
    ...activeReset,
    phase: 'focus',
    cycleIndex: 0,
    durationMs: state.focusMs,
  })),
})

export const createPomodoroStore = (
  storage: StateStorage,
): UseBoundStore<StoreApi<PomodoroStore>> => create<PomodoroStore>()(persist(
  storeInitializer,
  {
    name: 'app.pomodoro.v1',
    version: 1,
    storage: createJSONStorage(() => storage),
    partialize: (state) => ({
      ownerUserId: state.ownerUserId,
      status: state.status,
      phase: state.phase,
      startedAt: state.startedAt,
      pausedAt: state.pausedAt,
      accumulatedPausedMs: state.accumulatedPausedMs,
      durationMs: state.durationMs,
      taskId: state.taskId,
      cycleIndex: state.cycleIndex,
      focusMs: state.focusMs,
      shortBreakMs: state.shortBreakMs,
      longBreakMs: state.longBreakMs,
    }),
  },
))

export const usePomodoroStore = createPomodoroStore(window.localStorage)
