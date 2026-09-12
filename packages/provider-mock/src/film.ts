import { createHash } from 'node:crypto'
import { createSolid, encodePng, type RgbaImage } from '../../compose/src/png.ts'

/**
 * Concept-board still for the mock channel.
 * Readable at thumbnail size: letterbox, MOCK badge, table, cup, window light, title plate.
 * Not a real photograph — and it should not pretend to be one.
 */
export function createFilmStill(width: number, height: number, prompt: string): Uint8Array {
  const h = createHash('sha256').update(prompt).digest()
  const pal = palette(h)
  const img = createSolid(width, height, [pal.bg[0], pal.bg[1], pal.bg[2], 255])
  const bar = letterboxH(img)
  const windowRight = h[5] >= 128

  fillRoom(img, pal, h)
  drawWindow(img, pal, bar, windowRight)
  drawTable(img, pal, h, bar, windowRight)
  drawCup(img, pal, h, bar, windowRight)
  drawLetterbox(img, pal, bar)
  drawBadge(img, bar)
  drawTitlePlate(img, prompt, h, pal, bar)
  return encodePng(img)
}

type Palette = {
  bg: number[]
  wall: number[]
  table: number[]
  tableDark: number[]
  cup: number[]
  rim: number[]
  inner: number[]
  liquid: number[]
  lamp: number[]
  frame: number[]
  shadow: number[]
  ink: number[]
  mute: number[]
  bar: number[]
}

function palette(h: Buffer): Palette {
  const families: Omit<Palette, 'ink' | 'mute' | 'bar' | 'shadow'>[] = [
    { bg: [36, 22, 14], wall: [58, 36, 24], table: [138, 88, 50], tableDark: [82, 50, 28], cup: [214, 176, 112], rim: [240, 214, 160], inner: [96, 56, 32], liquid: [150, 92, 44], lamp: [255, 216, 128], frame: [64, 40, 26] },
    { bg: [14, 30, 28], wall: [26, 50, 48], table: [90, 66, 42], tableDark: [52, 38, 24], cup: [158, 190, 168], rim: [214, 232, 218], inner: [40, 70, 62], liquid: [62, 102, 90], lamp: [214, 240, 218], frame: [38, 56, 52] },
    { bg: [14, 16, 34], wall: [28, 34, 68], table: [58, 52, 78], tableDark: [32, 28, 48], cup: [206, 204, 220], rim: [236, 236, 246], inner: [48, 46, 72], liquid: [70, 78, 128], lamp: [186, 206, 255], frame: [40, 44, 72] },
    { bg: [38, 14, 12], wall: [72, 28, 22], table: [128, 58, 40], tableDark: [78, 32, 22], cup: [228, 186, 150], rim: [250, 224, 196], inner: [92, 36, 28], liquid: [168, 64, 42], lamp: [255, 168, 84], frame: [72, 28, 20] },
    { bg: [18, 22, 26], wall: [36, 44, 52], table: [78, 82, 88], tableDark: [42, 44, 48], cup: [176, 182, 190], rim: [226, 230, 236], inner: [46, 50, 56], liquid: [88, 96, 108], lamp: [226, 234, 242], frame: [48, 54, 60] },
    { bg: [22, 28, 14], wall: [40, 52, 26], table: [96, 86, 44], tableDark: [56, 50, 24], cup: [186, 176, 96], rim: [230, 226, 150], inner: [60, 56, 24], liquid: [92, 108, 48], lamp: [236, 244, 160], frame: [48, 56, 28] },
    { bg: [30, 16, 28], wall: [58, 30, 54], table: [102, 62, 78], tableDark: [62, 32, 48], cup: [214, 168, 196], rim: [242, 214, 230], inner: [84, 40, 70], liquid: [140, 64, 110], lamp: [255, 190, 230], frame: [64, 32, 58] },
    { bg: [12, 24, 32], wall: [20, 44, 58], table: [70, 92, 88], tableDark: [36, 50, 48], cup: [130, 198, 196], rim: [198, 236, 234], inner: [28, 64, 70], liquid: [36, 110, 118], lamp: [160, 228, 236], frame: [24, 52, 64] },
  ]
  const base = families[h[0] % families.length]
  const j = (i: number, n: number) => (h[i] % n) - (n >> 1)
  const jitter = (rgb: number[], i0: number): number[] => [
    clamp(rgb[0] + j(i0, 18)),
    clamp(rgb[1] + j(i0 + 1, 18)),
    clamp(rgb[2] + j(i0 + 2, 18)),
  ]
  return {
    bg: jitter(base.bg, 1),
    wall: jitter(base.wall, 4),
    table: jitter(base.table, 7),
    tableDark: jitter(base.tableDark, 10),
    cup: jitter(base.cup, 13),
    rim: jitter(base.rim, 16),
    inner: jitter(base.inner, 19),
    liquid: jitter(base.liquid, 22),
    lamp: jitter(base.lamp, 25),
    frame: jitter(base.frame, 28),
    shadow: [18, 14, 12],
    ink: [246, 240, 228],
    mute: [168, 158, 140],
    bar: [8, 8, 9],
  }
}

