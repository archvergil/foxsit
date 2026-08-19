import { useIsFetching, useIsMutating } from '@tanstack/react-query'

export function DataActivityIndicator() {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const active = fetching > 0 || mutating > 0
  const label = mutating > 0 ? 'Saving changes' : 'Refreshing data'

  return (
    <div
      className={`data-activity${active ? ' data-activity--active' : ''}${mutating > 0 ? ' data-activity--saving' : ''}`}
      role="status"
      aria-hidden={!active}
      aria-label={active ? label : undefined}
    ><span /></div>
  )
}
