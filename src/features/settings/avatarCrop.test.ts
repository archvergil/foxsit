import { describe, expect, it } from 'vitest'

import { resolveAvatarCrop } from './avatarCrop'

describe('resolveAvatarCrop', () => {
  it('centers a landscape image and returns a square source crop', () => {
    expect(resolveAvatarCrop(1_000, 500, {
      offsetX: 0,
      offsetY: 0,
      viewportSize: 320,
      zoom: 1,
    })).toMatchObject({
      displayHeight: 320,
      displayWidth: 640,
      sourceSize: 500,
      sourceX: 250,
      sourceY: 0,
    })
  })

  it('clamps repositioning so the crop never exposes empty space', () => {
    const crop = resolveAvatarCrop(1_000, 500, {
      offsetX: 999,
      offsetY: -999,
      viewportSize: 320,
      zoom: 1,
    })

    expect(crop.offsetX).toBe(160)
    expect(crop.offsetY).toBe(0)
    expect(crop.sourceX).toBe(0)
    expect(crop.sourceY).toBe(0)
  })

  it('uses zoom to select a smaller centered source region', () => {
    expect(resolveAvatarCrop(1_000, 500, {
      offsetX: 0,
      offsetY: 0,
      viewportSize: 320,
      zoom: 2,
    })).toMatchObject({
      sourceSize: 250,
      sourceX: 375,
      sourceY: 125,
    })
  })
})
