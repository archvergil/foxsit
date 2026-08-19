import type { ReactNode } from 'react'

import { bannerAssetById } from '@/lib/bannerAssets'

export function VisualBanner({ assetId, monochrome = false, className = '', children }: {
  assetId?: string | null | undefined
  monochrome?: boolean | undefined
  className?: string | undefined
  children: ReactNode
}) {
  const asset = bannerAssetById(assetId)
  return (
    <div className={`visual-banner${asset ? ' visual-banner--image' : ''}${monochrome ? ' visual-banner--monochrome' : ''}${className ? ` ${className}` : ''}`}>
      {asset ? <img className="visual-banner__media" src={asset.src} alt="" decoding="async" /> : null}
      <span className="visual-banner__shade" aria-hidden />
      <div className="visual-banner__content">{children}</div>
    </div>
  )
}
