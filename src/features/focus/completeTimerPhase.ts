import type { PomodoroStore } from './pomodoroStore'
import { sessionFromTimer } from './timer'
import type { CreateFocusSessionInput } from './types'

export async function persistCompletedTimerPhase({
  timer,
  now = Date.now(),
  saveSession,
  completeRewardRun,
}: {
  timer: PomodoroStore
  now?: number
  saveSession: (input: CreateFocusSessionInput) => Promise<unknown>
  completeRewardRun: (runId: string) => Promise<unknown>
}) {
  const input = sessionFromTimer(timer, now, true)
  if (input) await saveSession(input)

  const completedRewardStack = timer.phase === 'focus' && Boolean(timer.rewardRunId)
  const completesRewardRun = completedRewardStack
    && timer.rewardRunId
    && timer.rewardCompletedStacks + 1 >= timer.rewardRequiredStacks

  if (completesRewardRun && timer.rewardRunId) await completeRewardRun(timer.rewardRunId)
  return completedRewardStack
}
