/**
 * Floyd-Steinberg dithering on ImageData.
 * Converts to grayscale, then diffuses quantization error.
 */
export function floydSteinberg(imageData) {
  const { width, height, data } = imageData

  // Convert to grayscale float buffer
  const gray = new Float32Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  // Floyd-Steinberg error diffusion
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const oldVal = gray[idx]
      const newVal = oldVal < 128 ? 0 : 255
      gray[idx] = newVal
      const err = oldVal - newVal

      if (x + 1 < width) gray[idx + 1] += err * 7 / 16
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += err * 3 / 16
        gray[(y + 1) * width + x] += err * 5 / 16
        if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += err * 1 / 16
      }
    }
  }

  // Write back to ImageData
  for (let i = 0; i < gray.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(gray[i])))
    data[i * 4] = v
    data[i * 4 + 1] = v
    data[i * 4 + 2] = v
    // alpha stays unchanged
  }

  return imageData
}
