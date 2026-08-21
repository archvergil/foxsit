import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import { z } from 'zod'

import { LocalApiError, createLocalAuthService } from './local-auth.mjs'
import { createLocalDataService } from './local-data.mjs'

const allowedOrigins = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5174',
])

const readJson = async (request) => {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > 64 * 1024) throw new LocalApiError(413, 'The request is too large.')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new LocalApiError(400, 'The request body must be valid JSON.')
  }
}

const send = (response, status, body, origin) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
  })
  response.end(JSON.stringify(body))
}

const routeId = (pathname, prefix, suffix = '') => {
  const pattern = new RegExp(`^${prefix}/([0-9a-f-]{36})${suffix}$`, 'i')
  return pattern.exec(pathname)?.[1] ?? null
}

export const createLocalHttpServer = ({
  database,
  withDatabaseLock,
  withAuthenticatedUser,
  host = '127.0.0.1',
  port = 8787,
  log = () => undefined,
}) => {
  const auth = createLocalAuthService(database, withDatabaseLock)
  const data = createLocalDataService(database, withAuthenticatedUser)
  let boundPort = port

  const server = createServer(async (request, response) => {
    const origin = request.headers.origin
    if (origin && !allowedOrigins.has(origin)) {
      send(response, 403, { error: 'This local API only accepts the local development app.' })
      return
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        Vary: 'Origin',
      })
      response.end()
      return
    }

    try {
      const url = new URL(request.url ?? '/', `http://${host}:${port}`)
      const path = url.pathname
      const method = request.method ?? 'GET'
      let result

      if (method === 'GET' && path === '/health') result = { status: 'ok', database: 'pglite' }
      else if (method === 'POST' && path === '/v1/auth/signup') result = await auth.signup(await readJson(request))
      else if (method === 'POST' && path === '/v1/auth/signin') result = await auth.signin(await readJson(request))
      else if (method === 'GET' && path === '/v1/auth/session') result = await auth.restore(request)
      else if (method === 'POST' && path === '/v1/auth/signout') result = await auth.signout(request)
      else if (method === 'PATCH' && path === '/v1/auth/password') result = await auth.updatePassword(request, await readJson(request))
      else if (method === 'DELETE' && path === '/v1/auth/account') result = await auth.deleteAccount(request)
      else {
        const user = await auth.requireUser(request)
        const projectId = routeId(path, '/v1/projects')
        const taskId = routeId(path, '/v1/tasks')
        const taskStatusId = routeId(path, '/v1/tasks', '/status')
        const taskCalendarEventId = routeId(path, '/v1/tasks', '/calendar-event')
        const taskChecklistId = routeId(path, '/v1/tasks', '/checklist')
        const checklistId = routeId(path, '/v1/checklist')
        const calendarEventId = routeId(path, '/v1/calendar-events')
        const focusSessionId = routeId(path, '/v1/focus-sessions')
        const habitProjectId = routeId(path, '/v1/habit-projects')
        const habitId = routeId(path, '/v1/habits')
        const habitHistoryId = routeId(path, '/v1/habits', '/history')

        if (method === 'GET' && path === '/v1/profile') result = await data.profile(user.id)
        else if (method === 'PATCH' && path === '/v1/profile') result = await data.updateProfile(user.id, await readJson(request))
        else if (method === 'PATCH' && path === '/v1/profile/calendar') result = await data.updateCalendarPreferences(user.id, await readJson(request))
        else if (method === 'GET' && path === '/v1/projects') result = await data.listProjects(user.id, url.searchParams.get('includeArchived') === 'true')
        else if (method === 'POST' && path === '/v1/projects') result = await data.createProject(user.id, await readJson(request))
        else if (method === 'PATCH' && projectId) result = await data.updateProject(user.id, projectId, await readJson(request))
        else if (method === 'DELETE' && projectId) result = await data.deleteProject(user.id, projectId)
        else if (method === 'GET' && path === '/v1/tasks') result = await data.listTasks(user.id, Object.fromEntries(url.searchParams))
        else if (method === 'POST' && path === '/v1/tasks') result = await data.createTask(user.id, await readJson(request))
        else if (method === 'PATCH' && path === '/v1/tasks/reorder') result = await data.reorderTasks(user.id, await readJson(request))
        else if (method === 'PATCH' && taskStatusId) result = await data.setTaskStatus(user.id, taskStatusId, (await readJson(request)).status)
        else if (method === 'POST' && taskCalendarEventId) result = await data.convertTaskToCalendarEvent(user.id, taskCalendarEventId, await readJson(request))
        else if (method === 'GET' && taskChecklistId) result = await data.listChecklist(user.id, taskChecklistId)
        else if (method === 'PATCH' && taskId) result = await data.updateTask(user.id, taskId, await readJson(request))
        else if (method === 'DELETE' && taskId) result = await data.deleteTask(user.id, taskId)
        else if (method === 'POST' && path === '/v1/checklist') result = await data.createChecklist(user.id, await readJson(request))
        else if (method === 'PATCH' && checklistId) result = await data.updateChecklist(user.id, checklistId, await readJson(request))
        else if (method === 'DELETE' && checklistId) result = await data.deleteChecklist(user.id, checklistId)
        else if (method === 'GET' && path === '/v1/focus-sessions') {
          result = await data.listFocusSessions(user.id, Object.fromEntries(url.searchParams))
        }
        else if (method === 'POST' && path === '/v1/focus-sessions') {
          result = await data.createFocusSession(user.id, await readJson(request))
        }
        else if (method === 'DELETE' && focusSessionId) {
          result = await data.deleteFocusSession(user.id, focusSessionId)
        }
        else if (method === 'GET' && path === '/v1/calendar-events') {
          result = await data.listCalendarEvents(user.id, Object.fromEntries(url.searchParams))
        }
        else if (method === 'POST' && path === '/v1/calendar-events') {
          result = await data.createCalendarEvent(user.id, await readJson(request))
        }
        else if (method === 'PATCH' && calendarEventId) {
          result = await data.updateCalendarEvent(user.id, calendarEventId, await readJson(request))
        }
        else if (method === 'DELETE' && calendarEventId) {
          result = await data.deleteCalendarEvent(user.id, calendarEventId)
        }
        else if (method === 'GET' && path === '/v1/habits') {
          result = await data.listHabits(user.id, url.searchParams.get('includeInactive') === 'true')
        }
        else if (method === 'GET' && path === '/v1/habit-projects') {
          result = await data.listHabitProjects(user.id)
        }
        else if (method === 'POST' && path === '/v1/habit-projects') {
          result = await data.createHabitProject(user.id, await readJson(request))
        }
        else if (method === 'PATCH' && habitProjectId) {
          result = await data.updateHabitProject(user.id, habitProjectId, await readJson(request))
        }
        else if (method === 'DELETE' && habitProjectId) {
          result = await data.deleteHabitProject(user.id, habitProjectId)
        }
        else if (method === 'POST' && path === '/v1/habits') {
          result = await data.createHabit(user.id, await readJson(request))
        }
        else if (method === 'PATCH' && path === '/v1/habits/reorder') {
          result = await data.reorderHabits(user.id, await readJson(request))
        }
        else if (method === 'PATCH' && habitId) {
          result = await data.updateHabit(user.id, habitId, await readJson(request))
        }
        else if (method === 'DELETE' && habitHistoryId) result = await data.clearHabitHistory(user.id, habitHistoryId)
        else if (method === 'DELETE' && habitId) result = await data.deleteHabit(user.id, habitId)
        else if (method === 'GET' && path === '/v1/habit-logs') {
          result = await data.listHabitLogs(user.id, Object.fromEntries(url.searchParams))
        }
        else if (method === 'PUT' && path === '/v1/habit-logs') {
          result = await data.upsertHabitLog(user.id, await readJson(request))
        }
        else throw new LocalApiError(404, 'Local API route not found.')
      }

      send(response, 200, { data: result ?? null }, origin)
    } catch (error) {
      const status = error instanceof LocalApiError ? error.status : error instanceof z.ZodError ? 400 : 500
      const message = error instanceof LocalApiError
        ? error.message
        : error instanceof z.ZodError
          ? error.issues[0]?.message ?? 'The request is invalid.'
          : 'The local API could not complete the request.'
      if (status === 500) log(`Local API error: ${error instanceof Error ? error.message : String(error)}`)
      send(response, status, { error: message }, origin)
    }
  })

  return {
    start: () => new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, host, () => {
        server.off('error', reject)
        const address = server.address()
        if (address && typeof address === 'object') boundPort = address.port
        resolve()
      })
    }),
    stop: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    }),
    get url() { return `http://${host}:${boundPort}` },
  }
}
