/**
 * 区域合成与本地图像处理。
 *
 * 局部重绘的验收硬指标是「框外区域与原图像素级一致、成品图不带红框」，
 * 所以做法是把整图发给上游编辑，回来后只把**框内区域**贴回原图——
 * 框只存在于 UI 与坐标参数里，从不画进像素。
 *
 * 移除背景必须本地完成（不消耗上游额度）：从四边泛洪收集背景色并抠除。
 */

import type { RgbaImage } from './png.ts'

export interface RegionBox {
  x: number
  y: number
  w: number
  h: number
}

/** 把 box（以 dst 像素计）等比映射到 src 的像素坐标。 */
function mapBox(box: RegionBox, dstW: number, dstH: number, srcW: number, srcH: number): RegionBox {
  return {
    x: Math.round((box.x / dstW) * srcW),
    y: Math.round((box.y / dstH) * srcH),
    w: Math.max(1, Math.round((box.w / dstW) * srcW)),
    h: Math.max(1, Math.round((box.h / dstH) * srcH)),
  }
}

/**
 * 把 src 图中与 dst 的 box 对应比例的区域，贴到 dst 的 box 上。
 * src 与 dst 尺寸不同（上游可能改分辨率）时按最近邻缩放。
 */
export function blitRegion(dst: RgbaImage, src: RgbaImage, box: RegionBox): void {
  const sb = mapBox(box, dst.width, dst.height, src.width, src.height)
  for (let dy = 0; dy < box.h; dy++) {
    const ty = box.y + dy
    if (ty < 0 || ty >= dst.height) continue
    const sy = Math.min(src.height - 1, sb.y + Math.floor((dy / box.h) * sb.h))
    for (let dx = 0; dx < box.w; dx++) {
      const tx = box.x + dx
      if (tx < 0 || tx >= dst.width) continue
      const sx = Math.min(src.width - 1, sb.x + Math.floor((dx / box.w) * sb.w))
      const si = (sy * src.width + sx) * 4
      const di = (ty * dst.width + tx) * 4
      dst.data[di] = src.data[si]
      dst.data[di + 1] = src.data[si + 1]
      dst.data[di + 2] = src.data[si + 2]
      dst.data[di + 3] = src.data[si + 3]
    }
  }
}

/**
 * 本地移除背景：边缘聚色（最多 3 簇）+ 从四边泛洪，把与某一边缘色簇
 * 相近且与边缘连通的像素置透明。适合纯色/近纯色背景的产品图、图标；
 * 复杂背景会残留（算法类的诚实边界，验收只要求"产出带透明通道的 PNG
 * 且本地完成"）。安全阀：若一次抠除超过 85% 像素，说明背景模型把主体
 * 也吞了，自动减半容差重试，避免灾难性误抠。
 */

/** 对边缘采样色做 k-means（k 1-3，按散布度选择），返回簇中心。 */
function edgeClusters(data: Uint8Array, width: number, height: number): number[][] {
  const pts: number[][] = []
  const step = Math.max(1, Math.floor(Math.max(width, height) / 64))
  // 采样深度随图尺寸收小，小图上 3 行会穿透到图心
  const edge = Math.max(1, Math.min(3, Math.floor(Math.min(width, height) / 8)))
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < edge && y < height; y++) {
      const t = (y * width + x) * 4, b = ((height - 1 - y) * width + x) * 4
      pts.push([data[t], data[t + 1], data[t + 2]], [data[b], data[b + 1], data[b + 2]])
    }
  }
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < edge && x < width; x++) {
      const l = (y * width + x) * 4, r = (y * width + (width - 1 - x)) * 4
      pts.push([data[l], data[l + 1], data[l + 2]], [data[r], data[r + 1], data[r + 2]])
    }
  }
  // 散布度小（近纯色背景）时一簇就够
  let mr = 0, mg = 0, mb = 0
  for (const p of pts) { mr += p[0]; mg += p[1]; mb += p[2] }
  mr /= pts.length; mg /= pts.length; mb /= pts.length
  let spread = 0
  for (const p of pts) {
    spread += Math.max(Math.abs(p[0] - mr), Math.abs(p[1] - mg), Math.abs(p[2] - mb))
  }
  spread /= pts.length
  const k = spread < 12 ? 1 : spread < 40 ? 2 : 3
  // k-means，确定性初始化：按亮度排序等距取种子
  const sorted = pts.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))
  const centers: number[][] = []
  for (let j = 0; j < k; j++) centers.push(sorted[Math.floor(((j + 0.5) / k) * sorted.length)].slice())
  const assign = new Int32Array(pts.length)
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < pts.length; i++) {
      let best = 0, bd = Infinity
      for (let j = 0; j < k; j++) {
        const d = Math.max(
          Math.abs(pts[i][0] - centers[j][0]),
          Math.abs(pts[i][1] - centers[j][1]),
          Math.abs(pts[i][2] - centers[j][2]))
        if (d < bd) { bd = d; best = j }
      }
      assign[i] = best
    }
    for (let j = 0; j < k; j++) {
      let sr = 0, sg = 0, sb = 0, n = 0
      for (let i = 0; i < pts.length; i++) {
        if (assign[i] !== j) continue
        sr += pts[i][0]; sg += pts[i][1]; sb += pts[i][2]; n++
      }
      if (n) centers[j] = [sr / n, sg / n, sb / n]
    }
  }
  return centers
}