function letterboxH(img: RgbaImage): number {
  return Math.max(12, Math.round(img.height * 0.08))
}

function fillRoom(img: RgbaImage, pal: Palette, h: Buffer): void {
  const { width, height, data } = img
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const ny = y / height
      const nx = x / width
      let r = mix(pal.wall[0], pal.bg[0], ny * 0.55)
      let g = mix(pal.wall[1], pal.bg[1], ny * 0.55)
      let b = mix(pal.wall[2], pal.bg[2], ny * 0.55)
      const vig = Math.min(1, Math.hypot(nx - 0.5, ny - 0.45) * 1.15)
      r = mix(r, 8, vig * 0.28)
      g = mix(g, 8, vig * 0.28)
      b = mix(b, 8, vig * 0.28)
      const n = (h[(x * 13 + y * 7) % h.length] - 128) * 0.05
      data[i] = clamp(r + n)
      data[i + 1] = clamp(g + n)
      data[i + 2] = clamp(b + n)
      data[i + 3] = 255
    }
  }
}

function drawWindow(img: RgbaImage, pal: Palette, bar: number, windowRight: boolean): void {
  const w = img.width
  const ht = img.height
  const ww = Math.max(18, Math.round(w * 0.2))
  const hh = Math.max(22, Math.round(ht * 0.36))
  const x0 = windowRight ? w - Math.round(w * 0.055) - ww : Math.round(w * 0.055)
  const y0 = bar + Math.round(ht * 0.05)
  const x1 = x0 + ww
  const y1 = y0 + hh
  const m = Math.max(2, Math.round(w * 0.01))
  fillRect(img, x0, y0, x1, y1, pal.frame)
  fillRect(img, x0 + m, y0 + m, x1 - m, y1 - m, pal.lamp)
  const mx = Math.round((x0 + x1) / 2)
  const my = Math.round((y0 + y1) / 2)
  const t = Math.max(2, Math.round(m * 0.7))
  fillRect(img, mx - t, y0, mx + t, y1, pal.frame)
  fillRect(img, x0, my - t, x1, my + t, pal.frame)
}

function tableGeom(img: RgbaImage, h: Buffer, bar: number) {
  const farY = Math.round(img.height * (0.48 + (h[8] / 255) * 0.05))
  const nearY = img.height - bar - Math.max(6, Math.round(img.height * 0.04))
  const farL = Math.round(img.width * (0.2 + (h[9] / 255) * 0.04))
  const farR = Math.round(img.width * (0.76 - (h[10] / 255) * 0.04))
  const nearL = Math.round(img.width * 0.02)
  const nearR = img.width - Math.round(img.width * 0.02)
  return { farY, nearY, farL, farR, nearL, nearR }
}

