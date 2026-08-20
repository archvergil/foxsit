import type { PomodoroDurations } from './timer'
import type { RewardFocusMode } from './types'

export interface RewardFocusPreset extends PomodoroDurations {
  label: string
  mode: RewardFocusMode
  stacks: number
}

export const rewardFocusPresets: RewardFocusPreset[] = [
  { label: '25 / 5', mode: '25_5', stacks: 3, focusMs: 25 * 60_000, shortBreakMs: 5 * 60_000, longBreakMs: 5 * 60_000 },
  { label: '30 / 5', mode: '30_5', stacks: 4, focusMs: 30 * 60_000, shortBreakMs: 5 * 60_000, longBreakMs: 5 * 60_000 },
  { label: '40 / 5', mode: '40_5', stacks: 5, focusMs: 40 * 60_000, shortBreakMs: 5 * 60_000, longBreakMs: 5 * 60_000 },
]

export const presetDurations = ({ focusMs, shortBreakMs, longBreakMs }: RewardFocusPreset): PomodoroDurations => ({
  focusMs,
  shortBreakMs,
  longBreakMs,
})

export const matchingRewardFocusMode = (durations: PomodoroDurations): RewardFocusMode | null =>
  rewardFocusPresets.find((preset) => (
    preset.focusMs === durations.focusMs
    && preset.shortBreakMs === durations.shortBreakMs
    && preset.longBreakMs === durations.longBreakMs
  ))?.mode ?? null
