import { TerminalSquare } from 'lucide-react'

export function ConfigurationNotice() {
  return (
    <aside className="configuration-notice" role="status">
      <TerminalSquare aria-hidden />
      <div>
        <strong>Connect Supabase to continue</strong>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code> and add the project URL and
          publishable key. No service-role key belongs in this app.
        </p>
      </div>
    </aside>
  )
}
