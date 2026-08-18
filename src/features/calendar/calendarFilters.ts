import type { CalendarColorToken, CalendarEvent } from './types'

export interface CalendarEventFilters {
  query: string
  colors: CalendarColorToken[]
  categories: string[]
  tags: string[]
}

export const emptyCalendarEventFilters = (): CalendarEventFilters => ({
  query: '',
  colors: [],
  categories: [],
  tags: [],
})

export const calendarEventTags = (event: CalendarEvent) => {
  const tags = new Set<string>()
  const matches = event.description?.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu) ?? []

  for (const match of matches) {
    const tag = match[1]?.toLocaleLowerCase()
    if (tag) tags.add(tag)
  }

  return [...tags]
}

const searchTextForEvent = (event: CalendarEvent) => [
  event.title,
  event.description,
  event.category,
  event.location,
  ...calendarEventTags(event),
].filter((part): part is string => Boolean(part)).join(' ').toLocaleLowerCase()

export const filterCalendarEvents = (events: CalendarEvent[], filters: CalendarEventFilters) => {
  const query = filters.query.trim().toLocaleLowerCase()
  return events.filter((event) => {
    if (query && !searchTextForEvent(event).includes(query)) return false
    if (filters.colors.length && !filters.colors.includes(event.colorToken)) return false
    if (filters.categories.length && (!event.category || !filters.categories.includes(event.category))) return false
    if (filters.tags.length && !filters.tags.some((tag) => calendarEventTags(event).includes(tag))) return false
    return true
  })
}
