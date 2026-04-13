import { describe, it, expect } from 'vitest'
import { floydSteinberg } from '../dither.js'

const BW = [[0, 0, 0], [255, 255, 255]]
const BWR = [[0, 0, 0], [255, 255, 255], [200, 0, 0]]
const GRAY4 = [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]]

function createImageData(width, height, fillValue = 128) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fillValue
    data[i * 4 + 1] = fillValue
    data[i * 4 + 2] = fillValue
    data[i * 4 + 3] = 255
  }
  return { width, height, data }
}

function createColorImageData(width, height, r, g, b) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return { width, height, data }
}

function pixelAt(img, i) {
  return [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]]
}

function isInPalette(pixel, palette) {
  return palette.some(
    (c) => c[0] === pixel[0] && c[1] === pixel[1] && c[2] === pixel[2]
  )
}

describe('floydSteinberg — B/W palette', () => {
  it('converts all-white pixels to white', () => {
    const img = createImageData(4, 4, 255)
    floydSteinberg(img, BW)

    for (let i = 0; i < 16; i++) {
      expect(pixelAt(img, i)).toEqual([255, 255, 255])
    }
  })

  it('converts all-black pixels to black', () => {
    const img = createImageData(4, 4, 0)
    floydSteinberg(img, BW)

    for (let i = 0; i < 16; i++) {
      expect(pixelAt(img, i)).toEqual([0, 0, 0])
    }
  })

  it('produces only palette colors', () => {
    const img = createImageData(10, 10, 128)
    floydSteinberg(img, BW)

    for (let i = 0; i < 100; i++) {
      expect(isInPalette(pixelAt(img, i), BW)).toBe(true)
    }
  })

  it('preserves alpha channel', () => {
    const img = createImageData(4, 4, 100)
    for (let i = 0; i < 16; i++) {
      img.data[i * 4 + 3] = i * 16
    }
    const alphas = Array.from({ length: 16 }, (_, i) => img.data[i * 4 + 3])

    floydSteinberg(img, BW)

    for (let i = 0; i < 16; i++) {
      expect(img.data[i * 4 + 3]).toBe(alphas[i])
    }
  })

  it('handles 1x1 image', () => {
    const img = createImageData(1, 1, 200)
    floydSteinberg(img, BW)
    expect(pixelAt(img, 0)).toEqual([255, 255, 255])
  })

  it('defaults to B/W when no palette given', () => {
    const img = createImageData(4, 4, 128)
    floydSteinberg(img)

    for (let i = 0; i < 16; i++) {
      expect(isInPalette(pixelAt(img, i), BW)).toBe(true)
    }
  })

  it('approximately conserves average brightness over large area', () => {
    const size = 50
    const img = createImageData(size, size, 128)
    floydSteinberg(img, BW)

    let sum = 0
    for (let i = 0; i < size * size; i++) {
      sum += img.data[i * 4]
    }
    const avg = sum / (size * size)
    expect(avg).toBeGreaterThan(100)
    expect(avg).toBeLessThan(156)
  })
})

describe('floydSteinberg — multi-color palettes', () => {
  it('maps pure red to nearest palette color (BWR)', () => {
    const img = createColorImageData(1, 1, 200, 0, 0)
    floydSteinberg(img, BWR)
    expect(pixelAt(img, 0)).toEqual([200, 0, 0])
  })

  it('produces only BWR palette colors', () => {
    const img = createColorImageData(10, 10, 180, 50, 30)
    floydSteinberg(img, BWR)

    for (let i = 0; i < 100; i++) {
      expect(isInPalette(pixelAt(img, i), BWR)).toBe(true)
    }
  })

  it('4-gray palette produces only 4 levels', () => {
    const img = createImageData(20, 20, 100)
    floydSteinberg(img, GRAY4)

    for (let i = 0; i < 400; i++) {
      expect(isInPalette(pixelAt(img, i), GRAY4)).toBe(true)
    }
  })

  it('4-gray maps near-white to white', () => {
    const img = createImageData(1, 1, 250)
    floydSteinberg(img, GRAY4)
    expect(pixelAt(img, 0)).toEqual([255, 255, 255])
  })

  it('4-gray maps near-black to black', () => {
    const img = createImageData(1, 1, 10)
    floydSteinberg(img, GRAY4)
    expect(pixelAt(img, 0)).toEqual([0, 0, 0])
  })
})
