import { CloudOff } from 'lucide-react'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OnlineStatus() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div className="online-status" role="status">
      <CloudOff aria-hidden />
      Offline — server changes will wait until you reconnect.
    </div>
  )
}
