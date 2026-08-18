import type { CSSProperties, ReactNode } from 'react'

import { bannerAssetById } from '@/lib/bannerAssets'

export function VisualBanner({ assetId, monochrome = false, className = '', children }: {
  assetId?: string | null | undefined
  monochrome?: boolean | undefined
  className?: string | undefined
  children: ReactNode
}) {
  const asset = bannerAssetById(assetId)
  const style = asset ? { '--visual-banner-image': `url("${asset.src}")` } as CSSProperties : undefined
  return (
    <div className={`visual-banner${asset ? ' visual-banner--image' : ''}${monochrome ? ' visual-banner--monochrome' : ''}${className ? ` ${className}` : ''}`} style={style}>
      <span className="visual-banner__media" aria-hidden />
      <span className="visual-banner__shade" aria-hidden />
      <div className="visual-banner__content">{children}</div>
    </div>
  )
}
