export type SupabaseEnvironment =
  | { configured: true; url: string; publishableKey: string }
  | { configured: false; reason: string }

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export const resolveSupabaseEnvironment = (
  url: string | undefined,
  publishableKey: string | undefined,
): SupabaseEnvironment => {
  if (!url || !publishableKey) {
    return {
      configured: false,
      reason: 'Supabase environment variables are not configured.',
    }
  }

  if (!isHttpUrl(url)) {
    return { configured: false, reason: 'VITE_SUPABASE_URL is not a valid URL.' }
  }

  return { configured: true, url, publishableKey }
}

export const supabaseEnvironment = resolveSupabaseEnvironment(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
