import { describe, expect, it } from 'vitest'

import { resolveBackendEnvironment } from './backend'

const missingSupabase = { configured: false, reason: 'Supabase is missing.' } as const

describe('resolveBackendEnvironment', () => {
  it('uses the loopback backend only in development', () => {
    expect(resolveBackendEnvironment({
      mode: 'development',
      localBackendUrl: 'http://127.0.0.1:8787',
      supabase: missingSupabase,
    })).toEqual({ mode: 'local', url: 'http://127.0.0.1:8787' })
  })

  it('never enables the local adapter in production', () => {
    expect(resolveBackendEnvironment({
      mode: 'production',
      localBackendUrl: 'http://127.0.0.1:8787',
      supabase: missingSupabase,
    })).toEqual({ mode: 'unconfigured', reason: 'Supabase is missing.' })
  })

  it('rejects a non-loopback local API', () => {
    expect(resolveBackendEnvironment({
      mode: 'development',
      localBackendUrl: 'https://example.com',
      supabase: missingSupabase,
    })).toEqual({
      mode: 'unconfigured',
      reason: 'VITE_LOCAL_BACKEND_URL must be a loopback HTTP URL.',
    })
  })
})
