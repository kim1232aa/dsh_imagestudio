import { deflateSync, inflateSync } from 'node:zlib'
import { crc32 } from 'node:zlib'

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
  const idat: Buffer[] = []
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') break
    offset += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const data = new Uint8Array(width * height * 4)
  const stride = width * 4 + 1
  for (let y = 0; y < height; y++) {
    data.set(raw.subarray(y * stride + 1, y * stride + 1 + width * 4), y * width * 4)
  }
  return { width, height, data }
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
