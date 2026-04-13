import { floydSteinberg } from './dither.js'

const LANDSCAPE_W = 800
const LANDSCAPE_H = 480
const PORTRAIT_W = 480
const PORTRAIT_H = 800

/**
 * Load a File into an HTMLImageElement.
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load image: ${file.name}`))
    }
    img.src = url
  })
}

/**
 * Determine target dimensions based on image orientation and settings.
 */
function getTarget(img, direction) {
  let isLandscape
  if (direction === 'auto') {
    isLandscape = img.naturalWidth >= img.naturalHeight
  } else {
    isLandscape = direction === 'landscape'
  }

  return isLandscape
    ? { width: LANDSCAPE_W, height: LANDSCAPE_H }
    : { width: PORTRAIT_W, height: PORTRAIT_H }
}

/**
 * Process a single image file with the given settings.
 * Returns a canvas element at the target resolution.
 */
export async function processImage(file, settings) {
  const img = await loadImage(file)
  const target = getTarget(img, settings.direction)

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d')

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, target.width, target.height)

  if (settings.mode === 'scale') {
    // Scale to fill, maintaining aspect ratio, centered
    const scaleX = target.width / img.naturalWidth
    const scaleY = target.height / img.naturalHeight
    const scale = Math.max(scaleX, scaleY)
    const drawW = img.naturalWidth * scale
    const drawH = img.naturalHeight * scale
    const offsetX = (target.width - drawW) / 2
    const offsetY = (target.height - drawH) / 2
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
  } else if (settings.mode === 'cut') {
    // Crop source to match target aspect ratio, then draw
    const targetRatio = target.width / target.height
    const srcRatio = img.naturalWidth / img.naturalHeight

    let srcX, srcY, srcW, srcH
    if (srcRatio > targetRatio) {
      // Source is wider — crop sides
      srcH = img.naturalHeight
      srcW = srcH * targetRatio
      srcX = (img.naturalWidth - srcW) / 2
      srcY = 0
    } else {
      // Source is taller — crop top/bottom
      srcW = img.naturalWidth
      srcH = srcW / targetRatio
      srcX = 0
      srcY = (img.naturalHeight - srcH) / 2
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, target.width, target.height)
  }

  // Apply dithering
  if (settings.dither) {
    const imageData = ctx.getImageData(0, 0, target.width, target.height)
    floydSteinberg(imageData)
    ctx.putImageData(imageData, 0, 0)
  }

  return canvas
}
