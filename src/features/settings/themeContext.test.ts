import { describe, expect, it } from 'vitest'

import { isThemePreference } from './themeContext'

describe('isThemePreference', () => {
  it.each(['light', 'dark', 'system'])('accepts %s', (preference) => {
    expect(isThemePreference(preference)).toBe(true)
  })

  it.each([null, '', 'automatic', 'purple'])('rejects %s', (preference) => {
    expect(isThemePreference(preference)).toBe(false)
  })
})
