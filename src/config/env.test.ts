import { describe, expect, it } from 'vitest'

import { resolveSupabaseEnvironment } from './env'

describe('resolveSupabaseEnvironment', () => {
  it('accepts a complete public Supabase configuration', () => {
    expect(resolveSupabaseEnvironment('https://example.supabase.co', 'publishable-key')).toEqual({
      configured: true,
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
    })
  })

  it('does not fabricate configuration when a value is missing', () => {
    expect(resolveSupabaseEnvironment(undefined, 'publishable-key')).toEqual({
      configured: false,
      reason: 'Supabase environment variables are not configured.',
    })
  })

  it('rejects non-http URLs', () => {
    expect(resolveSupabaseEnvironment('not-a-url', 'publishable-key')).toEqual({
      configured: false,
      reason: 'VITE_SUPABASE_URL is not a valid URL.',
    })
  })
})
