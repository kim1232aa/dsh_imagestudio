import { deflateSync, inflateSync } from 'node:zlib'
import { crc32 } from 'node:zlib'
// @ts-expect-error jpeg-js ships no types; pure-JS baseline JPEG decoder
import * as jpegJs from 'jpeg-js'

export interface RgbaImage {
  width: number
  height: number
  data: Uint8Array // RGBA
}

export function createSolid(width: number, height: number, rgba: [number, number, number, number] = [20, 20, 20, 255]): RgbaImage {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0]
    data[i * 4 + 1] = rgba[1]
    data[i * 4 + 2] = rgba[2]
    data[i * 4 + 3] = rgba[3]
  }
  return { width, height, data }
}

export function encodePng(img: RgbaImage): Uint8Array {
  const raw = Buffer.alloc((img.width * 4 + 1) * img.height)
  for (let y = 0; y < img.height; y++) {
    raw[y * (img.width * 4 + 1)] = 0
    raw.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4), y * (img.width * 4 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(img.width, 0)
  ihdr.writeUInt32BE(img.height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const chunks = [
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]
  return Buffer.concat(chunks)
}

export function decodePng(bytes: Uint8Array): RgbaImage {
  const buf = Buffer.from(bytes)
  if (buf[0] !== 137 || buf[1] !== 80) throw new Error('not a png')
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 8
  let colorType = 6
  let interlace = 0
  let palette: Uint8Array | null = null
  const idat: Buffer[] = []
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'PLTE') {
      palette = new Uint8Array(data)
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') break
    offset += 12 + len
  }
  if (bitDepth !== 8) throw new Error(`unsupported png bit depth ${bitDepth}`)
  if (interlace !== 0) throw new Error('unsupported interlaced png')
  // 每像素通道数：0 灰度 / 2 RGB / 3 调色板 / 4 灰度+alpha / 6 RGBA
  const channels = [1, 0, 3, 1, 2, 0, 4][colorType] ?? 0
  if (!channels) throw new Error(`unsupported png color type ${colorType}`)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels + 1
  if (raw.length < stride * height) {
    throw new Error(`truncated png: want ${stride * height}, got ${raw.length}`)
  }
  // 先按 PNG 过滤器还原每行原始字节（filter 0-4：None/Sub/Up/Average/Paeth）
  const un = new Uint8Array(width * channels * height)
  const bpp = channels
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride
    const filter = raw[rowStart]
    const line = raw.subarray(rowStart + 1, rowStart + 1 + width * channels)
    const outRow = y * width * channels
    const prevRow = outRow - width * channels
    for (let x = 0; x < line.length; x++) {
      const a = x >= bpp ? un[outRow + x - bpp] : 0
      const b = y > 0 ? un[prevRow + x] : 0
      const c = x >= bpp && y > 0 ? un[prevRow + x - bpp] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 0xff
      else if (filter === 2) v = (v + b) & 0xff
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      } else if (filter !== 0) throw new Error(`unknown png filter ${filter}`)
      un[outRow + x] = v
    }
  }
  // 转成 RGBA
  const data = new Uint8Array(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    const s = p * channels
    const d = p * 4
    if (colorType === 6) {
      data[d] = un[s]; data[d + 1] = un[s + 1]; data[d + 2] = un[s + 2]; data[d + 3] = un[s + 3]
    } else if (colorType === 2) {
      data[d] = un[s]; data[d + 1] = un[s + 1]; data[d + 2] = un[s + 2]; data[d + 3] = 255
    } else if (colorType === 0) {
      data[d] = data[d + 1] = data[d + 2] = un[s]; data[d + 3] = 255
    } else if (colorType === 4) {
      data[d] = data[d + 1] = data[d + 2] = un[s]; data[d + 3] = un[s + 1]
    } else if (colorType === 3) {
      if (!palette) throw new Error('palette png missing PLTE')
      const pi = un[s] * 3
      data[d] = palette[pi]; data[d + 1] = palette[pi + 1]; data[d + 2] = palette[pi + 2]; data[d + 3] = 255
    }
  }
  return { width, height, data }
}

/**
 * Format-agnostic image decode: PNG via the built-in inflater, baseline JPEG
 * via jpeg-js. Real channels (grok-imagine) always return JPEG, and the GIF
 * compositor runs without ffmpeg on some machines — without this, every JPEG
 * frame died at `decodePng` with a useless "not a png".
 */
export function decodeImage(bytes: Uint8Array): RgbaImage {
  if (bytes[0] === 137 && bytes[1] === 80) return decodePng(bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    // jpeg-js is CJS; depending on the loader's interop the decode export sits
    // on the namespace or on `.default` — take whichever exists.
    const decode = ((jpegJs as { decode?: unknown }).decode ??
      (jpegJs as { default?: { decode?: unknown } }).default?.decode) as (
      bytes: Uint8Array,
      opts: { maxMemoryUsageInMB: number; formatAsRGBA: boolean },
    ) => { width: number; height: number; data: Uint8Array }
    const decoded = decode(bytes, { maxMemoryUsageInMB: 512, formatAsRGBA: true })
    return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) }
  }
  throw new Error(`unsupported image format (magic ${bytes[0]?.toString(16)} ${bytes[1]?.toString(16)})`)
}

function chunk(type: string, data: Buffer): Buffer {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = crc32(Buffer.concat([t, data]))
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crcBuf >>> 0, 0)
  return Buffer.concat([len, t, data, c])
}

export function blit(dst: RgbaImage, src: RgbaImage, x: number, y: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    const dy = y + sy
    if (dy < 0 || dy >= dst.height) continue
    for (let sx = 0; sx < src.width; sx++) {
      const dx = x + sx
      if (dx < 0 || dx >= dst.width) continue
      const si = (sy * src.width + sx) * 4
      const di = (dy * dst.width + dx) * 4
      dst.data[di] = src.data[si]
      dst.data[di + 1] = src.data[si + 1]
      dst.data[di + 2] = src.data[si + 2]
      dst.data[di + 3] = src.data[si + 3]
    }
  }
}
