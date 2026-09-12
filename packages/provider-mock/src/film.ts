import { createHash } from 'node:crypto'
import { createSolid, encodePng, type RgbaImage } from '../../compose/src/png.ts'

/**
 * Concept-board still for the mock channel.
 * Readable at thumbnail size: title plate + MOCK badge + prompt-derived palette.
 * Not a real photograph — and it should not pretend to be one.
 */
export function createFilmStill(width: number, height: number, prompt: string): Uint8Array {
  const h = createHash('sha256').update(prompt).digest()
  const pal = palette(h)
  const img = createSolid(width, height, [pal.bg[0], pal.bg[1], pal.bg[2], 255])

  fillField(img, pal, h)
  drawHorizon(img, pal, h)
  drawMasses(img, pal, h)
  drawLetterbox(img, pal)
  drawBadge(img, 'MOCK')
  drawTitlePlate(img, prompt)
  return encodePng(img)
}

function palette(h: Buffer) {
  const warm = h[0] > 127
  return {
    bg: warm ? [28 + (h[1] % 10), 18 + (h[2] % 8), 14] : [16, 20 + (h[1] % 10), 28 + (h[2] % 12)],
    mid: warm ? [86 + (h[3] % 40), 42 + (h[4] % 20), 28] : [32, 58 + (h[3] % 30), 78 + (h[4] % 30)],
    lamp: [236, 186, 92],
    ink: [246, 240, 228],
    mute: [168, 158, 140],
    bar: [8, 8, 9],
  }
}

function fillField(img: RgbaImage, pal: ReturnType<typeof palette>, h: Buffer): void {
  const { width, height, data } = img
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const nx = x / width
      const ny = y / height
      const t = ny * 0.7 + nx * 0.15
      let r = mix(pal.bg[0], pal.mid[0], t)
      let g = mix(pal.bg[1], pal.mid[1], t)
      let b = mix(pal.bg[2], pal.mid[2], t)
      const lx = nx - (0.62 + (h[5] / 255) * 0.16)
      const ly = ny - (0.32 + (h[6] / 255) * 0.1)
      const glow = Math.exp(-(lx * lx * 6 + ly * ly * 10))
      r = clamp(r + pal.lamp[0] * glow * 0.45)
      g = clamp(g + pal.lamp[1] * glow * 0.32)
      b = clamp(b + pal.lamp[2] * glow * 0.12)
      const vig = Math.min(1, Math.hypot(nx - 0.5, ny - 0.55) * 1.25)
      r = mix(r, 10, vig * 0.35)
      g = mix(g, 9, vig * 0.35)
      b = mix(b, 8, vig * 0.35)
      const n = ((h[(x * 13 + y * 7) % h.length] - 128) * 0.06)
      data[i] = clamp(r + n)
      data[i + 1] = clamp(g + n)
      data[i + 2] = clamp(b + n)
      data[i + 3] = 255
    }
  }
}

function drawHorizon(img: RgbaImage, pal: ReturnType<typeof palette>, h: Buffer): void {
  const y0 = Math.round(img.height * (0.58 + (h[8] / 255) * 0.08))
  for (let x = 0; x < img.width; x++) {
    const wobble = Math.round(Math.sin(x / 48 + h[9]) * 3)
    put(img, x, y0 + wobble, pal.mute)
  }
}

function drawMasses(img: RgbaImage, pal: ReturnType<typeof palette>, h: Buffer): void {
  const cx = Math.round(img.width * (0.34 + (h[10] / 255) * 0.28))
  const cy = Math.round(img.height * 0.62)
  const rw = Math.round(img.width * 0.16)
  const rh = Math.round(img.height * 0.38)
  for (let y = cy - rh; y < cy + rh * 0.2; y++) {
    for (let x = cx - rw; x < cx + rw; x++) {
      const dx = (x - cx) / rw
      const dy = (y - cy) / rh
      if (dx * dx + dy * dy * 0.35 > 1) continue
      put(img, x, y, [pal.mid[0] * 0.45, pal.mid[1] * 0.4, pal.mid[2] * 0.35])
    }
  }
}

function drawLetterbox(img: RgbaImage, pal: ReturnType<typeof palette>): void {
  const bar = Math.max(10, Math.round(img.height * 0.08))
  for (let y = 0; y < bar; y++) {
    for (let x = 0; x < img.width; x++) put(img, x, y, pal.bar)
  }
  for (let y = img.height - bar; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) put(img, x, y, pal.bar)
  }
}

function drawBadge(img: RgbaImage, text: string): void {
  const s = Math.max(2, Math.round(img.width / 420))
  drawText(img, 16, 14, text, [236, 210, 120], s)
}

function drawTitlePlate(img: RgbaImage, prompt: string): void {
  const label = asciiTitle(prompt)
  const s = Math.max(2, Math.round(img.width / 520))
  const y = img.height - Math.max(18, Math.round(img.height * 0.08)) + 4
  drawText(img, 16, y, label, [236, 230, 214], s)
}

function asciiTitle(prompt: string): string {
  const cleaned = prompt.replace(/[:/\n]+/g, ' ').trim()
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, '')
  if (ascii.length >= 8) return ascii.slice(0, 28).toUpperCase()
  return ('PREVIEW  ' + cleaned).slice(0, 28)
}

function drawText(img: RgbaImage, x0: number, y0: number, text: string, color: number[], scale: number): void {
  let x = x0
  for (const ch of text.toUpperCase()) {
    const g = GLYPH[ch] || GLYPH[' ']
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (!((g[gy] >> (4 - gx)) & 1)) continue
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            put(img, x + gx * scale + sx, y0 + gy * scale + sy, color)
          }
        }
      }
    }
    x += 6 * scale
  }
}

function put(img: RgbaImage, x: number, y: number, rgb: number[]): void {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return
  const i = (y * img.width + x) * 4
  img.data[i] = rgb[0]
  img.data[i + 1] = rgb[1]
  img.data[i + 2] = rgb[2]
  img.data[i + 3] = 255
}

function mix(a: number, b: number, t: number): number {
  return clamp(a + (b - a) * t)
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** 5x7 caps + digits. Enough for MOCK / PREVIEW titles. */
const GLYPH: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x12, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x0e, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04],
}