function drawTable(img: RgbaImage, pal: Palette, h: Buffer, bar: number, windowRight: boolean): void {
  const { farY, nearY, farL, farR, nearL, nearR } = tableGeom(img, h, bar)
  const depth = Math.max(1, nearY - farY)
  for (let y = farY; y <= nearY; y++) {
    const t = (y - farY) / depth
    const xl = Math.round(mix(farL, nearL, t))
    const xr = Math.round(mix(farR, nearR, t))
    const shade = 0.62 + t * 0.38
    for (let x = xl; x <= xr; x++) {
      const nx = (x - xl) / Math.max(1, xr - xl)
      const light = windowRight ? 0.78 + nx * 0.28 : 1.06 - nx * 0.28
      const grain = Math.sin(x * 0.07 + y * 0.015) * 7 + (h[(x * 3 + y) % h.length] - 128) * 0.04
      const k = shade * light
      put(img, x, y, [
        clamp(pal.table[0] * k + grain),
        clamp(pal.table[1] * k + grain * 0.8),
        clamp(pal.table[2] * k + grain * 0.5),
      ])
    }
  }
  const apron = Math.max(4, Math.round(img.height * 0.035))
  fillRect(img, nearL, nearY, nearR, nearY + apron, pal.tableDark)
  const edge = pal.mute
  for (let x = farL; x <= farR; x++) put(img, x, farY, edge)
}

function drawCup(img: RgbaImage, pal: Palette, h: Buffer, bar: number, windowRight: boolean): void {
  const { farY, nearY } = tableGeom(img, h, bar)
  const cx = Math.round(img.width * (windowRight ? 0.38 : 0.62) + ((h[11] / 255) - 0.5) * img.width * 0.08)
  const cy = Math.round(farY + (nearY - farY) * (0.22 + (h[12] / 255) * 0.08))
  const rx = Math.max(12, Math.round(img.width * (0.09 + (h[13] / 255) * 0.02)))
  const ry = Math.max(4, Math.round(rx * 0.38))
  const bodyH = Math.max(14, Math.round(rx * 0.95))
  const botY = cy + bodyH
  const rim = [clamp(pal.rim[0] * 0.35 + 180), clamp(pal.rim[1] * 0.35 + 180), clamp(pal.rim[2] * 0.35 + 170)]
  const well = [clamp(pal.inner[0] * 0.45), clamp(pal.inner[1] * 0.45), clamp(pal.inner[2] * 0.45)]

  const sx = cx + (windowRight ? -Math.round(rx * 0.55) : Math.round(rx * 0.55))
  fillEllipse(img, sx, botY + Math.round(ry * 0.2), Math.round(rx * 1.65), Math.round(rx * 0.4), pal.shadow)

  const bodyTop = cy + Math.round(ry * 0.35)
  for (let y = bodyTop; y <= botY; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const u = (x - cx) / rx
      const lit = windowRight ? (u + 1) / 2 : (1 - u) / 2
      const k = 0.5 + 0.5 * lit
      put(img, x, y, [clamp(pal.cup[0] * k), clamp(pal.cup[1] * k), clamp(pal.cup[2] * k)])
    }
  }
  fillEllipse(img, cx, botY, rx, Math.round(ry * 0.9), scaleRgb(pal.cup, 0.5))

  fillEllipse(img, cx, cy, rx, ry, rim)
  fillEllipse(img, cx, cy + Math.max(1, Math.round(ry * 0.18)), Math.round(rx * 0.78), Math.round(ry * 0.7), well)
  fillEllipse(img, cx, cy + Math.max(2, Math.round(ry * 0.28)), Math.round(rx * 0.62), Math.round(ry * 0.48), pal.liquid)
  strokeEllipse(img, cx, cy, rx, ry, [255, 248, 230])
  const hx = cx + (windowRight ? Math.round(rx * 0.35) : -Math.round(rx * 0.35))
  fillEllipse(img, hx, cy - Math.round(ry * 0.15), Math.round(rx * 0.22), Math.round(ry * 0.18), [255, 252, 240])
}

