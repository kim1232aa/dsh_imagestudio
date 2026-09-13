/**
 * 模板库（7.7）后端：多来源清单、在线更新、图片离线缓存。
 *
 * 来源分两种：bundled（仓库 templates/ 内置精选）和 remote（用户贴的
 * 在线清单 URL，由宿主抓取后落到 .dsh/image-studio/templates/，浏览器
 * 不直连外网）。远程预览图可一键缓存到本地，断网也能浏览。
 */

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

export interface TemplateItem {
  id: string
  title: string
  category: string
  prompt: string
  negative?: string
  ratio?: string
  mode?: string
  preview?: string
  author?: string
  link?: string
  source?: string
}

export interface TemplateSource {
  id: string
  name: string
  origin: 'bundled' | 'remote'
  url?: string
  updatedAt?: string
  count?: number
}

const BUNDLED_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'templates')

function remoteDir(root: string): string {
  return join(root, '.dsh', 'image-studio', 'templates')
}

function cacheDir(root: string): string {
  return join(remoteDir(root), 'cache')
}

interface SourceFile {
  source: TemplateSource
  templates: TemplateItem[]
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

async function readCacheIndex(root: string): Promise<Record<string, string>> {
  return (await readJson<Record<string, string>>(join(remoteDir(root), 'cache.json'))) ?? {}
}

/** 汇总所有来源的模板；预览图改写到本地可服务的地址。 */
export async function listTemplates(root: string): Promise<{ sources: TemplateSource[]; templates: TemplateItem[] }> {
  const sources: TemplateSource[] = []
  const templates: TemplateItem[] = []
  const cache = await readCacheIndex(root)

  const bundled = await readJson<SourceFile>(join(BUNDLED_DIR, 'builtin.json'))
  if (bundled) {
    sources.push({ ...bundled.source, origin: 'bundled', count: bundled.templates.length })
    for (const t of bundled.templates) {
      templates.push({
        ...t,
        source: 'builtin',
        preview: t.preview ? `/imagestudio/api/templates/asset?f=${encodeURIComponent(t.preview)}` : undefined,
      })
    }
  }

  let remoteFiles: string[] = []
  try {
    remoteFiles = (await readdir(remoteDir(root))).filter((f) => f.endsWith('.json') && f !== 'cache.json')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  for (const f of remoteFiles) {
    const sf = await readJson<SourceFile>(join(remoteDir(root), f))
    if (!sf || !Array.isArray(sf.templates)) continue
    const sid = sf.source?.id || f.replace(/\.json$/, '')
    sources.push({ ...sf.source, id: sid, origin: 'remote', count: sf.templates.length })
    for (const t of sf.templates) {
      let preview = t.preview
      if (preview && cache[preview]) preview = `/imagestudio/api/templates/asset?f=${encodeURIComponent('cache/' + cache[preview])}`
      templates.push({ ...t, source: sid, preview })
    }
  }
  return { sources, templates }
}

/** 在线更新：宿主抓取远程清单 JSON，校验后落盘。 */
export async function fetchTemplateSource(root: string, url: string): Promise<{ sources: TemplateSource[]; templates: TemplateItem[] }> {
  if (!/^https?:\/\//.test(url)) throw new Error(`清单地址应以 http(s):// 开头：${url}`)
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 20000)
  let text: string
  try {
    const resp = await fetch(url, { signal: ac.signal })
    if (!resp.ok) throw new Error(`清单拉取失败：HTTP ${resp.status} ${resp.statusText}`)
    text = await resp.text()
  } finally {
    clearTimeout(timer)
  }
  let parsed: SourceFile
  try {
    parsed = JSON.parse(text) as SourceFile
  } catch {
    throw new Error('清单不是合法 JSON，请确认地址指向模板清单文件')
  }
  if (!parsed || !Array.isArray(parsed.templates) || !parsed.templates.length) {
    throw new Error('清单里缺少 templates 数组或为空')
  }
  for (const t of parsed.templates) {
    if (!t.id || !t.title || !t.prompt) throw new Error(`模板条目缺少必填字段（id/title/prompt）：${JSON.stringify(t).slice(0, 80)}`)
  }
  const id = parsed.source?.id || createHash('sha1').update(url).digest('hex').slice(0, 10)
  const sf: SourceFile = {
    source: {
      id,
      name: parsed.source?.name || id,
      origin: 'remote',
      url,
      updatedAt: new Date().toISOString(),
    },
    templates: parsed.templates,
  }
  await mkdir(remoteDir(root), { recursive: true })
  await writeFile(join(remoteDir(root), `${id}.json`), JSON.stringify(sf, null, 2))
  return listTemplates(root)
}

/** 离线缓存：把所有远程预览图下载到本地，返回缓存数量与失败清单。 */
export async function cacheTemplateImages(root: string): Promise<{ cached: number; failed: string[] }> {
  const { templates } = await listTemplates(root)
  const cache = await readCacheIndex(root)
  const urls = [...new Set(templates.map((t) => t.preview).filter((p): p is string => !!p && /^https?:\/\//.test(p)))]
  let cached = 0
  const failed: string[] = []
  await mkdir(cacheDir(root), { recursive: true })
  for (const url of urls) {
    if (cache[url]) continue
    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 20000)
      const resp = await fetch(url, { signal: ac.signal })
      clearTimeout(timer)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const bytes = Buffer.from(await resp.arrayBuffer())
      const ext = url.endsWith('.png') ? 'png' : url.endsWith('.webp') ? 'webp' : url.endsWith('.gif') ? 'gif' : 'jpg'
      const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.${ext}`
      await writeFile(join(cacheDir(root), name), bytes)
      cache[url] = name
      cached++
    } catch (err) {
      failed.push(`${url}（${err instanceof Error ? err.message : String(err)}）`)
    }
  }
  await writeFile(join(remoteDir(root), 'cache.json'), JSON.stringify(cache, null, 2))
  return { cached, failed }
}

/** 模板静态资源：bundled 走仓库 templates/，cache/ 前缀走本地缓存目录。 */
export async function readTemplateAsset(root: string, f: string): Promise<{ bytes: Buffer; mime: string }> {
  const base = f.startsWith('cache/') ? cacheDir(root) : BUNDLED_DIR
  const rel = f.startsWith('cache/') ? f.slice(6) : f
  if (rel.includes('..') || rel.startsWith('/') || /^[a-zA-Z]:/.test(rel)) {
    throw new Error(`非法资源路径：${f}`)
  }
  const abs = join(base, rel)
  const bytes = await readFile(abs)
  const mime = rel.endsWith('.png') ? 'image/png'
    : rel.endsWith('.webp') ? 'image/webp'
    : rel.endsWith('.gif') ? 'image/gif'
    : rel.endsWith('.svg') ? 'image/svg+xml'
    : 'image/jpeg'
  return { bytes, mime }
}
