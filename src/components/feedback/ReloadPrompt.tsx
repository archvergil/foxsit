import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

import { Button } from '@/components/ui/Button'

export function ReloadPrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const applyUpdate = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    applyUpdate.current = registerSW({
      onNeedRefresh: () => setUpdateAvailable(true),
    })
  }, [])

  if (!updateAvailable) return null

  return (
    <aside className="update-toast" role="status">
      <span>A fresh version is ready.</span>
      <Button variant="secondary" onClick={() => void applyUpdate.current?.(true)}>
        Update now
      </Button>
      <Button variant="quiet" onClick={() => setUpdateAvailable(false)}>
        Later
      </Button>
    </aside>
  )
}
