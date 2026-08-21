import { afterEach, describe, expect, it } from 'vitest'

import { installTouchViewportGuards } from './installTouchViewportGuards'

const originalMaxTouchPoints = navigator.maxTouchPoints

afterEach(() => {
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: originalMaxTouchPoints })
})

describe('installTouchViewportGuards', () => {
  it('blocks pinch and gesture zoom on touch devices without blocking one-finger movement', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 2 })
    const uninstall = installTouchViewportGuards(window, document)

    const oneFinger = new Event('touchmove', { bubbles: true, cancelable: true })
    Object.defineProperty(oneFinger, 'touches', { value: { length: 1 } })
    expect(document.dispatchEvent(oneFinger)).toBe(true)

    const pinch = new Event('touchmove', { bubbles: true, cancelable: true })
    Object.defineProperty(pinch, 'touches', { value: { length: 2 } })
    expect(document.dispatchEvent(pinch)).toBe(false)

    const gesture = new Event('gesturestart', { bubbles: true, cancelable: true })
    expect(document.dispatchEvent(gesture)).toBe(false)

    uninstall()
  })

  it('blocks browser zoom gestures delivered as control-wheel events', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 1 })
    const uninstall = installTouchViewportGuards(window, document)
    const zoom = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true })

    expect(document.dispatchEvent(zoom)).toBe(false)
    uninstall()
  })
})
