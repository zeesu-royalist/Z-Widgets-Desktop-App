import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

function crc32(buf: Buffer): number {
  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320)
    }
  }
  return (crc ^ -1) >>> 0
}

function createChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcVal = crc32(crcInput)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crcVal, 0)
  return Buffer.concat([lenBuf, crcInput, crcBuf])
}

export function generateTrayPng(size: number, isDark: boolean = false): Buffer {
  const width = size
  const height = size
  const bytesPerPixel = 4
  const stride = 1 + width * bytesPerPixel
  const rawData = Buffer.alloc(stride * height, 0)

  // Color: black for template image (macOS treats alpha channel of template images as mask)
  const r = 0, g = 0, b = 0

  // Draw a crisp "Z" with rounded container
  // For template images, opacity/alpha defines the mask
  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride
    rawData[rowOffset] = 0 // filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel

      // Coordinates normalized to 0..1
      const nx = x / (width - 1)
      const ny = y / (height - 1)

      // Margins
      let alpha = 0
      if (nx >= 0.15 && nx <= 0.85 && ny >= 0.15 && ny <= 0.85) {
        // Top bar of Z: ny around 0.18..0.32
        const isTopBar = ny >= 0.18 && ny <= 0.32 && nx >= 0.18 && nx <= 0.82
        // Bottom bar of Z: ny around 0.68..0.82
        const isBottomBar = ny >= 0.68 && ny <= 0.82 && nx >= 0.18 && nx <= 0.82
        // Diagonal of Z: line connecting (0.75, 0.28) to (0.25, 0.72)
        // normalized distance from line
        const diagProgress = (0.78 - nx) / (0.78 - 0.22)
        const expectedY = 0.25 + diagProgress * (0.75 - 0.25)
        const dist = Math.abs(ny - expectedY)
        const isDiagonal = dist < (size === 16 ? 0.12 : 0.08) && nx >= 0.22 && nx <= 0.78

        if (isTopBar || isBottomBar || isDiagonal) {
          alpha = 255
        }
      }

      rawData[pxOffset] = r
      rawData[pxOffset + 1] = g
      rawData[pxOffset + 2] = b
      rawData[pxOffset + 3] = alpha
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace
  const ihdr = createChunk('IHDR', ihdrData)

  // IDAT
  const compressed = zlib.deflateSync(rawData)
  const idat = createChunk('IDAT', compressed)

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

// Generate files if executed directly
const resourcesDir = path.resolve(process.cwd(), 'resources')
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true })
}

fs.writeFileSync(path.join(resourcesDir, 'trayTemplate.png'), generateTrayPng(16))
fs.writeFileSync(path.join(resourcesDir, 'trayTemplate@2x.png'), generateTrayPng(32))
fs.writeFileSync(path.join(resourcesDir, 'icon.png'), generateTrayPng(64))
console.log('Generated tray icons successfully in resources directory!')
