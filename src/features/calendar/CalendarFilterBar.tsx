import { Filter, Search, X } from 'lucide-react'
import type { ChangeEvent } from 'react'

import {
  calendarEventTags,
  type CalendarEventFilters,
  emptyCalendarEventFilters,
} from './calendarFilters'
import type { CalendarColorToken, CalendarEvent } from './types'

const colorOptions: Array<{ value: CalendarColorToken; label: string }> = [
  { value: 'mint', label: 'Mint' },
  { value: 'coral', label: 'Coral' },
  { value: 'blue', label: 'Blue' },
  { value: 'sand', label: 'Sand' },
  { value: 'slate', label: 'Slate' },
]

const toggleValue = <Value extends string>(values: Value[], value: Value) => (
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value]
)

function CalendarFilterMenu({
  label,
  options,
  selectedValues,
  onChange,
  colorOptions: isColorMenu = false,
  emptyMessage,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selectedValues: string[]
  onChange: (value: string) => void
  colorOptions?: boolean
  emptyMessage: string
}) {
  return (
    <details className="calendar-filter-menu">
      <summary>
        <Filter aria-hidden />
        <span>{label}</span>
        {selectedValues.length ? <b>{selectedValues.length}</b> : null}
      </summary>
      <div className="calendar-filter-menu__options" role="group" aria-label={`Filter events by ${label.toLocaleLowerCase()}`}>
        {options.length ? options.map((option) => {
          const checked = selectedValues.includes(option.value)
          return (
            <label key={option.value}>
              <input type="checkbox" checked={checked} onChange={() => onChange(option.value)} />
              {isColorMenu ? <i className={`calendar-filter-menu__swatch calendar-filter-menu__swatch--${option.value}`} aria-hidden /> : null}
              <span>{option.label}</span>
            </label>
          )
        }) : <p>{emptyMessage}</p>}
      </div>
    </details>
  )
}

export function CalendarFilters({
  events,
  filters,
  onChange,
}: {
  events: CalendarEvent[]
  filters: CalendarEventFilters
  onChange: (filters: CalendarEventFilters) => void
}) {
  const categories = [...new Set(events.flatMap((event) => event.category ? [event.category] : []))].sort((left, right) => left.localeCompare(right))
  const tags = [...new Set(events.flatMap(calendarEventTags))].sort((left, right) => left.localeCompare(right))
  const activeFilterCount = filters.colors.length + filters.categories.length + filters.tags.length
  const setQuery = (event: ChangeEvent<HTMLInputElement>) => onChange({ ...filters, query: event.target.value })

  return (
    <section className="calendar-filters" aria-label="Search and filter events">
      <label className="calendar-search">
        <Search aria-hidden />
        <span className="visually-hidden">Search events</span>
        <input value={filters.query} onChange={setQuery} placeholder="Search events..." />
        {filters.query ? <button type="button" aria-label="Clear event search" onClick={() => onChange({ ...filters, query: '' })}><X aria-hidden /></button> : null}
      </label>
      <div className="calendar-filter-actions">
        <CalendarFilterMenu
          label="Colors"
          options={colorOptions}
          selectedValues={filters.colors}
          onChange={(color) => onChange({ ...filters, colors: toggleValue(filters.colors, color as CalendarColorToken) })}
          colorOptions
          emptyMessage="No colors available."
        />
        <CalendarFilterMenu
          label="Tags"
          options={tags.map((tag) => ({ value: tag, label: `#${tag}` }))}
          selectedValues={filters.tags}
          onChange={(tag) => onChange({ ...filters, tags: toggleValue(filters.tags, tag) })}
          emptyMessage="Add #tags to event notes to filter them here."
        />
        <CalendarFilterMenu
          label="Categories"
          options={categories.map((category) => ({ value: category, label: category }))}
          selectedValues={filters.categories}
          onChange={(category) => onChange({ ...filters, categories: toggleValue(filters.categories, category) })}
          emptyMessage="No event categories yet."
        />
        {filters.query || activeFilterCount ? <button className="calendar-filter-clear" type="button" onClick={() => onChange(emptyCalendarEventFilters())}><X aria-hidden />Clear</button> : null}
      </div>
    </section>
  )
}
