/**
 * 网页复刻（7.6）：设计稿 → 三个文件（index.html / style.css / script.js）
 * + 只读 assets；后续修改走「按行编辑」协议，整篇重写会被拒绝。
 *
 * 行编辑协议（模型输出）：
 *   @@ 12-15
 *   新的第 12 行
 *   ...
 * 闭区间 [start,end] 替换为块内行；多块从后往前应用，行号不位移。
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const WEB_FILES = ['index.html', 'style.css', 'script.js'] as const
export type WebFile = (typeof WEB_FILES)[number]

export interface WebcloneStart {
  html: string
  css: string
  js: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

/** 解析 ===FILE: xxx=== 分块的三文件输出；不齐返回 null。 */
export function parseFileSections(text: string): { html: string; css: string; js: string } | null {
  const re = /===FILE:\s*(index\.html|style\.css|script\.js)\s*===/g
  const marks: Array<{ name: string; start: number; end: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) marks.push({ name: m[1], start: m.index, end: m.index + m[0].length })
  if (marks.length < 3) return null
  const sections: Record<string, string> = {}
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length
    sections[marks[i].name] = text.slice(marks[i].end, end).trim()
  }
  if (!sections['index.html'] || !sections['style.css'] || !sections['script.js']) return null
  return { html: sections['index.html'], css: sections['style.css'], js: sections['script.js'] }
}

export interface LineEdit {
  start: number
  end: number
  lines: string[]
}

/** 解析 @@ start-end 块。 */
export function parseLineEdits(text: string): LineEdit[] {
  const lines = text.split('\n')
  const edits: LineEdit[] = []
  let cur: LineEdit | null = null
  for (const line of lines) {
    const m = line.match(/^@@\s*(\d+)\s*-\s*(\d+)\s*$/)
    if (m) {
      if (cur) edits.push(cur)
      cur = { start: Number(m[1]), end: Number(m[2]), lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    }
  }
  if (cur) edits.push(cur)
  return edits.filter((e) => e.start >= 1 && e.end >= e.start)
}

/** 应用行编辑；改动超过总行数 80% 视为变相整篇重写，拒绝。 */
export function applyLineEdits(content: string, edits: LineEdit[]): { content: string; changed: number } {
  const lines = content.split('\n')
  const totalBefore = lines.length
  const sorted = [...edits].sort((a, b) => b.start - a.start)
  let changed = 0
  for (const e of sorted) {
    if (e.start > lines.length) throw new Error(`行号越界：${e.start}（文件共 ${lines.length} 行）`)
    const removed = Math.min(e.end, lines.length) - e.start + 1
    lines.splice(e.start - 1, removed, ...e.lines)
    changed += Math.max(removed, e.lines.length)
  }
  if (totalBefore > 10 && changed > totalBefore * 0.8) {
    throw new Error(`改动 ${changed} 行超过全文 80%，接近整篇重写，已拒绝（按行编辑要求局部修改）`)
  }
  return { content: lines.join('\n'), changed }
}

/** 给文件内容加行号，供模型按行定位。 */
export function numberLines(content: string): string {
  return content.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')
}

export function webcloneDir(root: string, id: string): string {
  return join(root, '.dsh', 'image-studio', 'web', id)
}

export async function readProject(root: string, id: string): Promise<{ html: string; css: string; js: string }> {
  const dir = webcloneDir(root, id)
  const [html, css, js] = await Promise.all([
    readFile(join(dir, 'index.html'), 'utf8'),
    readFile(join(dir, 'style.css'), 'utf8'),
    readFile(join(dir, 'script.js'), 'utf8'),
  ])
  return { html, css, js }
}

export async function writeProject(root: string, id: string, files: { html: string; css: string; js: string }): Promise<void> {
  const dir = webcloneDir(root, id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'index.html'), files.html)
  await writeFile(join(dir, 'style.css'), files.css)
  await writeFile(join(dir, 'script.js'), files.js)
}

/** 复制切片产物到项目 assets/（只读素材区），返回可用相对路径列表。 */
export async function importAssets(root: string, id: string, assetPaths: string[]): Promise<string[]> {
  const dir = join(webcloneDir(root, id), 'assets')
  await mkdir(dir, { recursive: true })
  const out: string[] = []
  for (const p of assetPaths) {
    const base = p.split(/[/\\]/).pop() || 'asset.png'
    const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_')
    await copyFile(join(root, p), join(dir, safe))
    out.push(`assets/${safe}`)
  }
  return out
}

export function newProjectId(): string {
  return randomUUID().slice(0, 8)
}
