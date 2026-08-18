import { describe, expect, it } from 'vitest'

import {
  formatTimestampForInput,
  isIanaTimeZone,
  localDateTimeToTimestamp,
  localDateKey,
  resolveTimeZone,
} from './dates'

describe('timezone-aware local dates', () => {
  it('keeps local-day concepts in the requested IANA timezone', () => {
    const instant = new Date('2026-08-18T01:30:00.000Z')

    expect(localDateKey(instant, 'America/Sao_Paulo')).toBe('2026-08-17')
    expect(localDateKey(instant, 'Asia/Tokyo')).toBe('2026-08-18')
  })

  it('accepts valid IANA zones and rejects invalid profile values', () => {
    expect(isIanaTimeZone('America/Sao_Paulo')).toBe(true)
    expect(isIanaTimeZone('Not/A_Timezone')).toBe(false)
    expect(resolveTimeZone('UTC')).toBe('UTC')
  })
})

describe('profile-timezone task deadlines', () => {
  it('round-trips a local task deadline through an absolute timestamp', () => {
    const timestamp = localDateTimeToTimestamp('2026-08-18T01:30', 'America/Sao_Paulo')
    expect(timestamp).toBe('2026-08-18T04:30:00.000Z')
    expect(formatTimestampForInput(timestamp, 'America/Sao_Paulo')).toBe('2026-08-18T01:30')
  })

  it('rejects a wall-clock time skipped by daylight saving time', () => {
    expect(localDateTimeToTimestamp('2026-03-08T02:30', 'America/New_York')).toBeNull()
  })
})
