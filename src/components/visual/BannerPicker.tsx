import { Check, ImageOff } from 'lucide-react'

import type { BannerAsset } from '@/lib/bannerAssets'

export function BannerPicker({ assets, value, monochrome, onChange, onMonochromeChange }: {
  assets: BannerAsset[]
  value: string | null
  monochrome: boolean
  onChange: (assetId: string | null) => void
  onMonochromeChange: (monochrome: boolean) => void
}) {
  return (
    <fieldset className="banner-picker">
      <legend>Banner</legend>
      <div className="banner-picker__options">
        <button className={value === null ? 'is-selected' : ''} type="button" aria-pressed={value === null} onClick={() => onChange(null)}>
          <span className="banner-picker__none"><ImageOff aria-hidden /></span><small>None</small>{value === null ? <Check aria-hidden /> : null}
        </button>
        {assets.map((asset) => (
          <button className={value === asset.id ? 'is-selected' : ''} type="button" key={asset.id} aria-label={asset.label} aria-pressed={value === asset.id} onClick={() => onChange(asset.id)}>
            <img src={asset.src} alt="" loading="lazy" /><small>{asset.label}</small>{value === asset.id ? <Check aria-hidden /> : null}
          </button>
        ))}
      </div>
      <label className="banner-picker__mode"><input type="checkbox" checked={monochrome} disabled={!value} onChange={(event) => onMonochromeChange(event.target.checked)} /><span>Black &amp; white</span></label>
    </fieldset>
  )
}
