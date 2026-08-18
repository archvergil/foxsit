import type { ComponentProps } from 'react'

interface BrandMarkProps extends Omit<ComponentProps<'img'>, 'src' | 'alt'> {
  decorative?: boolean
}

export function BrandMark({ decorative = false, ...props }: BrandMarkProps) {
  return (
    <img
      src="/icons/brand-mark.png"
      alt={decorative ? '' : 'Geometric fox mark'}
      aria-hidden={decorative || undefined}
      {...props}
    />
  )
}
