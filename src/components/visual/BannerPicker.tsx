import { Check, ImageOff } from 'lucide-react'

import type { BannerAsset } from '@/lib/bannerAssets'

export function BannerPicker({ assets, value, monochrome, onChange, onMonochromeChange, allowNone = true }: {
  assets: BannerAsset[]
  value: string | null
  monochrome: boolean
  onChange: (assetId: string | null) => void
  onMonochromeChange: (monochrome: boolean) => void
  allowNone?: boolean | undefined
}) {
  const selectedAsset = assets.find((asset) => asset.id === value)

  return (
    <fieldset className="banner-picker">
      <legend>Banner</legend>
      {selectedAsset ? (
        <div className={`banner-picker__preview${monochrome ? ' banner-picker__preview--monochrome' : ''}`}>
          <img src={selectedAsset.src} alt="" decoding="async" />
          <span><small>Selected banner</small><strong>{selectedAsset.label}</strong></span>
        </div>
      ) : null}
      <div className="banner-picker__options">
        {allowNone ? (
          <button className={value === null ? 'is-selected' : ''} type="button" aria-pressed={value === null} onClick={() => onChange(null)}>
            <span className="banner-picker__none"><ImageOff aria-hidden /></span><small>None</small>{value === null ? <Check aria-hidden /> : null}
          </button>
        ) : null}
        {assets.map((asset, index) => (
          <button className={value === asset.id ? 'is-selected' : ''} type="button" key={asset.id} aria-label={asset.label} aria-pressed={value === asset.id} onClick={() => onChange(asset.id)}>
            <img src={asset.previewSrc} alt="" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" /><small>{asset.label}</small>{value === asset.id ? <Check aria-hidden /> : null}
          </button>
        ))}
      </div>
      <label className="banner-picker__mode"><input type="checkbox" checked={monochrome} disabled={!value} onChange={(event) => onMonochromeChange(event.target.checked)} /><span>Black &amp; white</span></label>
    </fieldset>
  )
}
