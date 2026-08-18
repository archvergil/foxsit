import { z } from 'zod'

import { LocalApiError } from './local-auth.mjs'

const uuid = z.string().uuid()
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timestamp = z.string().datetime({ offset: true })
const color = z.enum(['mint', 'coral', 'blue', 'sand', 'slate'])
const priority = z.enum(['none', 'low', 'medium', 'high'])
const status = z.enum(['open', 'completed', 'archived'])
const focusPhase = z.enum(['focus', 'short_break', 'long_break'])
const calendarColor = z.enum(['mint', 'coral', 'blue', 'sand', 'slate'])

const projectCreate = z.object({
  name: z.string().trim().min(1).max(120),
  colorToken: color.default('mint'),
  icon: z.string().trim().min(1).max(80).nullable().optional(),
  position: z.number().nonnegative().optional(),
})
const projectUpdate = projectCreate.partial().extend({ archivedAt: timestamp.nullable().optional() })
const taskCreate = z.object({
  title: z.string().trim().min(1).max(500),
  projectId: uuid.nullable().optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
  priority: priority.default('none'),
  scheduledDate: localDate.nullable().optional(),
  dueAt: timestamp.nullable().optional(),
  estimateMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  position: z.number().nonnegative().optional(),
})
const taskUpdate = taskCreate.partial()
const checklistCreate = z.object({
  taskId: uuid,
  title: z.string().trim().min(1).max(500),
  position: z.number().nonnegative().optional(),
})
const checklistUpdate = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  position: z.number().nonnegative().optional(),
})
const taskOrder = z.object({
  orderedTaskIds: z.array(uuid).min(1).max(10_000).refine(
    (ids) => new Set(ids).size === ids.length,
    'Task order cannot contain duplicates.',
  ),
})
const habitOrder = z.object({
  orderedHabitIds: z.array(uuid).min(1).max(10_000).refine(
    (ids) => new Set(ids).size === ids.length,
    'Habit order cannot contain duplicates.',
  ),
})
const focusSessionCreate = z.object({
  taskId: uuid.nullable().optional(),
  startedAt: timestamp,
  endedAt: timestamp,
  plannedSeconds: z.number().int().min(1).max(86_400),
  focusedSeconds: z.number().int().min(0).max(86_400),
  sessionType: focusPhase,
  completed: z.boolean(),
})
const calendarEventInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).nullable(),
  allDay: z.boolean(),
  startAt: timestamp.nullable(),
  endAt: timestamp.nullable(),
  startDate: localDate.nullable(),
  endDate: localDate.nullable(),
  category: z.string().trim().min(1).max(120).nullable(),
  colorToken: calendarColor,
  location: z.string().trim().min(1).max(240).nullable(),
}).superRefine((event, context) => {
  if (event.allDay) {
    if (!event.startDate || !event.endDate || event.startAt || event.endAt) {
      context.addIssue({ code: 'custom', message: 'All-day events require dates only.' })
    } else if (event.endDate < event.startDate) {
      context.addIssue({ code: 'custom', message: 'End date cannot be before start date.' })
    }
  } else if (!event.startAt || !event.endAt || event.startDate || event.endDate) {
    context.addIssue({ code: 'custom', message: 'Timed events require timestamps only.' })
  } else if (new Date(event.endAt).getTime() <= new Date(event.startAt).getTime()) {
    context.addIssue({ code: 'custom', message: 'End time must be after start time.' })
  }
})
const calendarRange = z.object({
  rangeStart: timestamp,
  rangeEnd: timestamp,
  localDateStart: localDate,
  localDateEnd: localDate,
})
const habitInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).nullable(),
  icon: z.string().trim().min(1).max(80),
  colorToken: color,
  scheduleType: z.enum(['daily', 'weekdays']),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullable(),
  targetCount: z.number().int().min(1).max(10_000),
  unit: z.string().trim().min(1).max(40).nullable(),
  position: z.number().min(0),
  isActive: z.boolean(),
}).superRefine((habit, context) => {
  if (habit.scheduleType === 'daily' && habit.weekdays !== null) {
    context.addIssue({ code: 'custom', message: 'Daily habits cannot specify weekdays.' })
  }
  if (habit.scheduleType === 'weekdays' && (!habit.weekdays || new Set(habit.weekdays).size !== habit.weekdays.length)) {
    context.addIssue({ code: 'custom', message: 'Choose unique weekdays.' })
  }
})
const habitLogInput = z.object({
  habitId: uuid,
  localDate,
  count: z.number().int().min(0),
  status: z.enum(['in_progress', 'completed', 'skipped']),
  note: z.string().max(1000).nullable(),
})
const habitLogRange = z.object({
  dateStart: localDate,
  dateEnd: localDate,
  habitId: uuid.optional(),
})

