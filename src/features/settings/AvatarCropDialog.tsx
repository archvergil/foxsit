import { Move, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { createCroppedAvatarFile, resolveAvatarCrop } from './avatarCrop'

type ImageSize = { height: number; width: number }
type Point = { x: number; y: number }

export function AvatarCropDialog({
  file,
  onCancel,
  onConfirm,
  pending,
}: {
  file: File
  onCancel: () => void
  onConfirm: (file: File) => Promise<void>
  pending: boolean
}) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])
  const stageRef = useRef<HTMLDivElement>(null)
  const dragPoint = useRef<Point | null>(null)
  const revokeTimer = useRef<number | null>(null)
  const [imageSize, setImageSize] = useState<ImageSize | null>(null)
  const [viewportSize, setViewportSize] = useState(320)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (revokeTimer.current !== null) window.clearTimeout(revokeTimer.current)
    return () => {
      revokeTimer.current = window.setTimeout(() => URL.revokeObjectURL(previewUrl), 0)
    }
  }, [previewUrl])
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const resize = () => setViewportSize(stage.getBoundingClientRect().width)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const metrics = imageSize
    ? resolveAvatarCrop(imageSize.width, imageSize.height, {
        offsetX: offset.x, offsetY: offset.y, viewportSize, zoom,
      })
    : null

  const move = (x: number, y: number) => {
    if (!imageSize) return
    const next = resolveAvatarCrop(imageSize.width, imageSize.height, {
      offsetX: offset.x + x,
      offsetY: offset.y + y,
      viewportSize,
      zoom,
    })
    setOffset({ x: next.offsetX, y: next.offsetY })
  }

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragPoint.current = { x: event.clientX, y: event.clientY }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragPoint.current) return
    const next = { x: event.clientX, y: event.clientY }
    move(next.x - dragPoint.current.x, next.y - dragPoint.current.y)
    dragPoint.current = next
  }
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragPoint.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const distance = event.shiftKey ? 20 : 5
    const direction = {
      ArrowDown: [0, distance], ArrowLeft: [-distance, 0], ArrowRight: [distance, 0], ArrowUp: [0, -distance],
    }[event.key]
    if (!direction) return
    event.preventDefault()
    move(direction[0] ?? 0, direction[1] ?? 0)
  }
  const confirm = async () => {
    setError(null)
    try {
      const croppedFile = await createCroppedAvatarFile(file, {
        offsetX: offset.x, offsetY: offset.y, viewportSize, zoom,
      })
      await onConfirm(croppedFile)
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : 'Could not prepare the profile photo.')
    }
  }

  return (
    <div className="avatar-crop-dialog__backdrop">
      <section
        className="avatar-crop-dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pending) onCancel()
        }}
      >
        <header>
          <span><span className="eyebrow">Profile photo</span><h2 id="avatar-crop-title">Frame your photo</h2></span>
          <button type="button" aria-label="Close photo editor" onClick={onCancel} disabled={pending}><X aria-hidden /></button>
        </header>
        <p>Drag the photo to position it. The circular preview is exactly how it will appear in the app.</p>
        <div
          className="avatar-crop-dialog__stage"
          ref={stageRef}
          role="group"
          aria-label="Photo crop area. Drag or use the arrow keys to reposition."
          autoFocus
          tabIndex={0}
          onKeyDown={keyDown}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
        >
          <img
            src={previewUrl}
            alt="Profile crop preview"
            draggable={false}
            onLoad={(event) => setImageSize({ height: event.currentTarget.naturalHeight, width: event.currentTarget.naturalWidth })}
            style={metrics ? { height: metrics.displayHeight, left: metrics.left, top: metrics.top, width: metrics.displayWidth } : undefined}
          />
          <span aria-hidden><Move /></span>
        </div>
        <label className="avatar-crop-dialog__zoom">
          <ZoomOut aria-hidden />
          <span className="visually-hidden">Zoom</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <ZoomIn aria-hidden />
        </label>
        {error ? <p className="settings-error" role="alert">{error}</p> : null}
        <footer>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
          <Button type="button" onClick={() => void confirm()} isLoading={pending} disabled={!imageSize}>Use photo</Button>
        </footer>
      </section>
    </div>
  )
}
