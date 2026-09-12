export const ECOM_USES = [
  { id: 'hero', name: '主图白底', defaultN: 1 },
  { id: 'detail', name: '细节特写', defaultN: 1 },
  { id: 'scene', name: '场景氛围', defaultN: 1 },
  { id: 'scale', name: '尺寸对比', defaultN: 1 },
  { id: 'poster', name: '卖点海报', defaultN: 1 },
  { id: 'pack', name: '包装展示', defaultN: 1 },
] as const

export type EcomUseId = (typeof ECOM_USES)[number]['id']

export interface EcomUsePick {
  id: EcomUseId | string
  n: number
}

export interface EcomShot {
  id: string
  usage: string
  title: string
  prompt: string
  aspectRatio: string
  role: 'hero' | 'follow'
}

export interface EcomPlan {
  sku: string
  count: number
  shots: EcomShot[]
}

export function buildEcomPlan(input: { sku: string; uses?: EcomUsePick[] }): EcomPlan {
  const sku = (input.sku || '商品').trim()
  const picks = (input.uses && input.uses.length ? input.uses : ECOM_USES.map((u) => ({ id: u.id, n: u.defaultN }))).filter(
    (u) => u.n > 0,
  )
  const shots: EcomShot[] = []
  let heroPlaced = false
  for (const pick of picks) {
    const meta = ECOM_USES.find((u) => u.id === pick.id) ?? { id: pick.id, name: pick.id }
    const n = Math.max(1, Math.min(4, Math.round(pick.n)))
    for (let i = 0; i < n; i++) {
      const isHero = !heroPlaced && meta.id === 'hero'
      heroPlaced = heroPlaced || isHero
      shots.push({
        id: `${meta.id}-${i + 1}`,
        usage: meta.id,
        title: n > 1 ? `${meta.name} ${i + 1}` : meta.name,
        prompt: `${sku}，电商${meta.name}，同一件商品，干净棚拍光，商品完整可见`,
        aspectRatio: meta.id === 'poster' ? '3:4' : '1:1',
        role: isHero ? 'hero' : 'follow',
      })
    }
  }
  if (!shots.some((s) => s.role === 'hero') && shots[0]) shots[0].role = 'hero'
  return { sku, count: shots.length, shots }
}