function floodCut(img: RgbaImage, centers: number[][], tolerance: number): { out: RgbaImage; removed: number } {
  const { width, height, data } = img
  const out = new Uint8Array(data)
  const close = (i: number) => {
    for (const c of centers) {
      if (Math.abs(data[i] - c[0]) <= tolerance &&
          Math.abs(data[i + 1] - c[1]) <= tolerance &&
          Math.abs(data[i + 2] - c[2]) <= tolerance) return true
    }
    return false
  }
  const visited = new Uint8Array(width * height)
  const queue: number[] = []
  const push = (x: number, y: number) => {
    const p = y * width + x
    if (visited[p]) return
    if (!close(p * 4)) return
    visited[p] = 1
    queue.push(p)
  }
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1) }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y) }
  let removed = 0
  while (queue.length) {
    const p = queue.pop() as number
    out[p * 4 + 3] = 0
    removed++
    const x = p % width
    const y = (p - x) / width
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }
  return { out: { width, height, data: out }, removed }
}

/** 盒式平均缩小到长边 ≤ maxSide，抑制逐像素噪声（噪声会让泛洪穿孔）。 */
function downscale(img: RgbaImage, maxSide: number): RgbaImage {
  const scale = Math.max(img.width, img.height) / maxSide
  if (scale <= 1) return img
  const w = Math.max(1, Math.round(img.width / scale))
  const h = Math.max(1, Math.round(img.height / scale))
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * scale), y1 = Math.min(img.height, Math.ceil((y + 1) * scale))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * scale), x1 = Math.min(img.width, Math.ceil((x + 1) * scale))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * img.width + sx) * 4
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]; n++
        }
      }
      const o = (y * w + x) * 4
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n
    }
  }
  return { width: w, height: h, data: out }
}

export function removeBackground(img: RgbaImage, tolerance = 32): RgbaImage {
  // 在小图上聚色+泛洪（降噪 + 提速），得到背景掩码后最近邻放大回原尺寸
  const small = downscale(img, 640)
  const centers = edgeClusters(small.data, small.width, small.height)
  const total = small.width * small.height
  let tol = tolerance
  let bg: RgbaImage | null = null
  // 安全阀：抠除率 >85% 视为背景模型误吞主体，减半容差重试（最多 3 次）
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = floodCut(small, centers, tol)
    bg = r.out
    if (r.removed / total <= 0.85 || attempt === 2) break
    tol = Math.max(4, Math.floor(tol / 2))
  }
  const cut = bg as RgbaImage
  const out = new Uint8Array(img.data)
  for (let y = 0; y < img.height; y++) {
    const sy = Math.min(cut.height - 1, Math.floor((y / img.height) * cut.height))
    for (let x = 0; x < img.width; x++) {
      const sx = Math.min(cut.width - 1, Math.floor((x / img.width) * cut.width))
      if (cut.data[(sy * cut.width + sx) * 4 + 3] === 0) out[(y * img.width + x) * 4 + 3] = 0
    }
  }
  return { width: img.width, height: img.height, data: out }
}

/** 裁出 box 区域为独立图（box 以 img 像素计，越界自动收敛）。 */
export function cropRegion(img: RgbaImage, box: RegionBox): RgbaImage {
  const x = Math.max(0, Math.min(img.width - 1, Math.round(box.x)))
  const y = Math.max(0, Math.min(img.height - 1, Math.round(box.y)))
  const w = Math.max(1, Math.min(img.width - x, Math.round(box.w)))
  const h = Math.max(1, Math.min(img.height - y, Math.round(box.h)))
  const data = new Uint8Array(w * h * 4)
  for (let row = 0; row < h; row++) {
    const si = ((y + row) * img.width + x) * 4
    data.set(img.data.subarray(si, si + w * 4), row * w * 4)
  }
  return { width: w, height: h, data }
}

/** 标准 alpha-over：把 src 叠到 dst 上（src 透明处保留 dst）。同尺寸对齐 (0,0)。 */
export function compositeOver(dst: RgbaImage, src: RgbaImage): void {
  const w = Math.min(dst.width, src.width)
  const h = Math.min(dst.height, src.height)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * src.width + x) * 4
      const di = (y * dst.width + x) * 4
      const sa = src.data[si + 3] / 255
      if (sa >= 1) {
        dst.data[di] = src.data[si]
        dst.data[di + 1] = src.data[si + 1]
        dst.data[di + 2] = src.data[si + 2]
        dst.data[di + 3] = 255
        continue
      }
      if (sa <= 0) continue
      const da = dst.data[di + 3] / 255
      const outA = sa + da * (1 - sa)
      dst.data[di] = Math.round((src.data[si] * sa + dst.data[di] * da * (1 - sa)) / outA)
      dst.data[di + 1] = Math.round((src.data[si + 1] * sa + dst.data[di + 1] * da * (1 - sa)) / outA)
      dst.data[di + 2] = Math.round((src.data[si + 2] * sa + dst.data[di + 2] * da * (1 - sa)) / outA)
      dst.data[di + 3] = Math.round(outA * 255)
    }
  }
}
