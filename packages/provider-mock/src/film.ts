import { createHash } from 'node:crypto'
import { createSolid, encodePng, type RgbaImage } from '../../compose/src/png.ts'

/** Deterministic film-lab still: letterbox, vignette, grain, a figure mass. */
export function createFilmStill(width: number, height: number, prompt: string): Uint8Array {
  const h = createHash('sha256').update(prompt).digest()
  const vermilion: [number, number, number] = [180 + (h[0] % 40), 70 + (h[1] % 30), 55 + (h[2] % 25)]
  const teal: [number, number, number] = [18 + (h[3] % 16), 32 + (h[4] % 18), 36 + (h[5] % 16)]
  const lamp: [number, number, number] = [220, 170, 90]
  const img = createSolid(width, height, [teal[0], teal[1], teal[2], 255])
  const bar = Math.max(4, Math.round(height * 0.07))
  const cx = Math.round(width * (0.38 + (h[6] / 255) * 0.28))
  const cy = Math.round(height * (0.55 + (h[7] / 255) * 0.12))
  const figW = Math.round(width * (0.08 + (h[8] / 255) * 0.1))
  const figH = Math.round(height * (0.28 + (h[9] / 255) * 0.18))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (y < bar || y >= height - bar) {
        img.data[i] = 4
        img.data[i + 1] = 4
        img.data[i + 2] = 5
        img.data[i + 3] = 255
        continue
      }
      const ny = (y - bar) / Math.max(1, height - 2 * bar)
      const nx = x / width
      const pillar = nx < 0.12 || nx > 0.88 ? 1 : 0
      let r = mix(teal[0], vermilion[0] * 0.35, ny * 0.4 + pillar * 0.5)
      let g = mix(teal[1], vermilion[1] * 0.25, ny * 0.3 + pillar * 0.4)
      let b = mix(teal[2], vermilion[2] * 0.2, ny * 0.2 + pillar * 0.3)
      const dx = (x - cx) / figW
      const dy = (y - cy) / figH
      const fig = Math.max(0, 1 - (dx * dx + dy * dy * 0.6))
      r = mix(r, 28, fig * 0.85)
      g = mix(g, 24, fig * 0.85)
      b = mix(b, 22, fig * 0.85)
      const lx = x - width * 0.62
      const ly = y - height * 0.38
      const lampGlow = Math.exp(-(lx * lx + ly * ly) / (width * width * 0.04))
      r = clamp(r + lamp[0] * lampGlow * 0.35)
      g = clamp(g + lamp[1] * lampGlow * 0.22)
      b = clamp(b + lamp[2] * lampGlow * 0.08)
      const vig = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 1.4)
      r = mix(r, 8, vig * 0.45)
      g = mix(g, 10, vig * 0.45)
      b = mix(b, 12, vig * 0.45)
      const n = h[(x * 13 + y * 7) % h.length] - 128
      r = clamp(r + n * 0.08)
      g = clamp(g + n * 0.08)
      b = clamp(b + n * 0.07)
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  stampFrame(img, prompt)
  return encodePng(img)
}

function stampFrame(img: RgbaImage, prompt: string): void {
  const label = prompt.slice(0, 18)
  const y = img.height - 10
  for (let i = 0; i < label.length; i++) {
    const gx = 8 + i * 6
    for (let py = 0; py < 5; py++) {
      for (let px = 0; px < 4; px++) {
        const dx = gx + px
        const dy = y + py
        if (dx < 0 || dy < 0 || dx >= img.width || dy >= img.height) continue
        const di = (dy * img.width + dx) * 4
        img.data[di] = 230
        img.data[di + 1] = 220
        img.data[di + 2] = 200
      }
    }
  }
}

function mix(a: number, b: number, t: number): number {
  return clamp(a + (b - a) * t)
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}
