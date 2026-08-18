import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { promisify } from 'node:util'
import { z } from 'zod'

const scryptAsync = promisify(scrypt)
const SESSION_DAYS = 30

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase())
const passwordSchema = z.string().min(8).max(128)
const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(60),
  timezone: z.string().trim().min(1).max(120).refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0))
      return true
    } catch {
      return false
    }
  }),
})
const signinSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) })

export class LocalApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'LocalApiError'
    this.status = status
  }
}

const tokenHash = (token) => createHash('sha256').update(token).digest('hex')

const passwordDigest = async (password, salt) => {
  const digest = await scryptAsync(password, Buffer.from(salt, 'base64'), 64)
  return Buffer.from(digest)
}

const createPassword = async (password) => {
  const salt = randomBytes(16).toString('base64')
  const hash = await passwordDigest(password, salt)
  return { salt, hash: hash.toString('base64') }
}

const verifyPassword = async (password, salt, storedHash) => {
  const actual = await passwordDigest(password, salt)
  const expected = Buffer.from(storedHash, 'base64')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const bearerToken = (request) => {
  const authorization = request.headers.authorization ?? ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null
}

export const createLocalAuthService = (database, withDatabaseLock) => {
  const createSession = async (userId) => {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    await database.query(
      `insert into local_dev.sessions (token_hash, user_id, expires_at) values ($1, $2, $3)`,
      [tokenHash(token), userId, expiresAt.toISOString()],
    )
    return { token, expiresAt: expiresAt.toISOString() }
  }

  const readUser = async (userId) => {
    const result = await database.query(
      `
        select u.id, u.email, u.raw_user_meta_data, p.display_name, p.timezone
        from auth.users u
        join public.profiles p on p.id = u.id
        where u.id = $1
      `,
      [userId],
    )
    const row = result.rows[0]
    if (!row) throw new LocalApiError(401, 'The local session is no longer valid.')
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      timezone: row.timezone,
      metadata: row.raw_user_meta_data,
    }
  }

  const sessionResponse = async (session) => ({
    accessToken: session.token,
    expiresAt: session.expiresAt,
    user: await readUser(session.userId),
  })

  const requireUser = async (request) => withDatabaseLock(async () => {
    const token = bearerToken(request)
    if (!token) throw new LocalApiError(401, 'Sign in to continue.')
    const result = await database.query(
      `
        select user_id, expires_at
        from local_dev.sessions
        where token_hash = $1 and expires_at > now()
      `,
      [tokenHash(token)],
    )
    const row = result.rows[0]
    if (!row) throw new LocalApiError(401, 'The local session expired. Sign in again.')
    return { id: row.user_id, token, expiresAt: isoDate(row.expires_at) }
  })

  return {
    signup: (input) => withDatabaseLock(async () => {
      const parsed = signupSchema.parse(input)
      const existing = await database.query(
        'select user_id from local_dev.accounts where email_normalized = $1',
        [parsed.email],
      )
      if (existing.rows.length > 0) {
        throw new LocalApiError(409, 'An account with this email already exists.')
      }

      const userId = randomUUID()
      const password = await createPassword(parsed.password)
      await database.transaction(async (transaction) => {
        await transaction.query(
          `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
          [
            userId,
            parsed.email,
            JSON.stringify({ display_name: parsed.displayName, timezone: parsed.timezone }),
          ],
        )
        await transaction.query(
          `
            insert into local_dev.accounts
              (user_id, email_normalized, password_salt, password_hash)
            values ($1, $2, $3, $4)
          `,
          [userId, parsed.email, password.salt, password.hash],
        )
      })
      const session = await createSession(userId)
      return sessionResponse({ ...session, userId })
    }),

    signin: (input) => withDatabaseLock(async () => {
      const parsed = signinSchema.parse(input)
      const result = await database.query(
        `
          select user_id, password_salt, password_hash
          from local_dev.accounts
          where email_normalized = $1
        `,
        [parsed.email],
      )
      const account = result.rows[0]
      if (!account || !await verifyPassword(parsed.password, account.password_salt, account.password_hash)) {
        throw new LocalApiError(401, 'Email or password is incorrect.')
      }
      const session = await createSession(account.user_id)
      return sessionResponse({ ...session, userId: account.user_id })
    }),

    restore: async (request) => {
      const authenticated = await requireUser(request)
      return withDatabaseLock(async () => sessionResponse({
        token: authenticated.token,
        expiresAt: authenticated.expiresAt,
        userId: authenticated.id,
      }))
    },

    signout: async (request) => {
      const token = bearerToken(request)
      if (!token) return
      await withDatabaseLock(() => database.query(
        'delete from local_dev.sessions where token_hash = $1',
        [tokenHash(token)],
      ))
    },

    updatePassword: async (request, input) => {
      const authenticated = await requireUser(request)
      const passwordValue = passwordSchema.parse(input?.password)
      const password = await createPassword(passwordValue)
      await withDatabaseLock(() => database.query(
        `update local_dev.accounts set password_salt = $1, password_hash = $2 where user_id = $3`,
        [password.salt, password.hash, authenticated.id],
      ))
    },

    deleteAccount: async (request) => {
      const authenticated = await requireUser(request)
      await withDatabaseLock(() => database.query(
        'delete from auth.users where id = $1',
        [authenticated.id],
      ))
    },

    requireUser,
  }
}

const isoDate = (value) => value instanceof Date ? value.toISOString() : value
