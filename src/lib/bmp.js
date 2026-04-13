/**
 * Custom 24-bit BMP encoder.
 * Canvas toBlob('image/bmp') is not universally supported,
 * so we build the binary format manually.
 */
export function canvasToBmpBlob(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data

  // Row size: 3 bytes per pixel, padded to 4-byte boundary
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowSize * height
  const fileSize = 14 + 40 + pixelDataSize // file header + DIB header + pixels

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  // -- BMP File Header (14 bytes) --
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4d) // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint16(6, 0, true) // reserved
  view.setUint16(8, 0, true) // reserved
  view.setUint32(10, 14 + 40, true) // pixel data offset

  // -- DIB Header (BITMAPINFOHEADER, 40 bytes) --
  view.setUint32(14, 40, true) // header size
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive = bottom-to-top
  view.setUint16(26, 1, true) // color planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(30, 0, true) // no compression
  view.setUint32(34, pixelDataSize, true)
  view.setInt32(38, 2835, true) // horizontal resolution (72 DPI)
  view.setInt32(42, 2835, true) // vertical resolution
  view.setUint32(46, 0, true) // colors in palette
  view.setUint32(50, 0, true) // important colors

  // -- Pixel Data (bottom-to-top, BGR) --
  const data = new Uint8Array(buffer)
  const padding = (4 - (width * 3) % 4) % 4
  let offset = 14 + 40

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      data[offset++] = pixels[srcIdx + 2] // B
      data[offset++] = pixels[srcIdx + 1] // G
      data[offset++] = pixels[srcIdx]     // R
    }
    for (let p = 0; p < padding; p++) {
      data[offset++] = 0
    }
  }

  return new Blob([buffer], { type: 'image/bmp' })
}

/**
 * Trigger a file download from a Blob.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
