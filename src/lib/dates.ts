const dateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

export const browserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export const isIanaTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.trim().length === 0) return false
  try {
    dateFormatter(value).format(new Date(0))
    return true
  } catch {
    return false
  }
}

export const resolveTimeZone = (profileTimeZone: unknown) =>
  isIanaTimeZone(profileTimeZone) ? profileTimeZone : browserTimeZone()

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const isValidLocalDate = (value: string) => {
  const match = LOCAL_DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export const localDateKey = (date: Date, timeZone: string) => {
  const parts = dateFormatter(timeZone).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export const formatDayHeading = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)

export const formatTaskTimestamp = (timestamp: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))

export const formatLocalDateLabel = (dateKey: string) => {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  const day = Number(dateKey.slice(8, 10))
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export const addLocalDays = (dateKey: string, days: number) => {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  const day = Number(dateKey.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

const localDateTimeFormatter = (timeZone: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const localDateTimeParts = (date: Date, timeZone: string) => {
  const parts = localDateTimeFormatter(timeZone).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  }
}

export const formatTimestampForInput = (timestamp: string | null, timeZone: string) => {
  if (!timestamp) return ''
  const parts = localDateTimeParts(new Date(timestamp), timeZone)
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export const localDateTimeToTimestamp = (value: string, timeZone: string) => {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value)
  if (!match) return null
  const target = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  }
  if (target.month < 1 || target.month > 12 || target.day < 1 || target.day > 31 || target.hour > 23 || target.minute > 59) {
    return null
  }

  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute)
  let candidate = targetAsUtc
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = localDateTimeParts(new Date(candidate), timeZone)
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
    )
    const adjustment = targetAsUtc - observedAsUtc
    candidate += adjustment
    if (adjustment === 0) break
  }

  const iso = new Date(candidate).toISOString()
  return formatTimestampForInput(iso, timeZone) === value ? iso : null
}
