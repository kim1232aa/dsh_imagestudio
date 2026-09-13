/**
 * 算法转 SVG：均匀色量化 + 逐行游程合并成矩形。
 * 这是诚实的算法版——不假装矢量描摹，输出是按色分组的 <rect> 集合，
 * 适合图标/色块类切片；照片类会很大，调用方应提示。
 */

import type { RgbaImage } from './png.ts'

/** 每通道量化级数（4 bit → 16 级）。 */
const LEVELS = 16

function quantizeChannel(v: number): number {
  return Math.min(255, Math.round((v >> 4) * 17))
}

export function quantizeToSvg(img: RgbaImage, maxColors = 12): string {
  const { width, height, data } = img
  // 第一遍：统计量化色频次（透明像素跳过）
  const freq = new Map<number, number>()
  const keyOf = (i: number) =>
    (quantizeChannel(data[i]) << 16) | (quantizeChannel(data[i + 1]) << 8) | quantizeChannel(data[i + 2])
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const k = keyOf(i)
    freq.set(k, (freq.get(k) ?? 0) + 1)
  }
  if (!freq.size) throw new Error('切片全透明，没有可矢量化的像素')
  // 保留 top N 色，其余归入最近保留色（按 RGB 距离）
  const kept = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors).map(([k]) => k)
  const nearest = (k: number): number => {
    if (kept.includes(k)) return k
    const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255
    let best = kept[0], bd = Infinity
    for (const c of kept) {
      const d = Math.abs(((c >> 16) & 255) - r) + Math.abs(((c >> 8) & 255) - g) + Math.abs((c & 255) - b)
      if (d < bd) { bd = d; best = c }
    }
    return best
  }
  // 第二遍：逐行游程，同色连续段合成一个 rect
  const runs = new Map<number, string[]>()
  for (let y = 0; y < height; y++) {
    let x = 0
    while (x < width) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) { x++; continue }
      const k = nearest(keyOf(i))
      let x2 = x + 1
      while (x2 < width) {
        const j = (y * width + x2) * 4
        if (data[j + 3] < 128 || nearest(keyOf(j)) !== k) break
        x2++
      }
      if (!runs.has(k)) runs.set(k, [])
      runs.get(k)!.push(`<rect x="${x}" y="${y}" width="${x2 - x}" height="1"/>`)
      x = x2
    }
  }
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ]
  for (const [k, rects] of runs) {
    const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255
    const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
    parts.push(`<g fill="${hex}">${rects.join('')}</g>`)
  }
  parts.push('</svg>')
  return parts.join('\n')
}
