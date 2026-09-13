import type { RgbaImage } from './png.ts'

/**
 * Minimal GIF89a encoder (256-color 3-3-2 palette, looping).
 * Used when ffmpeg is not on PATH so `/imagestudio/api/gif` still works offline.
 */
export function encodeGif(frames: RgbaImage[], delayCs = 25): Uint8Array {
  if (frames.length < 1) throw new Error('gif needs at least 1 frame')
  const width = frames[0].width
  const height = frames[0].height
  const parts: Buffer[] = []
  parts.push(Buffer.from('GIF89a', 'ascii'))
  const ls = Buffer.alloc(7)
  ls.writeUInt16LE(width, 0)
  ls.writeUInt16LE(height, 2)
  ls[4] = 0xf7 // gct flag, 8-bit palette
  ls[5] = 0
  ls[6] = 0
  parts.push(ls)
  parts.push(palette332())
  // Netscape 2.0 loop
  parts.push(Buffer.from([0x21, 0xff, 0x0b]))
  parts.push(Buffer.from('NETSCAPE2.0', 'ascii'))
  parts.push(Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]))
  for (const frame of frames) {
    const gce = Buffer.alloc(8)
    gce[0] = 0x21
    gce[1] = 0xf9
    gce[2] = 0x04
    gce[3] = 0x00
    gce.writeUInt16LE(Math.max(2, Math.min(255, delayCs)), 4)
    gce[6] = 0
    gce[7] = 0
    parts.push(gce)
    const desc = Buffer.alloc(10)
    desc[0] = 0x2c
    desc.writeUInt16LE(0, 1)
    desc.writeUInt16LE(0, 3)
    desc.writeUInt16LE(width, 5)
    desc.writeUInt16LE(height, 7)
    desc[9] = 0
    parts.push(desc)
    const indexed = index332(frame, width, height)
    parts.push(lzwUncompressed(indexed))
  }
  parts.push(Buffer.from([0x3b]))
  return Buffer.concat(parts)
}

function palette332(): Buffer {
  const pal = Buffer.alloc(256 * 3)
  for (let i = 0; i < 256; i++) {
    const r = ((i >> 5) & 7) * 36
    const g = ((i >> 2) & 7) * 36
    const b = (i & 3) * 85
    pal[i * 3] = r
    pal[i * 3 + 1] = g
    pal[i * 3 + 2] = b
  }
  return pal
}

function index332(frame: RgbaImage, width: number, height: number): Uint8Array {
  const w = Math.min(width, frame.width)
  const h = Math.min(height, frame.height)
  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x < w ? x : w - 1
      const sy = y < h ? y : h - 1
      const i = (sy * frame.width + sx) * 4
      const r = frame.data[i] >> 5
      const g = frame.data[i + 1] >> 5
      const b = frame.data[i + 2] >> 6
      out[y * width + x] = (r << 5) | (g << 2) | b
    }
  }
  return out
}

/** Uncompressed LZW: 9-bit codes, clear often so we never leave 9-bit width. */
function lzwUncompressed(pixels: Uint8Array): Buffer {
  const minCode = 8
  const clear = 256
  const eoi = 257
  const bits: number[] = []
  const push = (code: number) => bits.push(code)
  push(clear)
  for (let i = 0; i < pixels.length; i++) {
    push(pixels[i])
    if ((i + 1) % 120 === 0) push(clear)
  }
  push(eoi)
  const packed = pack9(bits)
  const chunks: Buffer[] = [Buffer.from([minCode])]
  for (let i = 0; i < packed.length; i += 255) {
    const slice = packed.subarray(i, Math.min(i + 255, packed.length))
    chunks.push(Buffer.from([slice.length]))
    chunks.push(Buffer.from(slice))
  }
  chunks.push(Buffer.from([0]))
  return Buffer.concat(chunks)
}

function pack9(codes: number[]): Uint8Array {
  const out: number[] = []
  let acc = 0
  let n = 0
  for (const code of codes) {
    acc |= (code & 0x1ff) << n
    n += 9
    while (n >= 8) {
      out.push(acc & 0xff)
      acc >>= 8
      n -= 8
    }
  }
  if (n > 0) out.push(acc & 0xff)
  return Uint8Array.from(out)
}
