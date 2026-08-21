type TouchLikeEvent = Event & { touches?: { length: number } }
type WheelLikeEvent = Event & { ctrlKey?: boolean }

const isTouchCapable = (targetWindow: Window) => (
  'ontouchstart' in targetWindow || targetWindow.navigator.maxTouchPoints > 0
)

export function installTouchViewportGuards(
  targetWindow: Window = window,
  targetDocument: Document = document,
) {
  if (!isTouchCapable(targetWindow)) return () => undefined

  const preventGestureZoom = (event: Event) => event.preventDefault()
  const preventPinchZoom = (event: Event) => {
    if ((event as TouchLikeEvent).touches?.length && (event as TouchLikeEvent).touches!.length > 1) {
      event.preventDefault()
    }
  }
  const preventTrackpadZoom = (event: Event) => {
    if ((event as WheelLikeEvent).ctrlKey) event.preventDefault()
  }

  targetDocument.addEventListener('gesturestart', preventGestureZoom, { passive: false })
  targetDocument.addEventListener('gesturechange', preventGestureZoom, { passive: false })
  targetDocument.addEventListener('touchmove', preventPinchZoom, { passive: false })
  targetDocument.addEventListener('wheel', preventTrackpadZoom, { passive: false })

  return () => {
    targetDocument.removeEventListener('gesturestart', preventGestureZoom)
    targetDocument.removeEventListener('gesturechange', preventGestureZoom)
    targetDocument.removeEventListener('touchmove', preventPinchZoom)
    targetDocument.removeEventListener('wheel', preventTrackpadZoom)
  }
}
