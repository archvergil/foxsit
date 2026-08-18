import { supabaseEnvironment, type SupabaseEnvironment } from './env'

export type BackendEnvironment =
  | { mode: 'local'; url: string }
  | ({ mode: 'supabase' } & Extract<SupabaseEnvironment, { configured: true }>)
  | { mode: 'unconfigured'; reason: string }

const localUrl = (value: string | undefined) => {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

export const resolveBackendEnvironment = ({
  mode,
  localBackendUrl,
  supabase,
}: {
  mode: string
  localBackendUrl: string | undefined
  supabase: SupabaseEnvironment
}): BackendEnvironment => {
  if (mode === 'development' && localBackendUrl) {
    const url = localUrl(localBackendUrl)
    return url
      ? { mode: 'local', url }
      : { mode: 'unconfigured', reason: 'VITE_LOCAL_BACKEND_URL must be a loopback HTTP URL.' }
  }
  return supabase.configured
    ? { mode: 'supabase', ...supabase }
    : { mode: 'unconfigured', reason: supabase.reason }
}

export const backendEnvironment = resolveBackendEnvironment({
  mode: import.meta.env.MODE,
  localBackendUrl: import.meta.env.DEV ? import.meta.env.VITE_LOCAL_BACKEND_URL : undefined,
  supabase: supabaseEnvironment,
})