const iso = (value) => value instanceof Date ? value.toISOString() : value
const dateKey = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value
const number = (value) => typeof value === 'number' ? value : Number(value)

const mapProject = (row) => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  colorToken: row.color_token,
  icon: row.icon,
  position: number(row.position),
  archivedAt: iso(row.archived_at),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
})

const mapTask = (row) => ({
  id: row.id,
  userId: row.user_id,
  projectId: row.project_id,
  title: row.title,
  notes: row.notes,
  status: row.status,
  priority: row.priority,
  scheduledDate: dateKey(row.scheduled_date),
  dueAt: iso(row.due_at),
  estimateMinutes: row.estimate_minutes,
  position: number(row.position),
  completedAt: iso(row.completed_at),
  archivedAt: iso(row.archived_at),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
})

const mapChecklist = (row) => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.task_id,
  title: row.title,
  completed: row.completed,
  position: number(row.position),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
})

const mapFocusSession = (row) => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.task_id,
  startedAt: iso(row.started_at),
  endedAt: iso(row.ended_at),
  plannedSeconds: row.planned_seconds,
  focusedSeconds: row.focused_seconds,
  sessionType: row.session_type,
  completed: row.completed,
  createdAt: iso(row.created_at),
})

const mapCalendarEvent = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  allDay: row.all_day,
  startAt: iso(row.start_at),
  endAt: iso(row.end_at),
  startDate: dateKey(row.start_date),
  endDate: dateKey(row.end_date),
  category: row.category,
  colorToken: row.color_token,
  location: row.location,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
})

const mapHabit = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  icon: row.icon,
  colorToken: row.color_token,
  scheduleType: row.schedule_type,
  weekdays: row.weekdays,
  targetCount: row.target_count,
  unit: row.unit,
  position: number(row.position),
  isActive: row.is_active,
  archivedAt: iso(row.archived_at),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
})

const mapHabitLog = (row) => ({
  id: row.id,
  userId: row.user_id,
  habitId: row.habit_id,
  localDate: dateKey(row.local_date),
  count: row.count,
  status: row.status,
  note: row.note,
  source: row.source,
  sourceId: row.source_id,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
})

const updateStatement = (table, idColumn, id, userId, input, fields) => {
  const entries = Object.entries(fields).filter(([key]) => input[key] !== undefined)
  if (entries.length === 0) throw new LocalApiError(400, 'Provide at least one change.')
  const values = entries.map(([key]) => input[key])
  const assignments = entries.map(([, column], index) => `${column} = $${index + 1}`)
  values.push(id, userId)
  return {
    sql: `update public.${table} set ${assignments.join(', ')} where ${idColumn} = $${values.length - 1} and user_id = $${values.length} returning *`,
    values,
  }
}

const one = (result, action) => {
  const row = result.rows[0]
  if (!row) throw new LocalApiError(404, `Could not ${action}: the record was not found.`)
  return row
}

