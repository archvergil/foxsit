import { describe, expect, it, vi } from 'vitest'

import type { PomodoroStore } from './pomodoroStore'
import { persistCompletedTimerPhase } from './completeTimerPhase'

const timerSnapshot = (overrides: Partial<PomodoroStore> = {}) => ({
  phase: 'focus',
  startedAt: Date.now() - 60_000,
  pausedAt: null,
  accumulatedPausedMs: 0,
  durationMs: 60_000,
  taskId: null,
  rewardRunId: null,
  rewardRequiredStacks: 0,
  rewardCompletedStacks: 0,
  scheduledPhaseId: null,
  ...overrides,
}) as PomodoroStore

describe('persistCompletedTimerPhase', () => {
  it('settles a server-scheduled phase instead of creating a duplicate session', async () => {
    const saveSession = vi.fn()
    const settleScheduledPhase = vi.fn().mockResolvedValue({ id: 'session-1' })

    await persistCompletedTimerPhase({
      timer: timerSnapshot({ scheduledPhaseId: 'job-1' }),
      saveSession,
      settleScheduledPhase,
      completeRewardRun: vi.fn(),
    })

    expect(settleScheduledPhase).toHaveBeenCalledWith('job-1')
    expect(saveSession).not.toHaveBeenCalled()
  })

  it('keeps reward finalization idempotent after the last scheduled stack', async () => {
    const completeRewardRun = vi.fn()
    const completedRewardStack = await persistCompletedTimerPhase({
      timer: timerSnapshot({
        scheduledPhaseId: 'job-2',
        rewardRunId: 'run-1',
        rewardRequiredStacks: 3,
        rewardCompletedStacks: 2,
      }),
      saveSession: vi.fn(),
      settleScheduledPhase: vi.fn(),
      completeRewardRun,
    })

    expect(completedRewardStack).toBe(true)
    expect(completeRewardRun).toHaveBeenCalledWith('run-1')
  })
})
