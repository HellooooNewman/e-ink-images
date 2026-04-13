/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'

// Mock canvas since we're in Node
function createMockCanvas(width, height, pixels) {
  const data = new Uint8ClampedArray(width * height * 4)
  if (pixels) {
    data.set(pixels)
  } else {
    // Default: white pixels
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 255
      data[i * 4 + 1] = 255
      data[i * 4 + 2] = 255
      data[i * 4 + 3] = 255
    }
  }

  return {
    width,
    height,
    getContext: () => ({
      getImageData: () => ({ width, height, data }),
    }),
  }
}

// Import after understanding what we need
import { canvasToBmpBlob, downloadBlob } from '../bmp.js'

describe('canvasToBmpBlob', () => {
  it('returns a Blob with image/bmp type', () => {
    const canvas = createMockCanvas(2, 2)
    const blob = canvasToBmpBlob(canvas)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/bmp')
  })

  it('has correct BMP file header signature', async () => {
    const canvas = createMockCanvas(2, 2)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    // 'BM' signature
    expect(view.getUint8(0)).toBe(0x42)
    expect(view.getUint8(1)).toBe(0x4d)
  })

  it('has correct file size in header', async () => {
    const w = 3
    const h = 2
    const canvas = createMockCanvas(w, h)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    const rowSize = Math.ceil((w * 3) / 4) * 4 // 12 bytes (3*3=9, padded to 12)
    const expectedSize = 14 + 40 + rowSize * h
    expect(view.getUint32(2, true)).toBe(expectedSize)
    expect(buffer.byteLength).toBe(expectedSize)
  })

  it('has correct DIB header values', async () => {
    const canvas = createMockCanvas(4, 3)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    // DIB header size
    expect(view.getUint32(14, true)).toBe(40)
    // Width
    expect(view.getInt32(18, true)).toBe(4)
    // Height (positive = bottom-to-top)
    expect(view.getInt32(22, true)).toBe(3)
    // Color planes
    expect(view.getUint16(26, true)).toBe(1)
    // Bits per pixel
    expect(view.getUint16(28, true)).toBe(24)
    // Compression (none)
    expect(view.getUint32(30, true)).toBe(0)
  })

  it('pixel data offset is 54 (14 + 40)', async () => {
    const canvas = createMockCanvas(2, 2)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)

    expect(view.getUint32(10, true)).toBe(54)
  })

  it('writes pixels in BGR order', async () => {
    // Single pixel: R=255, G=0, B=128
    const pixels = new Uint8ClampedArray([255, 0, 128, 255])
    const canvas = createMockCanvas(1, 1, pixels)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()
    const data = new Uint8Array(buffer)

    const offset = 54 // pixel data starts after headers
    expect(data[offset]).toBe(128)   // B
    expect(data[offset + 1]).toBe(0) // G
    expect(data[offset + 2]).toBe(255) // R
  })

  it('rows are padded to 4-byte boundary', async () => {
    // 1 pixel wide: 3 bytes per row, needs 1 byte padding
    const canvas = createMockCanvas(1, 2)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()

    const rowSize = 4 // 3 bytes + 1 padding
    const expectedSize = 54 + rowSize * 2
    expect(buffer.byteLength).toBe(expectedSize)
  })

  it('writes rows bottom-to-top', async () => {
    // 1x2 image: top pixel red, bottom pixel blue
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,   // top row: red
      0, 0, 255, 255,   // bottom row: blue
    ])
    const canvas = createMockCanvas(1, 2, pixels)
    const blob = canvasToBmpBlob(canvas)
    const buffer = await blob.arrayBuffer()
    const data = new Uint8Array(buffer)

    const rowSize = 4 // padded
    // First row in BMP = bottom row of image = blue
    expect(data[54]).toBe(255)     // B
    expect(data[54 + 1]).toBe(0)   // G
    expect(data[54 + 2]).toBe(0)   // R

    // Second row in BMP = top row of image = red
    expect(data[54 + rowSize]).toBe(0)       // B
    expect(data[54 + rowSize + 1]).toBe(0)   // G
    expect(data[54 + rowSize + 2]).toBe(255) // R
  })
})

describe('downloadBlob', () => {
  it('creates and clicks a download link', () => {
    const mockElement = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockElement)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

    const blob = new Blob(['test'], { type: 'image/bmp' })
    downloadBlob(blob, 'test.bmp')

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(mockElement.download).toBe('test.bmp')
    expect(mockElement.click).toHaveBeenCalled()

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})
