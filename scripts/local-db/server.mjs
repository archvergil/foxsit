import process from 'node:process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

import { applyLocalMigrations } from './migrate.mjs'
import { createDatabaseAccess } from './database-access.mjs'
import { createLocalHttpServer } from './local-http-server.mjs'

const dataDirectory = fileURLToPath(new URL('../../.local-data/pglite/', import.meta.url))
await mkdir(dataDirectory, { recursive: true })

const database = new PGlite(dataDirectory)
await applyLocalMigrations(database, {
  log: (message) => process.stdout.write(`[local-db] ${message}\n`),
})

const server = new PGLiteSocketServer({
  db: database,
  host: '127.0.0.1',
  port: 55432,
  maxConnections: 8,
})
const databaseAccess = createDatabaseAccess(database)
const httpServer = createLocalHttpServer({
  database,
  ...databaseAccess,
  log: (message) => process.stderr.write(`[local-api] ${message}\n`),
})

await server.start()
await httpServer.start()
process.stdout.write('[local-db] PostgreSQL-compatible server is ready.\n')
process.stdout.write(`[local-db] ${server.getServerConn()}\n`)
process.stdout.write(`[local-api] ${httpServer.url}\n`)
process.stdout.write('[local-db] Data persists in .local-data/pglite. Press Ctrl+C to stop.\n')

let stopping = false
const stop = async () => {
  if (stopping) return
  stopping = true
  process.stdout.write('\n[local-db] Stopping...\n')
  await httpServer.stop()
  await server.stop()
  await database.close()
}

process.once('SIGINT', () => {
  void stop().finally(() => process.exit(0))
})

process.once('SIGTERM', () => {
  void stop().finally(() => process.exit(0))
})
