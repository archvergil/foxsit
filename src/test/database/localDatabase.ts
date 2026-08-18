import { PGlite } from '@electric-sql/pglite'

import { applyLocalMigrations } from '../../../scripts/local-db/migrate.mjs'

export const createLocalTestDatabase = async () => {
  const database = new PGlite()
  await applyLocalMigrations(database)
  return database
}

export const createLocalUser = async (
  database: PGlite,
  user: { id: string; email: string; displayName?: string; timezone?: string },
) => {
  await database.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values ($1, $2, $3::jsonb)
    `,
    [
      user.id,
      user.email,
      JSON.stringify({
        display_name: user.displayName ?? 'Local tester',
        timezone: user.timezone ?? 'America/Sao_Paulo',
      }),
    ],
  )
}

export const authenticateLocalUser = async (database: PGlite, userId: string) => {
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [userId],
  )
  await database.exec('set role authenticated')
}

export const resetLocalRole = async (database: PGlite) => {
  await database.exec('reset role')
  await database.query("select set_config('request.jwt.claim.sub', '', false)")
}
