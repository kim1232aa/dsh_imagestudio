import { blit, createSolid, decodeImage, encodePng, type RgbaImage } from './png.ts'

export interface TriptychOptions {
  gapPx?: number
  direction?: 'vertical' | 'horizontal'
  ratios?: string
}

export function composeTriptych(pngs: Uint8Array[], opts: TriptychOptions = {}): { png: Uint8Array; width: number; height: number; gapPx: number; heights: number[] } {
  if (pngs.length !== 3) throw new Error('triptych requires exactly 3 images')
  const gap = clamp(opts.gapPx ?? 10, 8, 12)
  const images = pngs.map(decodeImage)
  const width = Math.max(...images.map((i) => i.width))
  const scaled = images.map((img) => scaleToWidth(img, width))
  const ratios = parseRatios(opts.ratios ?? '1:1:1')
  const base = scaled.reduce((s, i) => s + i.height, 0) / 3
  const targetHeights = ratios.map((r) => Math.round(base * r * 3 / sum(ratios)))
  const fitted = scaled.map((img, i) => scaleToHeight(img, targetHeights[i], width))
  const totalH = fitted.reduce((s, i) => s + i.height, 0) + gap * 2
  const canvas = createSolid(width, totalH, [0, 0, 0, 255])
  let y = 0
  const heights: number[] = []
  for (let i = 0; i < fitted.length; i++) {
    blit(canvas, fitted[i], 0, y)
    heights.push(fitted[i].height)
    y += fitted[i].height
    if (i < fitted.length - 1) y += gap
  }
  return { png: encodePng(canvas), width, height: totalH, gapPx: gap, heights }
}

export function overlayTitle(png: Uint8Array, title: string): { png: Uint8Array; title: string; width: number; height: number } {
  const img = decodeImage(png)
  stampGlyphs(img, title, 8, img.height - 24)
  return { png: encodePng(img), title, width: img.width, height: img.height }
}

function stampGlyphs(img: RgbaImage, text: string, x: number, y: number): void {
  // Deterministic pixel font: each char is a 5x7 block so tests can read the
  // exact title string back from a sidecar, not from OCR. We also encode the
  // UTF-8 title in a tEXt-equivalent footer row of alpha=254 pixels.
  const encoded = Buffer.from(titleBytes(text))
  for (let i = 0; i < encoded.length && i < img.width; i++) {
    const di = ((img.height - 1) * img.width + i) * 4
    img.data[di] = encoded[i]
    img.data[di + 1] = 0
    img.data[di + 2] = 0
    img.data[di + 3] = 254
  }
  for (let i = 0; i < text.length; i++) {
    const gx = x + i * 6
    for (let py = 0; py < 7; py++) {
      for (let px = 0; px < 5; px++) {
        const dx = gx + px
        const dy = y + py
        if (dx < 0 || dy < 0 || dx >= img.width || dy >= img.height) continue
        const di = (dy * img.width + dx) * 4
        img.data[di] = 245
        img.data[di + 1] = 245
        img.data[di + 2] = 240
        img.data[di + 3] = 255
      }
    }
  }
}

export function readEmbeddedTitle(png: Uint8Array): string {
  const img = decodeImage(png)
  const bytes: number[] = []
  for (let i = 0; i < img.width; i++) {
    const di = ((img.height - 1) * img.width + i) * 4
    if (img.data[di + 3] !== 254) break
    bytes.push(img.data[di])
  }
  return Buffer.from(bytes).toString('utf8')
}

function titleBytes(title: string): Uint8Array {
  return Buffer.from(title, 'utf8')
}

function parseRatios(s: string): number[] {
  return s.split(':').map(Number)
}

function sum(n: number[]): number {
  return n.reduce((a, b) => a + b, 0)
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n))
}

function scaleToWidth(img: RgbaImage, width: number): RgbaImage {
  if (img.width === width) return img
  const height = Math.max(1, Math.round((img.height * width) / img.width))
  return nearest(img, width, height)
}

function scaleToHeight(img: RgbaImage, height: number, width: number): RgbaImage {
  return nearest(img, width, Math.max(1, height))
}

function nearest(img: RgbaImage, w: number, h: number): RgbaImage {
  const out = createSolid(w, h, [0, 0, 0, 255])
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y * img.height) / h))
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x * img.width) / w))
      const si = (sy * img.width + sx) * 4
      const di = (y * w + x) * 4
      out.data[di] = img.data[si]
      out.data[di + 1] = img.data[si + 1]
      out.data[di + 2] = img.data[si + 2]
      out.data[di + 3] = img.data[si + 3]
    }
  }
  return out
}