function drawLetterbox(img: RgbaImage, pal: Palette, bar: number): void {
  fillRect(img, 0, 0, img.width - 1, bar - 1, pal.bar)
  fillRect(img, 0, img.height - bar, img.width - 1, img.height - 1, pal.bar)
}

function drawBadge(img: RgbaImage, bar: number): void {
  const s = Math.max(3, Math.round(img.width / 260))
  const text = 'MOCK'
  const tw = text.length * 6 * s
  const th = 7 * s
  const x = Math.max(8, Math.round(img.width * 0.02))
  const y = Math.max(2, Math.floor((bar - th) / 2))
  const gold = [236, 210, 90]
  fillRect(img, x - 5, y - 3, x + tw + 1, y + th + 2, [12, 12, 14])
  rectOutline(img, x - 5, y - 3, x + tw + 1, y + th + 2, gold)
  drawText(img, x, y, text, gold, s)
}

function drawTitlePlate(img: RgbaImage, prompt: string, h: Buffer, pal: Palette, bar: number): void {
  const label = asciiTitle(prompt, h)
  const s = Math.max(2, Math.round(img.width / 480))
  const th = 7 * s
  const y = img.height - bar + Math.max(1, Math.floor((bar - th) / 2))
  for (let x = 0; x < img.width; x++) put(img, x, img.height - bar, pal.mute)
  drawText(img, 12, y, label, pal.ink, s)
}

function asciiTitle(prompt: string, h: Buffer): string {
  const cleaned = prompt.replace(/[:/\n]+/g, ' ').trim()
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/[A-Za-z0-9]/.test(ascii)) return ascii.slice(0, 28).toUpperCase()
  const tag = h.toString('hex').slice(0, 8).toUpperCase()
  return `CONCEPT BOARD ${tag}`
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

function fillRect(img: RgbaImage, x0: number, y0: number, x1: number, y1: number, rgb: number[]): void {
  const xa = Math.round(Math.min(x0, x1))
  const xb = Math.round(Math.max(x0, x1))
  const ya = Math.round(Math.min(y0, y1))
  const yb = Math.round(Math.max(y0, y1))
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) put(img, x, y, rgb)
  }
}

function rectOutline(img: RgbaImage, x0: number, y0: number, x1: number, y1: number, rgb: number[]): void {
  for (let x = x0; x <= x1; x++) {
    put(img, x, y0, rgb)
    put(img, x, y1, rgb)
  }
  for (let y = y0; y <= y1; y++) {
    put(img, x0, y, rgb)
    put(img, x1, y, rgb)
  }
}

function fillEllipse(img: RgbaImage, cx: number, cy: number, rx: number, ry: number, rgb: number[]): void {
  const rxn = Math.max(1, Math.round(rx))
  const ryn = Math.max(1, Math.round(ry))
  for (let y = -ryn; y <= ryn; y++) {
    const t = 1 - (y * y) / (ryn * ryn)
    if (t < 0) continue
    const span = Math.floor(rxn * Math.sqrt(t))
    for (let x = -span; x <= span; x++) put(img, cx + x, cy + y, rgb)
  }
}

function strokeEllipse(img: RgbaImage, cx: number, cy: number, rx: number, ry: number, rgb: number[]): void {
  const rxn = Math.max(1, Math.round(rx))
  const ryn = Math.max(1, Math.round(ry))
  for (let y = -ryn; y <= ryn; y++) {
    const t = 1 - (y * y) / (ryn * ryn)
    if (t < 0) continue
    const span = Math.floor(rxn * Math.sqrt(t))
    put(img, cx - span, cy + y, rgb)
    put(img, cx + span, cy + y, rgb)
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
  return a + (b - a) * t
}

function scaleRgb(rgb: number[], k: number): number[] {
  return [clamp(rgb[0] * k), clamp(rgb[1] * k), clamp(rgb[2] * k)]
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

/** 5x7 caps + digits. Enough for MOCK / CONCEPT BOARD / hex titles. */
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
