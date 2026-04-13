import { floydSteinberg } from './dither.js'
import { DISPLAY_PRESETS, COLOR_PALETTES } from './stores.js'

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
 * Get the base display dimensions from settings (preset or custom).
 */
function getDisplayDimensions(settings) {
  if (settings.display === 'custom') {
    return { width: settings.customWidth, height: settings.customHeight }
  }
  const preset = DISPLAY_PRESETS.find((p) => p.id === settings.display)
  return preset
    ? { width: preset.width, height: preset.height }
    : { width: 800, height: 480 }
}

/**
 * Determine target dimensions based on image orientation and settings.
 */
function getTarget(img, settings) {
  const dims = getDisplayDimensions(settings)

  let isLandscape
  if (settings.direction === 'auto') {
    isLandscape = img.naturalWidth >= img.naturalHeight
  } else {
    isLandscape = settings.direction === 'landscape'
  }

  // For landscape, use wider dimension as width; for portrait, swap
  const wide = Math.max(dims.width, dims.height)
  const narrow = Math.min(dims.width, dims.height)

  return isLandscape
    ? { width: wide, height: narrow }
    : { width: narrow, height: wide }
}

/**
 * Apply brightness and contrast adjustments to ImageData.
 * brightness: -100 to 100, contrast: -100 to 100
 */
function applyBrightnessContrast(imageData, brightness, contrast) {
  const data = imageData.data
  const b = brightness * 2.55 // map -100..100 to -255..255
  const c = contrast / 100
  const factor = (1 + c) / (1.0001 - c) // contrast factor

  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      let val = data[i + ch]
      val += b                         // brightness
      val = factor * (val - 128) + 128 // contrast
      data[i + ch] = Math.max(0, Math.min(255, val + 0.5)) // clamp
    }
  }
}

/**
 * Process a single image file with the given settings.
 * Returns a canvas element at the target resolution.
 */
export async function processImage(file, settings, imageAdjustments) {
  const img = await loadImage(file)
  const target = getTarget(img, settings)

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

  // Apply per-image brightness/contrast adjustments
  const brightness = imageAdjustments?.brightness || 0
  const contrast = imageAdjustments?.contrast || 0
  if (brightness !== 0 || contrast !== 0) {
    const imageData = ctx.getImageData(0, 0, target.width, target.height)
    applyBrightnessContrast(imageData, brightness, contrast)
    ctx.putImageData(imageData, 0, 0)
  }

  // Snapshot the pre-dithered version for before/after comparison
  const beforeCanvas = document.createElement('canvas')
  beforeCanvas.width = target.width
  beforeCanvas.height = target.height
  beforeCanvas.getContext('2d').drawImage(canvas, 0, 0)

  // Apply dithering with selected palette
  if (settings.dither) {
    const paletteEntry = COLOR_PALETTES.find((p) => p.id === settings.palette)
    const colors = paletteEntry ? paletteEntry.colors : [[0, 0, 0], [255, 255, 255]]
    const imageData = ctx.getImageData(0, 0, target.width, target.height)
    floydSteinberg(imageData, colors)
    ctx.putImageData(imageData, 0, 0)
  }

  return { canvas, beforeCanvas }
}
