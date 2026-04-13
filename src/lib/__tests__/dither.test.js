import { describe, it, expect } from 'vitest'
import { floydSteinberg } from '../dither.js'

function createImageData(width, height, fillValue = 128) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fillValue     // R
    data[i * 4 + 1] = fillValue // G
    data[i * 4 + 2] = fillValue // B
    data[i * 4 + 3] = 255       // A
  }
  return { width, height, data }
}

describe('floydSteinberg', () => {
  it('converts all-white pixels to white', () => {
    const img = createImageData(4, 4, 255)
    floydSteinberg(img)

    for (let i = 0; i < 16; i++) {
      expect(img.data[i * 4]).toBe(255)
      expect(img.data[i * 4 + 1]).toBe(255)
      expect(img.data[i * 4 + 2]).toBe(255)
    }
  })

  it('converts all-black pixels to black', () => {
    const img = createImageData(4, 4, 0)
    floydSteinberg(img)

    for (let i = 0; i < 16; i++) {
      expect(img.data[i * 4]).toBe(0)
      expect(img.data[i * 4 + 1]).toBe(0)
      expect(img.data[i * 4 + 2]).toBe(0)
    }
  })

  it('produces only black and white pixels', () => {
    const img = createImageData(10, 10, 128)
    floydSteinberg(img)

    for (let i = 0; i < 100; i++) {
      const v = img.data[i * 4]
      expect(v === 0 || v === 255).toBe(true)
    }
  })

  it('preserves alpha channel', () => {
    const img = createImageData(4, 4, 100)
    // Set varying alpha
    for (let i = 0; i < 16; i++) {
      img.data[i * 4 + 3] = i * 16
    }
    const alphas = []
    for (let i = 0; i < 16; i++) {
      alphas.push(img.data[i * 4 + 3])
    }

    floydSteinberg(img)

    for (let i = 0; i < 16; i++) {
      expect(img.data[i * 4 + 3]).toBe(alphas[i])
    }
  })

  it('handles 1x1 image', () => {
    const img = createImageData(1, 1, 200)
    floydSteinberg(img)
    expect(img.data[0]).toBe(255)
  })

  it('handles grayscale conversion with color input', () => {
    const img = createImageData(2, 2, 0)
    // Set a bright red pixel
    img.data[0] = 255 // R
    img.data[1] = 0   // G
    img.data[2] = 0   // B
    // Luminance = 0.299 * 255 ≈ 76.2 → should go to 0 (black)

    floydSteinberg(img)
    expect(img.data[0]).toBe(0)
  })

  it('approximately conserves average brightness over large area', () => {
    const size = 50
    const gray = 128
    const img = createImageData(size, size, gray)
    floydSteinberg(img)

    let sum = 0
    for (let i = 0; i < size * size; i++) {
      sum += img.data[i * 4]
    }
    const avg = sum / (size * size)
    // Should be roughly 128, within a reasonable tolerance
    expect(avg).toBeGreaterThan(100)
    expect(avg).toBeLessThan(156)
  })
})