export const createLocalDataService = (database, withAuthenticatedUser) => ({
  profile: (userId) => withAuthenticatedUser(userId, async () => {
    const result = await database.query('select * from public.profiles where id = $1', [userId])
    const row = one(result, 'load profile preferences')
    return {
      id: row.id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      timezone: row.timezone,
      week_starts_on: row.week_starts_on,
      theme: row.theme,
      created_at: iso(row.created_at),
      updated_at: iso(row.updated_at),
    }
  }),

  listProjects: (userId, includeArchived) => withAuthenticatedUser(userId, async () => {
    const result = await database.query(
      `select * from public.task_projects where user_id = $1 ${includeArchived ? '' : 'and archived_at is null'} order by position`,
      [userId],
    )
    return result.rows.map(mapProject)
  }),

  createProject: (userId, input) => withAuthenticatedUser(userId, async () => {
    const value = projectCreate.parse(input)
    const result = await database.query(
      `insert into public.task_projects (user_id, name, color_token, icon, position) values ($1, $2, $3, $4, $5) returning *`,
      [userId, value.name, value.colorToken, value.icon ?? null, value.position ?? 1000],
    )
    return mapProject(one(result, 'create the project'))
  }),

  updateProject: (userId, projectId, input) => withAuthenticatedUser(userId, async () => {
    const value = projectUpdate.parse(input)
    const statement = updateStatement('task_projects', 'id', projectId, userId, value, {
      name: 'name', colorToken: 'color_token', icon: 'icon', position: 'position', archivedAt: 'archived_at',
    })
    return mapProject(one(await database.query(statement.sql, statement.values), 'update the project'))
  }),

  deleteProject: (userId, projectId) => withAuthenticatedUser(userId, async () => {
    const result = await database.query(
      'delete from public.task_projects where id = $1 and user_id = $2 returning id',
      [projectId, userId],
    )
    one(result, 'delete the project')
  }),

  listTasks: (userId, filters) => withAuthenticatedUser(userId, async () => {
    const clauses = ['user_id = $1']
    const values = [userId]
    const add = (sql, value) => {
      values.push(value)
      clauses.push(sql.replace('?', `$${values.length}`))
    }
    if (filters.status) add('status = ?', status.parse(filters.status))
    if (filters.projectId === 'null') clauses.push('project_id is null')
    else if (filters.projectId) add('project_id = ?', uuid.parse(filters.projectId))
    if (filters.scheduledDate) add('scheduled_date = ?::date', localDate.parse(filters.scheduledDate))
    if (filters.scheduledAfter) add('scheduled_date > ?::date', localDate.parse(filters.scheduledAfter))
    if (filters.scheduledBefore) add('scheduled_date <= ?::date', localDate.parse(filters.scheduledBefore))
    if (filters.dueBefore) add('due_at <= ?::timestamptz', timestamp.parse(filters.dueBefore))
    const order = filters.status === 'completed'
      ? 'completed_at desc nulls last'
      : filters.scheduledAfter || filters.scheduledBefore
        ? 'scheduled_date, position'
        : 'position'
    const result = await database.query(
      `select * from public.tasks where ${clauses.join(' and ')} order by ${order}`,
      values,
    )
    return result.rows.map(mapTask)
  }),

  createTask: (userId, input) => withAuthenticatedUser(userId, async () => {
    const value = taskCreate.parse(input)
    const result = await database.query(
      `
        insert into public.tasks
          (user_id, title, project_id, notes, priority, scheduled_date, due_at, estimate_minutes, position)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *
      `,
      [userId, value.title, value.projectId ?? null, value.notes ?? null, value.priority,
        value.scheduledDate ?? null, value.dueAt ?? null, value.estimateMinutes ?? null,
        value.position ?? Date.now()],
    )
    return mapTask(one(result, 'create the task'))
  }),

  updateTask: (userId, taskId, input) => withAuthenticatedUser(userId, async () => {
    const value = taskUpdate.parse(input)
    const statement = updateStatement('tasks', 'id', taskId, userId, value, {
      title: 'title', projectId: 'project_id', notes: 'notes', priority: 'priority',
      scheduledDate: 'scheduled_date', dueAt: 'due_at', estimateMinutes: 'estimate_minutes',
      position: 'position',
    })
    return mapTask(one(await database.query(statement.sql, statement.values), 'update the task'))
  }),

  setTaskStatus: (userId, taskId, nextStatus) => withAuthenticatedUser(userId, async () => {
    const value = status.parse(nextStatus)
    const result = await database.query(
      `
        update public.tasks
        set status = $1,
            completed_at = case when $1 = 'completed' then coalesce(completed_at, now()) else null end,
            archived_at = case when $1 = 'archived' then coalesce(archived_at, now()) else null end
        where id = $2 and user_id = $3 returning *
      `,
      [value, taskId, userId],
    )
    return mapTask(one(result, 'change the task status'))
  }),

  deleteTask: (userId, taskId) => withAuthenticatedUser(userId, async () => {
    one(await database.query(
      'delete from public.tasks where id = $1 and user_id = $2 returning id',
      [taskId, userId],
    ), 'delete the task')
  }),

  reorderTasks: (userId, input) => withAuthenticatedUser(userId, async () => {
    const { orderedTaskIds } = taskOrder.parse(input)
    const count = await database.query(
      `select count(*)::integer as count from public.tasks where user_id = $1 and status = 'open'`,
      [userId],
    )
    if (count.rows[0]?.count !== orderedTaskIds.length) {
      throw new LocalApiError(409, 'Task order is stale. Reload the list and try again.')
    }
    const result = await database.query(
      `
        with requested as (
          select id, ordinality
          from unnest($1::uuid[]) with ordinality as ordered(id, ordinality)
        ),
        updated as (
          update public.tasks as task
          set position = requested.ordinality * 1000
          from requested
          where task.id = requested.id and task.user_id = $2 and task.status = 'open'
          returning task.*
        )
        select * from updated order by position
      `,
      [orderedTaskIds, userId],
    )
    if (result.rows.length !== orderedTaskIds.length) {
      throw new LocalApiError(409, 'Task order is stale or contains inaccessible tasks.')
    }
    return result.rows.map(mapTask)
  }),

  listChecklist: (userId, taskId) => withAuthenticatedUser(userId, async () => {
    const result = await database.query(
      'select * from public.task_checklist_items where task_id = $1 and user_id = $2 order by position',
      [taskId, userId],
    )
    return result.rows.map(mapChecklist)
  }),

  createChecklist: (userId, input) => withAuthenticatedUser(userId, async () => {
    const value = checklistCreate.parse(input)
    const result = await database.query(
      `insert into public.task_checklist_items (user_id, task_id, title, position) values ($1, $2, $3, $4) returning *`,
      [userId, value.taskId, value.title, value.position ?? 1000],
    )
    return mapChecklist(one(result, 'create the checklist item'))
  }),

  updateChecklist: (userId, itemId, input) => withAuthenticatedUser(userId, async () => {
    const value = checklistUpdate.parse(input)
    const statement = updateStatement('task_checklist_items', 'id', itemId, userId, value, {
      title: 'title', completed: 'completed', position: 'position',
    })
    return mapChecklist(one(await database.query(statement.sql, statement.values), 'update the checklist item'))
  }),

  deleteChecklist: (userId, itemId) => withAuthenticatedUser(userId, async () => {
    one(await database.query(
      'delete from public.task_checklist_items where id = $1 and user_id = $2 returning id',
      [itemId, userId],
    ), 'delete the checklist item')
  }),

  listFocusSessions: (userId, filters) => withAuthenticatedUser(userId, async () => {
    const clauses = ['user_id = $1']
    const values = [userId]
    const add = (sql, value) => {
      values.push(value)
      clauses.push(sql.replace('?', `$${values.length}`))
    }
    if (filters.startedAfter) add('started_at >= ?::timestamptz', timestamp.parse(filters.startedAfter))
    if (filters.startedBefore) add('started_at <= ?::timestamptz', timestamp.parse(filters.startedBefore))
    if (filters.taskId) add('task_id = ?', uuid.parse(filters.taskId))
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(filters.limit)
    values.push(limit)
    const result = await database.query(
      `select * from public.focus_sessions where ${clauses.join(' and ')} order by started_at desc limit $${values.length}`,
      values,
    )
    return result.rows.map(mapFocusSession)
  }),

  createFocusSession: (userId, input) => withAuthenticatedUser(userId, async () => {
    const value = focusSessionCreate.parse(input)
    const result = await database.query(
      `
        select * from public.record_focus_session(null, $1, $2, $3, $4, $5, $6, $7)
      `,
      [value.taskId ?? null, value.startedAt, value.endedAt, value.plannedSeconds,
        value.focusedSeconds, value.sessionType, value.completed],
    )
    return mapFocusSession(one(result, 'save the focus session'))
  }),

  listCalendarEvents: (userId, input) => withAuthenticatedUser(userId, async () => {
    const range = calendarRange.parse(input)
    const result = await database.query(
      `
        select * from public.calendar_events
        where user_id = $1
          and (
            (not all_day and start_at < $2::timestamptz and end_at > $3::timestamptz)
            or
            (all_day and start_date <= $4::date and end_date >= $5::date)
          )
        order by coalesce(start_at, start_date::timestamp), title
      `,
      [userId, range.rangeEnd, range.rangeStart, range.localDateEnd, range.localDateStart],
    )
    return result.rows.map(mapCalendarEvent)
  }),

  createCalendarEvent: (userId, input) => withAuthenticatedUser(userId, async () => {
    const event = calendarEventInput.parse(input)
    const result = await database.query(
      `
        insert into public.calendar_events
          (user_id, title, description, all_day, start_at, end_at, start_date, end_date, category, color_token, location)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        returning *
      `,
      [userId, event.title, event.description, event.allDay, event.startAt, event.endAt,
        event.startDate, event.endDate, event.category, event.colorToken, event.location],
    )
    return mapCalendarEvent(one(result, 'create the calendar event'))
  }),

  updateCalendarEvent: (userId, eventId, input) => withAuthenticatedUser(userId, async () => {
    const event = calendarEventInput.parse(input)
    const result = await database.query(
      `
        update public.calendar_events
        set title = $1, description = $2, all_day = $3, start_at = $4, end_at = $5,
            start_date = $6, end_date = $7, category = $8, color_token = $9, location = $10
        where id = $11 and user_id = $12
        returning *
      `,
      [event.title, event.description, event.allDay, event.startAt, event.endAt,
        event.startDate, event.endDate, event.category, event.colorToken, event.location, eventId, userId],
    )
    return mapCalendarEvent(one(result, 'update the calendar event'))
  }),

  deleteCalendarEvent: (userId, eventId) => withAuthenticatedUser(userId, async () => {
    one(await database.query(
      'delete from public.calendar_events where id = $1 and user_id = $2 returning id',
      [eventId, userId],
    ), 'delete the calendar event')
  }),

  listHabits: (userId, includeInactive) => withAuthenticatedUser(userId, async () => {
    const result = await database.query(
      `select * from public.habits where user_id = $1 ${includeInactive ? '' : 'and is_active'}
       order by position, created_at`,
      [userId],
    )
    return result.rows.map(mapHabit)
  }),

  createHabit: (userId, input) => withAuthenticatedUser(userId, async () => {
    const habit = habitInput.parse(input)
    const result = await database.query(
      `insert into public.habits
        (user_id, title, description, icon, color_token, schedule_type, weekdays, target_count, unit, position, is_active)
       values ($1, $2, $3, $4, $5, $6, $7::smallint[], $8, $9, $10, $11) returning *`,
      [userId, habit.title, habit.description, habit.icon, habit.colorToken, habit.scheduleType,
        habit.weekdays, habit.targetCount, habit.unit, habit.position, habit.isActive],
    )
    return mapHabit(one(result, 'create the habit'))
  }),

  updateHabit: (userId, habitId, input) => withAuthenticatedUser(userId, async () => {
    const habit = habitInput.parse(input)
    const result = await database.query(
      `update public.habits
       set title = $1, description = $2, icon = $3, color_token = $4, schedule_type = $5,
           weekdays = $6::smallint[], target_count = $7, unit = $8, position = $9, is_active = $10
       where id = $11 and user_id = $12 returning *`,
      [habit.title, habit.description, habit.icon, habit.colorToken, habit.scheduleType,
        habit.weekdays, habit.targetCount, habit.unit, habit.position, habit.isActive, habitId, userId],
    )
    return mapHabit(one(result, 'update the habit'))
  }),

  deleteHabit: (userId, habitId) => withAuthenticatedUser(userId, async () => {
    one(await database.query(
      'delete from public.habits where id = $1 and user_id = $2 returning id',
      [habitId, userId],
    ), 'delete the habit')
  }),

  reorderHabits: (userId, input) => withAuthenticatedUser(userId, async () => {
    const { orderedHabitIds } = habitOrder.parse(input)
    await database.query('begin')
    try {
      const owned = await database.query(
        'select id from public.habits where user_id = $1 and is_active order by position, created_at for update',
        [userId],
      )
      const ownedIds = new Set(owned.rows.map(({ id }) => id))
      if (ownedIds.size !== orderedHabitIds.length || orderedHabitIds.some((id) => !ownedIds.has(id))) {
        throw new LocalApiError(409, 'Habit order is stale or contains inaccessible habits.')
      }
      for (const [index, habitId] of orderedHabitIds.entries()) {
        await database.query(
          'update public.habits set position = $1 where id = $2 and user_id = $3 and is_active',
          [(index + 1) * 1000, habitId, userId],
        )
      }
      await database.query('commit')
    } catch (error) {
      await database.query('rollback')
      throw error
    }
    const result = await database.query(
      'select * from public.habits where user_id = $1 and is_active order by position, created_at',
      [userId],
    )
    return result.rows.map(mapHabit)
  }),

  listHabitLogs: (userId, input) => withAuthenticatedUser(userId, async () => {
    const range = habitLogRange.parse(input)
    const values = [userId, range.dateStart, range.dateEnd]
    const habitClause = range.habitId ? 'and habit_id = $4' : ''
    if (range.habitId) values.push(range.habitId)
    const result = await database.query(
      `select * from public.habit_logs
       where user_id = $1 and local_date >= $2::date and local_date <= $3::date ${habitClause}
       order by local_date, created_at`,
      values,
    )
    return result.rows.map(mapHabitLog)
  }),

  upsertHabitLog: (userId, input) => withAuthenticatedUser(userId, async () => {
    const log = habitLogInput.parse(input)
    const result = await database.query(
      `insert into public.habit_logs (user_id, habit_id, local_date, count, status, note, source)
       values ($1, $2, $3::date, $4, $5, $6, 'manual')
       on conflict (habit_id, local_date) do update
       set count = excluded.count, status = excluded.status, note = excluded.note,
           source = 'manual', source_id = null
       where public.habit_logs.user_id = $1
       returning *`,
      [userId, log.habitId, log.localDate, log.count, log.status, log.note],
    )
    return mapHabitLog(one(result, 'save habit progress'))
  }),
})
