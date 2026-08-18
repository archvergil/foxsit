import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  const title = isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : 'This view could not open'
  const detail = isRouteErrorResponse(error) && error.status === 404
    ? 'The address does not match a workspace route.'
    : 'Try returning to Today. Your persisted session data has not been changed.'

  return (
    <main className="route-error">
      <AlertTriangle aria-hidden />
      <span className="eyebrow">Navigation error</span>
      <h1>{title}</h1>
      <p>{detail}</p>
      <Link className="button button--primary" to="/today">
        <ArrowLeft aria-hidden /> Back to Today
      </Link>
    </main>
  )
}
