import type { PGlite } from '@electric-sql/pglite'

export function applyLocalMigrations(
  database: PGlite,
  options?: { log?: (message: string) => void },
): Promise<{ workspaceRoot: string; applied: string[] }>
