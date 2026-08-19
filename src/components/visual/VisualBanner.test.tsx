import { render } from '@testing-library/react'

import { collectionBannerAssets } from '@/lib/bannerAssets'
import { BannerPicker } from './BannerPicker'
import { VisualBanner } from './VisualBanner'

describe('visual banners', () => {
  it('renders the selected GIF as a real image in the banner', () => {
    const { container } = render(
      <VisualBanner assetId="habits_7.gif" monochrome><strong>Reading</strong></VisualBanner>,
    )

    const image = container.querySelector<HTMLImageElement>('.visual-banner__media')
    expect(image).toHaveAttribute('src', '/gifs/habits_7.gif')
    expect(container.querySelector('.visual-banner')).toHaveClass('visual-banner--image', 'visual-banner--monochrome')
  })

  it('shows a large selected preview and eagerly loads the picker thumbnails', () => {
    const { container } = render(
      <BannerPicker
        assets={collectionBannerAssets}
        value="habits_7.gif"
        monochrome
        onChange={vi.fn()}
        onMonochromeChange={vi.fn()}
      />,
    )

    expect(container.querySelector('.banner-picker__preview img')).toHaveAttribute('src', '/gifs/habits_7.gif')
    expect(container.querySelector('.banner-picker__preview')).toHaveClass('banner-picker__preview--monochrome')
    expect(container.querySelector('.banner-picker__options img')).toHaveAttribute('src', '/gifs/previews/habits_1.jpg')
    expect(container.querySelector('.banner-picker__options img')).toHaveAttribute('loading', 'eager')
  })
})
