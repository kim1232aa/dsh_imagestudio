import { createFilmStill } from './film.ts'

const MAGIC = Buffer.from('DSHV')

export interface EmbeddedClip {
  width: number
  height: number
  durationSec: number
  prompt: string
  png: Uint8Array
}

/** ISO-BMFF-looking wrapper so tests/UI get a `.mp4` without ffmpeg. */
export function wrapPngAsMp4(meta: Omit<EmbeddedClip, 'png'> & { png: Uint8Array }): Uint8Array {
  const json = Buffer.from(
    JSON.stringify({
      width: meta.width,
      height: meta.height,
      durationSec: meta.durationSec,
      prompt: meta.prompt,
    }),
    'utf8',
  )
  const payload = Buffer.concat([
    MAGIC,
    u32(json.length),
    json,
    Buffer.from(meta.png),
  ])
  const ftyp = box('ftyp', Buffer.concat([
    Buffer.from('isom'),
    u32(0x200),
    Buffer.from('isom'),
    Buffer.from('iso2'),
    Buffer.from('mp41'),
  ]))
  const mdat = box('mdat', payload)
  const free = box('free', Buffer.alloc(64, 0))
  return Buffer.concat([ftyp, mdat, free])
}

export function readEmbeddedClip(bytes: Uint8Array): EmbeddedClip | undefined {
  const buf = Buffer.from(bytes)
  const marker = buf.indexOf(MAGIC)
  if (marker < 0 || marker + 8 > buf.length) return undefined
  const jsonLen = buf.readUInt32BE(marker + 4)
  if (jsonLen <= 0 || marker + 8 + jsonLen > buf.length) return undefined
  try {
    const meta = JSON.parse(buf.subarray(marker + 8, marker + 8 + jsonLen).toString('utf8')) as {
      width?: number
      height?: number
      durationSec?: number
      prompt?: string
    }
    const png = buf.subarray(marker + 8 + jsonLen)
    if (png.length < 24 || png[0] !== 0x89) return undefined
    return {
      width: Number(meta.width) || 640,
      height: Number(meta.height) || 360,
      durationSec: Number(meta.durationSec) || 1,
      prompt: String(meta.prompt || ''),
      png,
    }
  } catch {
    return undefined
  }
}

export function stillForClip(width: number, height: number, prompt: string): Uint8Array {
  return createFilmStill(width, height, prompt || 'PREVIEW')
}

function box(type: string, data: Buffer): Buffer {
  const size = Buffer.alloc(4)
  size.writeUInt32BE(8 + data.length, 0)
  return Buffer.concat([size, Buffer.from(type), data])
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0, 0)
  return b
}
