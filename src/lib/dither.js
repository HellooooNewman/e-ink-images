/**
 * Find the nearest color in a palette using Euclidean distance in RGB space.
 */
function nearestColor(r, g, b, palette) {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < palette.length; i++) {
    const dr = r - palette[i][0]
    const dg = g - palette[i][1]
    const db = b - palette[i][2]
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return palette[bestIdx]
}

/**
 * Floyd-Steinberg dithering with an arbitrary color palette.
 * Operates in RGB space, diffusing per-channel error to neighbors.
 *
 * @param {ImageData} imageData - source pixels (modified in place)
 * @param {number[][]} palette - array of [r, g, b] colors
 */
export function floydSteinberg(imageData, palette) {
  const { width, height, data } = imageData

  // Default to B/W if no palette provided
  if (!palette) {
    palette = [[0, 0, 0], [255, 255, 255]]
  }

  // Work in float buffers so error can go negative
  const len = width * height
  const rf = new Float32Array(len)
  const gf = new Float32Array(len)
  const bf = new Float32Array(len)

  for (let i = 0; i < len; i++) {
    rf[i] = data[i * 4]
    gf[i] = data[i * 4 + 1]
    bf[i] = data[i * 4 + 2]
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const oldR = rf[idx]
      const oldG = gf[idx]
      const oldB = bf[idx]

      const [newR, newG, newB] = nearestColor(oldR, oldG, oldB, palette)

      rf[idx] = newR
      gf[idx] = newG
      bf[idx] = newB

      const errR = oldR - newR
      const errG = oldG - newG
      const errB = oldB - newB

      if (x + 1 < width) {
        rf[idx + 1] += errR * 7 / 16
        gf[idx + 1] += errG * 7 / 16
        bf[idx + 1] += errB * 7 / 16
      }
      if (y + 1 < height) {
        const below = (y + 1) * width
        if (x - 1 >= 0) {
          rf[below + x - 1] += errR * 3 / 16
          gf[below + x - 1] += errG * 3 / 16
          bf[below + x - 1] += errB * 3 / 16
        }
        rf[below + x] += errR * 5 / 16
        gf[below + x] += errG * 5 / 16
        bf[below + x] += errB * 5 / 16
        if (x + 1 < width) {
          rf[below + x + 1] += errR * 1 / 16
          gf[below + x + 1] += errG * 1 / 16
          bf[below + x + 1] += errB * 1 / 16
        }
      }
    }
  }

  // Write back to ImageData
  for (let i = 0; i < len; i++) {
    data[i * 4] = Math.max(0, Math.min(255, Math.round(rf[i])))
    data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(gf[i])))
    data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(bf[i])))
  }

  return imageData
}
