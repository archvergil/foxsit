import { describe, expect, it } from 'vitest'

import { matchingRewardFocusMode } from './rewardFocusModes'

describe('rewarded Focus mode selection', () => {
  it('restores the matching preset instead of defaulting a custom duration to 25 / 5', () => {
    expect(matchingRewardFocusMode({ focusMs: 30 * 60_000, shortBreakMs: 5 * 60_000, longBreakMs: 5 * 60_000 })).toBe('30_5')
    expect(matchingRewardFocusMode({ focusMs: 30 * 60_000, shortBreakMs: 7 * 60_000, longBreakMs: 5 * 60_000 })).toBeNull()
  })
})
