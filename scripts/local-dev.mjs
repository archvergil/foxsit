import { spawn } from 'node:child_process'
import process from 'node:process'

const children = [
  spawn(process.execPath, ['./scripts/local-db/server.mjs'], { stdio: 'inherit' }),
  spawn(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    { stdio: 'inherit' },
  ),
]

let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

for (const child of children) {
  child.once('exit', (code) => {
    if (!stopping) {
      stop()
      process.exitCode = code ?? 0
    }
  })
}

process.once('SIGINT', stop)
process.once('SIGTERM', stop)
