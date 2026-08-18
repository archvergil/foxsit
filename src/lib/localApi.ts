import type { Session } from '@supabase/supabase-js'

const TOKEN_KEY = 'app.local-session-token'

interface LocalUser {
  id: string
  email: string
  displayName: string | null
  timezone: string
  metadata: Record<string, unknown>
}

interface LocalSession {
  accessToken: string
  expiresAt: string
  user: LocalUser
}

export class LocalApiClientError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'LocalApiClientError'
  }
}

const toSession = (local: LocalSession): Session => {
  const expiresAt = Math.floor(new Date(local.expiresAt).getTime() / 1000)
  return {
    access_token: local.accessToken,
    refresh_token: local.accessToken,
    expires_at: expiresAt,
    expires_in: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
    token_type: 'bearer',
    user: {
      id: local.user.id,
      email: local.user.email,
      app_metadata: { provider: 'local', providers: ['local'] },
      user_metadata: {
        ...local.user.metadata,
        display_name: local.user.displayName,
        timezone: local.user.timezone,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  }
}

export class LocalApiClient {
  constructor(readonly baseUrl: string) {}

  private token() {
    return window.localStorage.getItem(TOKEN_KEY)
  }

  private async request<T>(path: string, init: RequestInit = {}, authenticate = true): Promise<T> {
    const token = this.token()
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticate && token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
    const payload = await response.json() as { data?: T; error?: string }
    if (!response.ok) {
      throw new LocalApiClientError(payload.error ?? 'The local server request failed.', response.status)
    }
    return payload.data as T
  }

  async getSession(): Promise<Session | null> {
    if (!this.token()) return null
    try {
      return toSession(await this.request<LocalSession>('/v1/auth/session'))
    } catch (error) {
      if (error instanceof LocalApiClientError && error.status === 401) {
        window.localStorage.removeItem(TOKEN_KEY)
        return null
      }
      throw error
    }
  }

  async signUp(email: string, password: string, displayName: string, timezone: string) {
    const session = await this.request<LocalSession>('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, timezone }),
    }, false)
    window.localStorage.setItem(TOKEN_KEY, session.accessToken)
    return toSession(session)
  }

  async signIn(email: string, password: string) {
    const session = await this.request<LocalSession>('/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false)
    window.localStorage.setItem(TOKEN_KEY, session.accessToken)
    return toSession(session)
  }

  async signOut() {
    try {
      if (this.token()) await this.request<null>('/v1/auth/signout', { method: 'POST' })
    } finally {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  }

  async updatePassword(password: string) {
    await this.request<null>('/v1/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    })
  }

  requestPasswordReset(): Promise<never> {
    return Promise.reject(new Error(
      'Email recovery is unavailable in local mode. Sign in with the local account or create another one.',
    ))
  }

  get<T>(path: string) { return this.request<T>(path) }
  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
  }
  async delete(path: string) {
    await this.request<null>(path, { method: 'DELETE' })
  }
}
