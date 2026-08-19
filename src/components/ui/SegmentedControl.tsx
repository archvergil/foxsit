import { useEffect, useState, type ReactNode } from 'react'

const lastActiveIndex = new Map<string, number>()

export function SegmentedControl({
  activeIndex,
  children,
  className = '',
  label,
  name,
  options,
}: {
  activeIndex: number
  children: ReactNode
  className?: string | undefined
  label: string
  name: string
  options: 2 | 3
}) {
  const optionName = options === 2 ? 'two' : 'three'
  const [visualIndex, setVisualIndex] = useState(() => lastActiveIndex.get(name) ?? activeIndex)

  useEffect(() => {
    lastActiveIndex.set(name, activeIndex)
    if (visualIndex === activeIndex) return

    const frame = window.requestAnimationFrame(() => setVisualIndex(activeIndex))
    return () => window.cancelAnimationFrame(frame)
  }, [activeIndex, name, visualIndex])

  return (
    <nav
      className={`segmented-control segmented-control--${optionName}${className ? ` ${className}` : ''}`}
      aria-label={label}
      data-active-index={visualIndex}
    >
      {children}
    </nav>
  )
}
