import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url))
const bootstrapPath = fileURLToPath(new URL('./bootstrap.sql', import.meta.url))
const migrationsDirectory = fileURLToPath(
  new URL('../../supabase/migrations/', import.meta.url),
)

const checksum = (content) => createHash('sha256').update(content).digest('hex')

export async function applyLocalMigrations(database, options = {}) {
  const log = options.log ?? (() => undefined)
  await database.exec(await readFile(bootstrapPath, 'utf8'))
  await database.exec(`
    create table if not exists public.local_migration_history (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
  `)

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))

  const appliedResult = await database.query(
    'select filename, checksum from public.local_migration_history',
  )
  const applied = new Map(appliedResult.rows.map((row) => [row.filename, row.checksum]))

  for (const filename of migrationFiles) {
    const migrationUrl = new URL(`../../supabase/migrations/${filename}`, import.meta.url)
    const sql = await readFile(fileURLToPath(migrationUrl), 'utf8')
    const migrationChecksum = checksum(sql)
    const previousChecksum = applied.get(filename)

    if (previousChecksum && previousChecksum !== migrationChecksum) {
      throw new Error(
        `Local migration ${filename} changed after it was applied. Reset .local-data/pglite before continuing.`,
      )
    }
    if (previousChecksum) continue

    await database.transaction(async (transaction) => {
      await transaction.exec(sql)
      await transaction.query(
        'insert into public.local_migration_history (filename, checksum) values ($1, $2)',
        [filename, migrationChecksum],
      )
    })
    log(`Applied ${filename}`)
  }

  return { workspaceRoot, applied: migrationFiles }
}
