export type AvatarCrop = {
  offsetX: number
  offsetY: number
  viewportSize: number
  zoom: number
}

export type AvatarCropMetrics = {
  displayHeight: number
  displayWidth: number
  left: number
  offsetX: number
  offsetY: number
  sourceSize: number
  sourceX: number
  sourceY: number
  top: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const resolveAvatarCrop = (
  naturalWidth: number,
  naturalHeight: number,
  crop: AvatarCrop,
): AvatarCropMetrics => {
  const viewportSize = Math.max(1, crop.viewportSize)
  const zoom = clamp(crop.zoom, 1, 3)
  const coverScale = Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight)
  const scale = coverScale * zoom
  const displayWidth = naturalWidth * scale
  const displayHeight = naturalHeight * scale
  const horizontalLimit = Math.max(0, (displayWidth - viewportSize) / 2)
  const verticalLimit = Math.max(0, (displayHeight - viewportSize) / 2)
  const offsetX = horizontalLimit === 0 ? 0 : clamp(crop.offsetX, -horizontalLimit, horizontalLimit)
  const offsetY = verticalLimit === 0 ? 0 : clamp(crop.offsetY, -verticalLimit, verticalLimit)
  const left = (viewportSize - displayWidth) / 2 + offsetX
  const top = (viewportSize - displayHeight) / 2 + offsetY
  const sourceSize = viewportSize / scale

  return {
    displayHeight,
    displayWidth,
    left,
    offsetX,
    offsetY,
    sourceSize,
    sourceX: clamp(-left / scale, 0, naturalWidth - sourceSize),
    sourceY: clamp(-top / scale, 0, naturalHeight - sourceSize),
    top,
  }
}

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)
  image.onload = () => {
    URL.revokeObjectURL(objectUrl)
    resolve(image)
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error('Could not read the profile photo.'))
  }
  image.src = objectUrl
})

const canvasBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not prepare the profile photo.')),
      'image/webp',
      quality,
    )
  })

export const createCroppedAvatarFile = async (file: File, crop: AvatarCrop) => {
  const image = await loadImage(file)
  const metrics = resolveAvatarCrop(image.naturalWidth, image.naturalHeight, crop)
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the profile photo.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    metrics.sourceX,
    metrics.sourceY,
    metrics.sourceSize,
    metrics.sourceSize,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  const blob = await canvasBlob(canvas, 0.88)
  if (blob.size > 1_048_576) throw new Error('The cropped profile photo is still larger than 1 MB.')
  const fileType = ['image/webp', 'image/png', 'image/jpeg'].includes(blob.type) ? blob.type : 'image/png'
  const extension = fileType === 'image/webp' ? 'webp' : fileType === 'image/jpeg' ? 'jpg' : 'png'
  return new File([blob], `avatar.${extension}`, { type: fileType, lastModified: Date.now() })
}
