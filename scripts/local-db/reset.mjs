import process from 'node:process'
import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url))
const localDataRoot = resolve(workspaceRoot, '.local-data')
const databaseDirectory = resolve(localDataRoot, 'pglite')

if (dirname(databaseDirectory) !== localDataRoot) {
  throw new Error(`Refusing to remove an unexpected path: ${databaseDirectory}`)
}

await rm(databaseDirectory, { recursive: true, force: true })
process.stdout.write(`[local-db] Removed ${databaseDirectory}. The next start will reapply migrations.\n`)
