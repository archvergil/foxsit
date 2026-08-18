import { useEffect, useState } from 'react'

export const useTimerClock = (running: boolean) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return undefined
    const tick = () => setNow(Date.now())
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [running])

  return now
}
