/**
 * Image Studio UI host plugin.
 * Serves /imagestudio workbench + JSON API on the official dsh webServer.
 * Original code — pattern inspired by DSH client chrome hooks, not VisioWork source.
 */
import { readFile, readdir, stat, mkdtemp, mkdir, writeFile, rm, rename } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { runGenerateOnContext } from '../../core/src/pipeline.ts'
import { JobStore } from '../../core/src/jobs.ts'
import type { ImageRequest } from '../../core/src/types.ts'
import { studioPage } from './studio-page.ts'
import { defaultProject, placeResultNode, placeVideoResult, resolvePrompt, type CanvasProject } from './canvas-graph.ts'
import { buildEcomPlan, type EcomPlan } from './ecom-plan.ts'
import { assertInsideWorkspace, toWorkspaceRelative } from '../../assets/src/paths.ts'
import { extForMime, OpenAIImageProvider } from '../../provider-openai/src/index.ts'
import { PathEscapeError, ToolArgsError } from '../../core/src/errors.ts'
import { decodeImage, encodeGif, encodePng, quantizeToSvg } from '../../compose/src/index.ts'
import { blitRegion, compositeOver, cropRegion, removeBackground } from '../../compose/src/region.ts'
import { createSolid } from '../../compose/src/png.ts'
import { readZip, writeZip } from '../../compose/src/zip.ts'
import {
  WEB_FILES,
  type WebFile,
  applyLineEdits,
  importAssets,
  newProjectId,
  numberLines,
  parseFileSections,
  parseLineEdits,
  readProject,
  webcloneDir,
  writeProject,
} from './webclone.ts'
import { cacheTemplateImages, fetchTemplateSource, listTemplates, readTemplateAsset } from './templates.ts'
import { readEmbeddedClip } from '../../provider-mock/src/clip.ts'
import { isMissingFfmpeg } from '../../provider-mock/src/video.ts'

const MAX_UPLOAD = 10 * 1024 * 1024

export const name = 'image-ui'
export const inject = ['imagegen', 'imageSkills', 'imageAssets', 'imageCompose']

export const Config = Schema.object({})

const DIR = fileURLToPath(new URL('.', import.meta.url))

type WebServer = {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>
  }): () => void
  tapIndex?: (tap: (html: string) => string) => () => void
}

function readRaw(req: import('node:http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return readRaw(req).then((buf) => buf.toString('utf8'))
}

function pngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }
  return { width: 0, height: 0 }
}

function parseMultipart(buf: Buffer, contentType: string): { bytes: Buffer; filename: string; mime: string } {
  const bm = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  const boundary = (bm?.[1] || bm?.[2] || '').trim()
  if (!boundary) throw new Error('multipart boundary missing')
  const sep = Buffer.from(`--${boundary}`)
  let start = buf.indexOf(sep)
  if (start < 0) throw new Error('no multipart body')
  start += sep.length
  if (buf[start] === 13 && buf[start + 1] === 10) start += 2
  const next = buf.indexOf(sep, start)
  const part = buf.subarray(start, next < 0 ? buf.length : next)
  const splitAt = part.indexOf(Buffer.from('\r\n\r\n'))
  if (splitAt < 0) throw new Error('malformed multipart')
  const head = part.subarray(0, splitAt).toString('utf8')
  let body = part.subarray(splitAt + 4)
  if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
    body = body.subarray(0, body.length - 2)
  }
  const fn = /filename="([^"]+)"/i.exec(head)
  const ct = /content-type:\s*([^\r\n]+)/i.exec(head)
  return {
    filename: fn?.[1] || 'upload.png',
    mime: ct?.[1]?.trim() || 'application/octet-stream',
    bytes: Buffer.from(body),
  }
}

function send(res: import('node:http').ServerResponse, status: number, body: unknown, type = 'application/json; charset=utf-8') {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
  })
  res.end(raw)
}

const MEDIA_EXT = /\.(png|jpe?g|gif|webp|mp4|webm)$/i

function mimeForName(name: string): string {
  if (/\.mp4$/i.test(name)) return 'video/mp4'
  if (/\.webm$/i.test(name)) return 'video/webm'
  if (/\.gif$/i.test(name)) return 'image/gif'
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg'
  if (/\.webp$/i.test(name)) return 'image/webp'
  return 'image/png'
}

interface AssetItem {
  path: string
  mime: string
  title: string
  kind: 'generated' | 'uploaded'
  session: string
  task: string
  size: number
  mtime: number
  sha256: string
}

/** 素材库全量扫描：生成产物（session/task 目录）+ 用户上传（uploads/）。sha256 只对分页切片计算。 */
async function listWorkspaceAssets(ctx: Context): Promise<AssetItem[]> {
  const out: AssetItem[] = []
  const index = await ctx.imageAssets.readIndex()
  for (const [session, tasks] of Object.entries(index)) {
    if (session === 'uploads' || session === 'backups') continue
    for (const task of tasks as string[]) {
      const dir = join(ctx.imageAssets.studioDir, session, task)
      const files = await readdir(dir).catch(() => [])
      for (const name of files.filter((n) => MEDIA_EXT.test(n))) {
        const abs = join(dir, name)
        const st = await stat(abs).catch(() => null)
        if (!st || !st.isFile() || st.size <= 0) continue
        out.push({
          path: join('.dsh/image-studio', session, task, name).replace(/\\/g, '/'),
          mime: mimeForName(name),
          title: name,
          kind: 'generated',
          session,
          task,
          size: st.size,
          mtime: st.mtimeMs,
          sha256: '',
        })
      }
    }
  }
  const upDir = join(ctx.imageAssets.studioDir, 'uploads')
  const upFiles = await readdir(upDir).catch(() => [])
  for (const name of upFiles.filter((n) => MEDIA_EXT.test(n))) {
    const abs = join(upDir, name)
    const st = await stat(abs).catch(() => null)
    if (!st || !st.isFile() || st.size <= 0) continue
    out.push({
      path: join('.dsh/image-studio', 'uploads', name).replace(/\\/g, '/'),
      mime: mimeForName(name),
      title: name,
      kind: 'uploaded',
      session: 'uploads',
      task: '',
      size: st.size,
      mtime: st.mtimeMs,
      sha256: '',
    })
  }
  out.sort((a, b) => b.mtime - a.mtime)
  return out
}

/** 上传/重命名的文件名清洗：剥掉路径分隔与非法字符，拒绝穿越。 */
function sanitizeAssetName(raw: string): string {
  const name = (raw.split(/[/\\]/).pop() || '').replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_')
  if (!name || name.includes('..') || name.startsWith('.')) return ''
  return name
}

interface UiSliceProposal { x: number; y: number; w: number; h: number; label: string }

// 从模型输出里抠出 JSON 数组并逐条校验/裁剪到合法范围。
// 模型可能裹代码块或带解释文字，只取第一个 '[' 到最后一个 ']' 之间的内容。
function parseSliceJson(text: string): UiSliceProposal[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('模型输出里没有 JSON 数组')
  let arr: unknown
  try {
    arr = JSON.parse(text.slice(start, end + 1))
  } catch (err) {
    throw new Error(`JSON 解析失败：${err instanceof Error ? err.message : String(err)}`)
  }
  if (!Array.isArray(arr)) throw new Error('模型输出的不是数组')
  const out: UiSliceProposal[] = []
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const x = Number(r.x), y = Number(r.y), w = Number(r.w), h = Number(r.h)
    if (![x, y, w, h].every(Number.isFinite)) continue
    const cx = Math.max(0, Math.min(0.99, x)), cy = Math.max(0, Math.min(0.99, y))
    const cw = Math.max(0.005, Math.min(1 - cx, w)), ch = Math.max(0.005, Math.min(1 - cy, h))
    out.push({ x: cx, y: cy, w: cw, h: ch, label: typeof r.label === 'string' ? r.label.slice(0, 40) : '' })
  }
  return out
}

async function persist(ctx: Context, req: ImageRequest, providerId?: string, signal?: AbortSignal) {
  const out = await runGenerateOnContext(ctx, req, { providerId, signal })
  if ('blocked' in out || 'passed' in out) return out
  const taskId = randomUUID()
  const images = []
  for (let i = 0; i < out.images.length; i++) {
    const img = out.images[i] as { bytes?: Uint8Array; width: number; height: number; mime?: string; path?: string }
    const bytes = img.bytes ?? new Uint8Array()
    const ext = extForMime(img.mime)
    const name = req.shotId ? `${req.shotId}-${i + 1}${ext}` : `shot-${i + 1}${ext}`
    if (bytes.length) images.push(await ctx.imageAssets.writeImage('studio', taskId, name, bytes, img))
    else images.push({ path: img.path, width: img.width, height: img.height, mime: img.mime })
  }
  await ctx.imageAssets.writeRequest('studio', taskId, req)
  return { taskId, images, providerId: out.providerId, model: out.model, notes: out.notes ?? [] }
}

interface SavedChannel {
  id: string
  protocol?: string
  model: string
  videoModel?: string
  editModel?: string
  visionModel?: string
  baseUrl: string
  apiKeyEnv: string
}

export function apply(ctx: Context): void {
  const jobStore = new JobStore(ctx.imageAssets.root)
  jobStore.failRunningOnBoot()

  const channelsFile = () => join(ctx.imageAssets.root, 'channels.json')
  const readSavedChannels = async (): Promise<SavedChannel[]> => {
    try {
      const raw = await readFile(channelsFile(), 'utf8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  // Restore channels saved through the settings UI in previous runs — they are
  // real provider registrations, so they must come back after a restart.
  void readSavedChannels()
    .then((saved) => {
      for (const c of saved) {
        try {
          if (ctx.imagegen.list().some((p) => p.id === c.id)) continue
          ctx.imagegen.register(c.id, new OpenAIImageProvider(c))
        } catch (err) {
          console.warn('[imagestudio] restore channel failed:', c.id, err)
        }
      }
    })
    .catch((err) => console.warn('[imagestudio] read channels.json failed:', err))


  const attach = (webCtx: Context) => {
    const web = (webCtx as Context & { webServer?: WebServer }).webServer
    if (!web || typeof web.register !== 'function') return

    const entryJsPath = join(DIR, 'entry.js')

    const disposePage = web.register({
      kind: 'prefix',
      path: '/imagestudio',
      handler: async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://127.0.0.1')
          if (url.pathname === '/imagestudio/entry.js') {
            const js = await readFile(entryJsPath, 'utf8')
            send(res, 200, js, 'text/javascript; charset=utf-8')
            return
          }
          if (url.pathname === '/imagestudio' || url.pathname === '/imagestudio/') {
            send(res, 200, studioPage({ embed: url.searchParams.get('embed') === '1' }), 'text/html; charset=utf-8')
            return
          }
          if (url.pathname === '/imagestudio/api/meta' && (!req.method || req.method === 'GET')) {
            const skills = ctx.imageSkills.list().map((s) => ({
              id: s.preset.id,
              title: s.preset.title ?? s.preset.id,
              aspect: s.preset.constraints?.aspectRatio,
            }))
            send(res, 200, { skills, providers: ctx.imagegen.list() })
            return
          }
          // 素材库打包下载：?paths=a,b,c → ZIP 附件（compose/zip.ts 最小实现）
          if (url.pathname === '/imagestudio/api/assets/zip' && (!req.method || req.method === 'GET')) {
            const paths = (url.searchParams.get('paths') ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 100)
            if (!paths.length) {
              send(res, 400, { error: 'paths required（逗号分隔的工作区相对路径）' })
              return
            }
            try {
              const entries: Array<{ name: string; data: Uint8Array }> = []
              const used = new Set<string>()
              for (const rel of paths) {
                const abs = join(ctx.imageAssets.root, rel)
                assertInsideWorkspace(ctx.imageAssets.studioDir, abs)
                const data = new Uint8Array(await readFile(abs))
                let name = rel.split('/').pop() || 'file'
                if (used.has(name)) name = `${used.size}-${name}`
                used.add(name)
                entries.push({ name, data })
              }
              const zip = writeZip(entries)
              res.writeHead(200, {
                'content-type': 'application/zip',
                'content-disposition': 'attachment; filename="imagestudio-assets.zip"',
                'cache-control': 'no-store',
              })
              res.end(Buffer.from(zip))
            } catch (err) {
              const status = err instanceof PathEscapeError ? 403 : 404
              send(res, status, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          // 我的素材：?q= 搜索、?type=generated|uploaded|all、offset/limit 分页
          if (url.pathname === '/imagestudio/api/assets' && (!req.method || req.method === 'GET')) {
            const index = await ctx.imageAssets.readIndex()
            const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
            const type = url.searchParams.get('type') ?? 'all'
            const kindFilter = type === 'generated' || type === 'uploaded' ? type : ''
            const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)
            const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 48))
            let all = await listWorkspaceAssets(ctx)
            if (kindFilter) all = all.filter((a) => a.kind === kindFilter)
            if (q) all = all.filter((a) => (a.title + ' ' + a.path).toLowerCase().includes(q))
            const total = all.length
            const page = all.slice(offset, offset + limit)
            for (const item of page) {
              item.sha256 = createHash('sha256')
                .update(await readFile(join(ctx.imageAssets.root, item.path)))
                .digest('hex')
            }
            send(res, 200, { index, images: page, total, offset, limit })
            return
          }
          if (url.pathname === '/imagestudio/api/storage-info' && (!req.method || req.method === 'GET')) {
            send(res, 200, {
              root: resolve(ctx.imageAssets.root),
              studioDir: resolve(ctx.imageAssets.studioDir),
              keepLastTasks: ctx.imageAssets.keepLastTasks,
            })
            return
          }
          if (url.pathname === '/imagestudio/api/file' && (!req.method || req.method === 'GET')) {
            const rel = url.searchParams.get('path') ?? ''
            try {
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const bytes = await readFile(abs)
              const mime = rel.endsWith('.mp4') ? 'video/mp4' : rel.endsWith('.webm') ? 'video/webm' : rel.endsWith('.gif') ? 'image/gif' : 'image/png'
              res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' })
              res.end(bytes)
            } catch (err) {
              const status = err instanceof PathEscapeError ? 403 : 404
              send(res, status, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          if (url.pathname === '/imagestudio/api/templates' && (!req.method || req.method === 'GET')) {
            // 模板库：多来源清单（内置 + 远程缓存），预览图已改写到本地路由
            send(res, 200, await listTemplates(ctx.imageAssets.root))
            return
          }
          if (url.pathname === '/imagestudio/api/templates/asset' && (!req.method || req.method === 'GET')) {
            const f = url.searchParams.get('f') ?? ''
            try {
              const { bytes, mime } = await readTemplateAsset(ctx.imageAssets.root, f)
              res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' })
              res.end(bytes)
            } catch (err) {
              send(res, 404, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          if (url.pathname === '/imagestudio/api/jobs' && (!req.method || req.method === 'GET')) {
            send(res, 200, { jobs: jobStore.list() })
            return
          }
          // 网页复刻静态预览：/imagestudio/web/<id>/index.html 等，仅白名单文件
          if (url.pathname === '/imagestudio/api/webclone/project' && (!req.method || req.method === 'GET')) {
            const id = url.searchParams.get('id') ?? ''
            if (!/^[a-z0-9-]{4,16}$/.test(id)) {
              send(res, 400, { error: 'id 不合法' })
              return
            }
            try {
              const files = await readProject(ctx.imageAssets.root, id)
              send(res, 200, { id, files, previewUrl: `/imagestudio/web/${id}/index.html` })
            } catch (err) {
              send(res, 404, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          if (url.pathname.startsWith('/imagestudio/web/') && (!req.method || req.method === 'GET')) {
            const rest = url.pathname.slice('/imagestudio/web/'.length)
            const seg = rest.split('/')
            const id = seg[0] || ''
            const file = seg.slice(1).join('/')
            const idOk = /^[a-z0-9-]{4,16}$/.test(id)
            const fileOk = WEB_FILES.includes(file as WebFile) || /^assets\/[a-zA-Z0-9._-]+$/.test(file)
            if (!idOk || !fileOk) {
              send(res, 403, { error: '不允许的路径' })
              return
            }
            try {
              const abs = join(webcloneDir(ctx.imageAssets.root, id), file)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const bytes = await readFile(abs)
              const mime = file.endsWith('.html')
                ? 'text/html; charset=utf-8'
                : file.endsWith('.css')
                  ? 'text/css; charset=utf-8'
                  : file.endsWith('.js')
                    ? 'text/javascript; charset=utf-8'
                    : file.endsWith('.svg')
                      ? 'image/svg+xml'
                      : 'image/png'
              res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' })
              res.end(bytes)
            } catch (err) {
              send(res, 404, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          if (url.pathname === '/imagestudio/api/canvas' && (!req.method || req.method === 'GET')) {
            send(res, 200, { project: defaultProject() })
            return
          }
          if (req.method === 'POST' && url.pathname === '/imagestudio/api/upload') {
            const rawBuf = await readRaw(req)
            const headers = (req as { headers?: Record<string, string | string[] | undefined> }).headers ?? {}
            const ctype = String(headers['content-type'] ?? headers['Content-Type'] ?? '')
            let bytes = Buffer.alloc(0)
            let filename = 'upload.png'
            let mime = 'image/png'
            if (ctype.includes('multipart/form-data')) {
              const parsed = parseMultipart(rawBuf, ctype)
              bytes = parsed.bytes
              filename = parsed.filename
              mime = parsed.mime || 'image/png'
            } else {
              const body = rawBuf.length ? JSON.parse(rawBuf.toString('utf8')) : {}
              const b64 = String(body.data ?? body.bytes ?? '')
              bytes = Buffer.from(b64, 'base64')
              filename = String(body.filename ?? body.name ?? 'upload.png')
              mime = String(body.mime ?? 'image/png')
            }
            filename = (filename.split(/[/\\]/).pop() || 'upload.png').replace(/[^a-zA-Z0-9._-]/g, '_')
            if (!filename || filename.includes('..')) filename = 'upload.png'
            if (!bytes.length) {
              send(res, 400, { error: 'empty upload' })
              return
            }
            if (bytes.length > MAX_UPLOAD) {
              send(res, 413, { error: '超过大小限制 10MB' })
              return
            }
            const dim = pngSize(bytes)
            const ref = await ctx.imageAssets.writeImage('studio', randomUUID(), filename, bytes, {
              width: dim.width,
              height: dim.height,
              mime,
            })
            send(res, 200, { path: ref.path, width: ref.width, height: ref.height, mime: ref.mime })
            return
          }
          // 素材库上传：multipart（或 base64 JSON），≤10MB，落 .dsh/image-studio/uploads/
          if (req.method === 'POST' && url.pathname === '/imagestudio/api/assets/upload') {
            const rawBuf = await readRaw(req)
            const headers = (req as { headers?: Record<string, string | string[] | undefined> }).headers ?? {}
            const ctype = String(headers['content-type'] ?? headers['Content-Type'] ?? '')
            let bytes = Buffer.alloc(0)
            let filename = 'upload.png'
            let mime = 'image/png'
            try {
              if (ctype.includes('multipart/form-data')) {
                const parsed = parseMultipart(rawBuf, ctype)
                bytes = parsed.bytes
                filename = parsed.filename
                mime = parsed.mime || 'image/png'
              } else {
                const body = rawBuf.length ? JSON.parse(rawBuf.toString('utf8')) : {}
                const b64 = String(body.data ?? body.bytes ?? '')
                bytes = Buffer.from(b64, 'base64')
                filename = String(body.filename ?? body.name ?? 'upload.png')
                mime = String(body.mime ?? 'image/png')
              }
            } catch (err) {
              send(res, 400, { error: '上传体解析失败：' + (err instanceof Error ? err.message : String(err)) })
              return
            }
            if (!bytes.length) {
              send(res, 400, { error: 'empty upload' })
              return
            }
            if (bytes.length > MAX_UPLOAD) {
              send(res, 413, { error: '超过大小限制 10MB' })
              return
            }
            const clean = sanitizeAssetName(filename) || 'upload.png'
            const upDir = join(ctx.imageAssets.studioDir, 'uploads')
            await mkdir(upDir, { recursive: true })
            let name = clean
            let abs = join(upDir, name)
            if (await stat(abs).catch(() => null)) name = `${Date.now()}-${clean}`
            abs = join(upDir, name)
            assertInsideWorkspace(ctx.imageAssets.root, abs)
            await writeFile(abs, bytes)
            await ctx.imageAssets.rebuildIndex()
            send(res, 200, { ok: true, path: toWorkspaceRelative(ctx.imageAssets.root, abs), name, mime, size: bytes.length })
            return
          }
          if (req.method === 'POST' && url.pathname.startsWith('/imagestudio/api/')) {
            const raw = await readBody(req)
            const body = raw ? JSON.parse(raw) : {}
          if (url.pathname === '/imagestudio/api/backup') {
            const data = body.data
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
              send(res, 400, { error: '备份数据格式不对' })
              return
            }
            const dir = join(ctx.imageAssets.studioDir, 'backups')
            await mkdir(dir, { recursive: true })
            const name = `imagestudio-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
            const abs = resolve(join(ctx.imageAssets.studioDir, 'backups', name))
            assertInsideWorkspace(ctx.imageAssets.root, abs)
            await writeFile(abs, JSON.stringify({ app: 'imagestudio-backup', version: 1, exportedAt: new Date().toISOString(), data }, null, 2))
            send(res, 200, { ok: true, path: abs })
            return
          }
          // 素材库重命名：{path, name}，只允许 .dsh/image-studio 内的文件
          if (url.pathname === '/imagestudio/api/assets/rename') {
            const rel = String(body.path || '')
            const rawName = String(body.name || '').trim()
            if (!rel || !rawName) {
              send(res, 400, { error: 'path 与 name 都是必填' })
              return
            }
            let name = sanitizeAssetName(rawName)
            if (!name) {
              send(res, 400, { error: `文件名不合法：${rawName}` })
              return
            }
            try {
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.studioDir, abs)
              const st = await stat(abs).catch(() => null)
              if (!st || !st.isFile()) {
                send(res, 404, { error: `文件不存在：${rel}` })
                return
              }
              const oldExt = /\.\w+$/.exec(rel)?.[0] ?? ''
              if (oldExt && !new RegExp(`\\${oldExt}$`, 'i').test(name)) name += oldExt
              const dest = join(dirname(abs), name)
              assertInsideWorkspace(ctx.imageAssets.studioDir, dest)
              if (await stat(dest).catch(() => null)) {
                send(res, 409, { error: `已存在同名文件：${name}` })
                return
              }
              await rename(abs, dest)
              await ctx.imageAssets.rebuildIndex()
              send(res, 200, { ok: true, path: toWorkspaceRelative(ctx.imageAssets.root, dest), name })
            } catch (err) {
              const status = err instanceof PathEscapeError ? 403 : 500
              send(res, status, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          // 素材库删除：{paths[]}，只删 .dsh/image-studio 内的文件
          if (url.pathname === '/imagestudio/api/assets/delete') {
            const paths = (Array.isArray(body.paths) ? body.paths : []).filter((p: unknown): p is string => typeof p === 'string' && !!p).slice(0, 200)
            if (!paths.length) {
              send(res, 400, { error: 'paths 必填（数组）' })
              return
            }
            try {
              let deleted = 0
              const missing: string[] = []
              for (const rel of paths) {
                const abs = join(ctx.imageAssets.root, rel)
                assertInsideWorkspace(ctx.imageAssets.studioDir, abs)
                const st = await stat(abs).catch(() => null)
                if (!st || !st.isFile()) {
                  missing.push(rel)
                  continue
                }
                await rm(abs)
                deleted++
              }
              await ctx.imageAssets.rebuildIndex()
              send(res, 200, { ok: true, deleted, missing })
            } catch (err) {
              const status = err instanceof PathEscapeError ? 403 : 500
              send(res, status, { error: err instanceof Error ? err.message : String(err) })
            }
            return
          }
          // 渠道管理：保存 = 真实注册 provider（不再只是 localStorage 摆设），
          // 并落盘 channels.json 让重启后仍在。密钥永远只引用环境变量名。
          if (url.pathname === '/imagestudio/api/channels' && req.method === 'POST') {
            const id = String(body.id || '').trim()
            const baseUrl = String(body.baseUrl || '').trim().replace(/\/$/, '')
            const apiKeyEnv = String(body.apiKeyEnv || 'IMAGE_STUDIO_KEY').trim()
            const model = String(body.model || '').trim()
            const videoModel = String(body.videoModel || '').trim()
            const editModel = String(body.editModel || '').trim()
            const visionModel = String(body.visionModel || '').trim()
            if (!id || !baseUrl || !model) {
              send(res, 400, { error: '渠道 id、地址、模型都是必填' })
              return
            }
            if (!/^https?:\/\//.test(baseUrl)) {
              send(res, 400, { error: `地址格式不对（应以 http(s):// 开头）：${baseUrl}` })
              return
            }
            if (!process.env[apiKeyEnv]) {
              send(res, 400, { error: `鉴权问题：环境变量 ${apiKeyEnv} 未设置或为空，请先配置密钥再保存渠道` })
              return
            }
            const provider = new OpenAIImageProvider({ id, model, baseUrl, apiKeyEnv, ...(videoModel ? { videoModel } : {}), ...(editModel ? { editModel } : {}), ...(visionModel ? { visionModel } : {}) })
            ctx.imagegen.register(id, provider)
            const saved = await readSavedChannels()
            const next = saved.filter((c) => c.id !== id).concat([{ id, protocol: 'openai-image', model, ...(videoModel ? { videoModel } : {}), ...(editModel ? { editModel } : {}), ...(visionModel ? { visionModel } : {}), baseUrl, apiKeyEnv }])
            await writeFile(channelsFile(), JSON.stringify(next, null, 2))
            send(res, 200, { ok: true, providers: ctx.imagegen.list() })
            return
          }
          if (url.pathname === '/imagestudio/api/key-status' && req.method === 'POST') {
            const env = String(body.apiKeyEnv || '').trim()
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(env)) {
              send(res, 400, { error: '环境变量名格式不对' })
              return
            }
            // 只回答"是否已配置"，绝不回传密钥值本身
            send(res, 200, { env, configured: Boolean(process.env[env]) })
            return
          }
          if (url.pathname === '/imagestudio/api/channels/detect' && req.method === 'POST') {
            const baseUrl = String(body.baseUrl || '').trim().replace(/\/$/, '')
            const apiKeyEnv = String(body.apiKeyEnv || 'IMAGE_STUDIO_KEY').trim()
            if (!/^https?:\/\//.test(baseUrl)) {
              send(res, 400, { error: `地址格式不对（应以 http(s):// 开头）：${baseUrl || '(空)'}` })
              return
            }
            const key = process.env[apiKeyEnv]
            if (!key) {
              send(res, 400, { error: `鉴权问题：环境变量 ${apiKeyEnv} 未设置或为空` })
              return
            }
            try {
              const upstream = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${key}` } })
              if (!upstream.ok) {
                send(res, 502, { error: `上游返回 ${upstream.status}：${upstream.status === 401 || upstream.status === 403 ? '密钥鉴权失败' : '请检查地址与渠道状态'}` })
                return
              }
              const payload = (await upstream.json()) as { data?: Array<{ id?: string }> }
              const ids = (payload.data ?? []).map((m) => String(m.id ?? '')).filter(Boolean)
              const usable = ids.filter((mid) => {
                const low = mid.toLowerCase()
                const media = /image|imagen|imagine|dall|seedream|flux|banana|video|veo|sora|wanx|kling|hailuo/.test(low)
                const excluded = /embedding|embed|rerank|whisper|tts|moderation|audio/.test(low)
                return media && !excluded
              })
              // 一些中转站把同一模型在多个命名空间前缀下重复挂载
              // （如 grok-imagine-edit / grok/grok-imagine-edit / x-ai/grok-imagine-edit /
              // xai/grok-imagine-edit 四份），按去掉厂商前缀后的裸名去重，
              // 优先保留不带前缀的那条，避免检测结果里塞满看似不同实则同一个模型的重复项。
              const seen = new Map<string, string>()
              for (const mid of usable) {
                const bare = mid.replace(/^(grok|x-ai|xai)\//i, '')
                const existing = seen.get(bare)
                if (!existing || (existing.includes('/') && !mid.includes('/'))) seen.set(bare, mid)
              }
              const deduped = [...seen.values()]
              send(res, 200, { total: ids.length, models: deduped })
            } catch (err) {
              const e = err as Error & { cause?: Error }
              send(res, 502, { error: `连不上渠道地址 ${baseUrl}：${[e.message, e.cause?.message].filter(Boolean).join(' ← ')}` })
            }
            return
          }
            if (url.pathname === '/imagestudio/api/plan') {
              const plan = ctx.imageSkills.compile(body.skillId, body.brief, {
                wantPoster: !!body.wantPoster,
                mode: typeof body.mode === 'string' ? body.mode : undefined,
              })
              const score = await ctx.serial('image/score', plan)
              if (score) plan.selfCheck = score as typeof plan.selfCheck
              ctx.imageSkills.plans.set(plan.id, plan)
              await ctx.imageAssets.writePlan('studio', plan.id, plan)
              send(res, 200, {
                passed: plan.selfCheck.passed,
                planId: plan.id,
                plan,
                score: plan.selfCheck.score,
                failures: plan.selfCheck.failures,
              })
              return
            }
            if (url.pathname === '/imagestudio/api/generate') {
              const plan = body.planId ? ctx.imageSkills.plans.get(body.planId) : undefined
              const force = body.force === true
              // 评分/veto 闸门（SPEC §0.4 / §3）：带 planId 且 plan 未通过 → 默认 422，
              // body 结构逐字遵守冻结契约；force:true 放行。无 planId 的裸生成不受此门限制。
              if (plan && plan.selfCheck && plan.selfCheck.passed === false && !force) {
                const threshold = ctx.imageSkills.get(plan.skillId)?.preset?.scoring?.threshold ?? 0
                send(res, 422, {
                  error: {
                    code: 'PLAN_REJECTED',
                    score: plan.selfCheck.score ?? 0,
                    threshold,
                    failures: plan.selfCheck.failures ?? [],
                    veto: plan.selfCheck.veto ?? null,
                  },
                })
                return
              }
              const shot = plan && body.shotId ? plan.shots.find((s) => s.id === body.shotId) : plan?.shots[0]
              const refs = (Array.isArray(body.assets) ? body.assets : Array.isArray(body.refImages) ? body.refImages : []).filter(
                (p: unknown): p is string => typeof p === 'string' && !!p,
              )
              const reqImg: ImageRequest = {
                prompt: body.prompt || shot?.prompt || '',
                negative: body.negative ?? shot?.negative,
                aspectRatio: body.aspectRatio || shot?.aspectRatio || '1:1',
                clarity: body.clarity,
                n: body.n ?? 1,
                refUsage: refs.length ? 'image-to-image' : plan?.constraints.referenceImages.usage ?? 'analysis-only',
                refImages: refs.length
                  ? refs.map((path) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' }))
                  : undefined,
                plan,
                shotId: body.shotId,
                force: body.force === true,
              }
              if (force) {
                // TODO-merge：M1 的 pipeline 闸门合并后 ImageRequest.force 生效，
                // 这里先在 UI 路由层透传，合并后自然进入 request 对象。
                ;(reqImg as unknown as Record<string, unknown>).force = true
              }
              if (!reqImg.prompt) {
                send(res, 400, { error: 'prompt or planId required' })
                return
              }
              const job = jobStore.create({ kind: 'image', prompt: reqImg.prompt })
              try {
                const out = await persist(ctx, reqImg, body.providerId, job.controller.signal)
                jobStore.finish(job.id, 'done')
                send(res, 200, { jobId: job.id, ...out })
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                // SPEC §0.4：plan 未通过且无 force:true → HTTP 422 + 结构化细节
                if (err instanceof ToolArgsError && err.code === 'PLAN_REJECTED') {
                  jobStore.finish(job.id, 'failed', err.message)
                  send(res, 422, { jobId: job.id, error: { code: 'PLAN_REJECTED', ...err.details } })
                  return
                }
                // 兜底：非结构化 PLAN_REJECTED 统一映射回冻结的 422 结构
                if (msg.startsWith('PLAN_REJECTED')) {
                  jobStore.finish(job.id, 'failed', msg)
                  send(res, 422, {
                    error: {
                      code: 'PLAN_REJECTED',
                      score: plan?.selfCheck?.score ?? 0,
                      threshold: plan ? (ctx.imageSkills.get(plan.skillId)?.preset?.scoring?.threshold ?? 0) : 0,
                      failures: plan?.selfCheck?.failures ?? [],
                      veto: plan?.selfCheck?.veto ?? null,
                    },
                  })
                  return
                }
                const aborted = job.controller.signal.aborted || (err as Error).name === 'AbortError'
                jobStore.finish(job.id, aborted ? 'canceled' : 'failed', msg)
                send(res, aborted ? 200 : 500, { jobId: job.id, status: aborted ? 'canceled' : 'failed', error: msg })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/video') {
              let provider
              try {
                provider = ctx.imagegen.resolveCapable(body.providerId, 'video')
              } catch (err) {
                send(res, 400, { error: err instanceof Error ? err.message : String(err) })
                return
              }
              const job = jobStore.create({ kind: 'video', prompt: body.prompt || '' })
              try {
                const raw = await provider.generateVideo({
                  prompt: body.prompt || '',
                  durationSec: Number(body.durationSec) || 2,
                  aspectRatio: body.aspectRatio || '16:9',
                  firstFramePath: body.firstFramePath,
                  lastFramePath: body.lastFramePath,
                }, job.controller.signal)
                const bytes = (raw as { bytes?: Uint8Array }).bytes ?? new Uint8Array()
                const taskId = randomUUID()
                const ref = await ctx.imageAssets.writeImage('studio', taskId, 'clip.mp4', bytes, {
                  width: raw.width,
                  height: raw.height,
                  mime: 'video/mp4',
                })
                jobStore.finish(job.id, 'done')
                send(res, 200, {
                  jobId: job.id,
                  taskId,
                  path: ref.path,
                  url: ref.path,
                  width: raw.width,
                  height: raw.height,
                  durationSec: raw.durationSec,
                  mime: 'video/mp4',
                  providerId: raw.providerId,
                  model: raw.model,
                })
              } catch (err) {
                const aborted = job.controller.signal.aborted || (err as Error).name === 'AbortError'
                jobStore.finish(job.id, aborted ? 'canceled' : 'failed', err instanceof Error ? err.message : String(err))
                send(res, aborted ? 200 : 500, {
                  jobId: job.id,
                  status: aborted ? 'canceled' : 'failed',
                  error: err instanceof Error ? err.message : String(err),
                })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/canvas' && req.method === 'POST') {
              send(res, 200, { project: body.project || defaultProject() })
              return
            }
            if (url.pathname === '/imagestudio/api/canvas/generate') {
              const project = (body.project || defaultProject()) as CanvasProject
              const configNodeId = body.configNodeId || project.nodes.find((n) => n.type === 'config')?.id
              if (!configNodeId) {
                send(res, 400, { error: 'configNodeId required' })
                return
              }
              const resolved = resolvePrompt(project, configNodeId)
              const cfg = project.nodes.find((n) => n.id === configNodeId)
              const reqImg: ImageRequest = {
                prompt: resolved.prompt || body.prompt || 'canvas',
                aspectRatio: cfg?.ratio || body.aspectRatio || '1:1',
                clarity: cfg?.clarity || body.clarity,
                n: cfg?.n ?? 1,
                refUsage: resolved.refImages.length ? 'image-to-image' : 'analysis-only',
                refImages: resolved.refImages.map((path) => ({
                  path,
                  width: 0,
                  height: 0,
                  mime: 'image/png',
                  sha256: '',
                })),
              }
              const job = jobStore.create({ kind: 'image', prompt: reqImg.prompt })
              try {
                const out = await persist(ctx, reqImg, cfg?.providerId || body.providerId, job.controller.signal)
                jobStore.finish(job.id, 'done')
                const images = (out as { images?: Array<{ path: string }> }).images || []
                let next = project
                for (const img of images) {
                  if (img.path) next = placeResultNode(next, configNodeId, img)
                }
                send(res, 200, { jobId: job.id, project: next, images })
              } catch (err) {
                const aborted = job.controller.signal.aborted || (err as Error).name === 'AbortError'
                jobStore.finish(job.id, aborted ? 'canceled' : 'failed', err instanceof Error ? err.message : String(err))
                send(res, aborted ? 200 : 500, { error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/ecom/preview') {
              const plan = buildEcomPlan({ sku: body.sku || '', uses: body.uses })
              send(res, 200, { ...plan, generated: false })
              return
            }
            if (url.pathname === '/imagestudio/api/ecom/confirm') {
              const plan = (body.plan || buildEcomPlan({ sku: body.sku || '', uses: body.uses })) as EcomPlan
              const job = jobStore.create({ kind: 'image', prompt: `ecom:${plan.sku}` })
              try {
                const images: Array<Record<string, unknown>> = []
                let heroPath = ''
                for (const shot of plan.shots) {
                  const reqImg: ImageRequest = {
                    prompt: shot.prompt,
                    aspectRatio: shot.aspectRatio || '1:1',
                    n: 1,
                    refUsage: heroPath && shot.role !== 'hero' ? 'image-to-image' : 'analysis-only',
                    refImages: heroPath
                      ? [{ path: heroPath, width: 0, height: 0, mime: 'image/png', sha256: '' }]
                      : undefined,
                    shotId: shot.id,
                  }
                  const out = await persist(ctx, reqImg, body.providerId, job.controller.signal)
                  const first = (out as { images?: Array<{ path: string }> }).images?.[0]
                  if (shot.role === 'hero' && first?.path) heroPath = first.path
                  if (first) images.push({ ...first, role: shot.role, usage: shot.usage, title: shot.title, prompt: shot.prompt })
                }
                jobStore.finish(job.id, 'done')
                send(res, 200, { jobId: job.id, sku: plan.sku, count: images.length, images })
              } catch (err) {
                const aborted = job.controller.signal.aborted || (err as Error).name === 'AbortError'
                jobStore.finish(job.id, aborted ? 'canceled' : 'failed', err instanceof Error ? err.message : String(err))
                send(res, aborted ? 200 : 500, { error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/gif') {
              const n = Math.max(2, Math.min(8, Number(body.n) || 4))
              const durationSec = Math.max(1, Math.min(8, Number(body.durationSec) || 2))
              const job = jobStore.create({ kind: 'image', prompt: body.prompt || 'gif' })
              try {
                const refs = (Array.isArray(body.assets) ? body.assets : []).filter((p: unknown): p is string => typeof p === 'string' && !!p)
                const reqImg: ImageRequest = {
                  prompt: body.prompt || 'gif',
                  aspectRatio: body.aspectRatio || '1:1',
                  n,
                  refUsage: refs.length ? 'image-to-image' : 'analysis-only',
                  refImages: refs.length
                    ? refs.map((path: string) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' }))
                    : undefined,
                }
                const out = await persist(ctx, reqImg, body.providerId, job.controller.signal)
                const images = (out as { images?: Array<{ path: string; width: number; height: number }> }).images || []
                const absFrames = images.map((img) => join(ctx.imageAssets.root, img.path)).filter(Boolean)
                if (absFrames.length < 2) throw new Error('need at least 2 frames for gif')
                const dir = await mkdtemp(join(tmpdir(), 'dsh-gif-'))
                const dest = join(dir, 'shot.gif')
                try {
                  for (let i = 0; i < absFrames.length; i++) {
                    await writeFile(join(dir, `frame-${i}.png`), await readFile(absFrames[i]))
                  }
                  const rate = (absFrames.length / durationSec).toFixed(4)
                  let bytes: Buffer
                  try {
                    await runFfmpeg([
                      '-y',
                      '-framerate', rate,
                      '-i', join(dir, 'frame-%d.png'),
                      '-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                      dest,
                    ], job.controller.signal)
                    bytes = await readFile(dest)
                  } catch (err) {
                    if (!isMissingFfmpeg(err)) throw err
                    const frames = []
                    for (const p of absFrames) frames.push(decodeImage(await readFile(p)))
                    const delayCs = Math.max(2, Math.round((durationSec * 100) / frames.length))
                    bytes = Buffer.from(encodeGif(frames, delayCs))
                  }
                  const taskId = randomUUID()
                  const ref = await ctx.imageAssets.writeImage('studio', taskId, 'shot.gif', bytes, {
                    width: images[0]?.width || 0,
                    height: images[0]?.height || 0,
                    mime: 'image/gif',
                  })
                  jobStore.finish(job.id, 'done')
                  send(res, 200, {
                    jobId: job.id,
                    taskId,
                    path: ref.path,
                    url: ref.path,
                    mime: 'image/gif',
                    width: ref.width,
                    height: ref.height,
                    frames: absFrames.length,
                    frameList: images,
                    durationSec,
                  })
                } finally {
                  await rm(dir, { recursive: true, force: true })
                }
              } catch (err) {
                const aborted = job.controller.signal.aborted || (err as Error).name === 'AbortError'
                jobStore.finish(job.id, aborted ? 'canceled' : 'failed', err instanceof Error ? err.message : String(err))
                send(res, aborted ? 200 : 500, { jobId: job.id, status: aborted ? 'canceled' : 'failed', error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            // GIF 重编码：帧条挑选 + 帧延时(50-500ms)/循环次数 → 本地 encodeGif，不走 ffmpeg
            if (url.pathname === '/imagestudio/api/gif/recode') {
              const frames = (Array.isArray(body.frames) ? body.frames : []).filter((p: unknown): p is string => typeof p === 'string' && !!p).slice(0, 24)
              if (!frames.length) {
                send(res, 400, { error: 'frames 必填（至少 1 帧的工作区相对路径）' })
                return
              }
              const delayMs = Math.max(50, Math.min(500, Number(body.delayMs) || 250))
              const loop = Math.max(0, Math.min(65535, Number(body.loop) || 0))
              try {
                const decoded = []
                for (const rel of frames) {
                  const abs = join(ctx.imageAssets.root, rel)
                  assertInsideWorkspace(ctx.imageAssets.root, abs)
                  decoded.push(decodeImage(new Uint8Array(await readFile(abs))))
                }
                const bytes = Buffer.from(encodeGif(decoded, Math.max(2, Math.round(delayMs / 10)), loop))
                const ref = await ctx.imageAssets.writeImage('studio', randomUUID(), 'shot.gif', bytes, {
                  width: decoded[0].width,
                  height: decoded[0].height,
                  mime: 'image/gif',
                })
                send(res, 200, {
                  path: ref.path,
                  url: ref.path,
                  mime: 'image/gif',
                  width: ref.width,
                  height: ref.height,
                  frames: decoded.length,
                  delayMs,
                  loop,
                })
              } catch (err) {
                const status = err instanceof PathEscapeError ? 403 : 500
                send(res, status, { error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/video/frame') {
              const rel = String(body.path || '')
              if (!rel) {
                send(res, 400, { error: 'path required' })
                return
              }
              try {
                const abs = join(ctx.imageAssets.root, rel)
                assertInsideWorkspace(ctx.imageAssets.root, abs)
                const t = Math.max(0, Number(body.t) || 0)
                const dir = await mkdtemp(join(tmpdir(), 'dsh-frame-'))
                const dest = join(dir, 'frame.png')
                try {
                  let bytes: Buffer
                  try {
                    await runFfmpeg(['-y', '-ss', String(t), '-i', abs, '-frames:v', '1', dest])
                    bytes = await readFile(dest)
                  } catch (err) {
                    if (!isMissingFfmpeg(err)) throw err
                    const raw = await readFile(abs)
                    const clip = readEmbeddedClip(raw)
                    if (clip) bytes = Buffer.from(clip.png)
                    else if (raw[0] === 0x89 && raw[1] === 0x50) bytes = raw
                    else throw err
                  }
                  const dim = pngSize(bytes)
                  const ref = await ctx.imageAssets.writeImage('studio', randomUUID(), 'frame.png', bytes, {
                    width: dim.width,
                    height: dim.height,
                    mime: 'image/png',
                  })
                  send(res, 200, { path: ref.path, width: ref.width, height: ref.height, mime: 'image/png', t })
                } finally {
                  await rm(dir, { recursive: true, force: true })
                }
              } catch (err) {
                const status = err instanceof PathEscapeError ? 403 : 500
                send(res, status, { error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/cancel') {
              const id = body.jobId || body.id
              if (!id) {
                send(res, 400, { error: 'jobId required' })
                return
              }
              const job = jobStore.cancel(id)
              send(res, 200, { jobId: job.id, status: job.status })
              return
            }
            if (url.pathname === '/imagestudio/api/edit') {
              const reqImg: ImageRequest = {
                prompt: body.prompt,
                aspectRatio: body.aspectRatio ?? '3:4',
                n: body.n ?? 1,
                refImages: (body.assets ?? []).map((path: string) => ({ path, width: 0, height: 0, mime: 'image/png', sha256: '' })),
                refUsage: 'image-to-image',
              }
              send(res, 200, await persist(ctx, reqImg, body.providerId))
              return
            }
            // 局部重绘：整图送上游编辑，返回后只把框内区域贴回原图。
            // 框外像素与原图逐位一致，框线只存在于坐标参数，不进像素。
            if (url.pathname === '/imagestudio/api/edit-region') {
              const rel = String(body.path || '')
              const box = body.box as { x: number; y: number; w: number; h: number } | undefined
              const prompt = String(body.prompt || '').trim()
              if (!rel || !box || !prompt) {
                send(res, 400, { error: 'path、box、prompt 都是必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const originalBytes = new Uint8Array(await readFile(abs))
              const original = decodeImage(originalBytes)
              const bx = {
                x: Math.max(0, Math.round(box.x)),
                y: Math.max(0, Math.round(box.y)),
                w: Math.max(1, Math.round(box.w)),
                h: Math.max(1, Math.round(box.h)),
              }
              if (bx.x + bx.w > original.width || bx.y + bx.h > original.height) {
                send(res, 400, { error: `标注框超出图片范围（图 ${original.width}x${original.height}）` })
                return
              }
              const provider = ctx.imagegen.resolveCapable(body.providerId, 'generate')
              if (!provider.info().canMaskEdit) {
                send(res, 400, { error: `渠道 ${provider.id}（${provider.info().protocol}）不支持遮罩/局部编辑，请在选择器里换支持的渠道` })
                return
              }
              const edited = await provider.generate({
                prompt,
                aspectRatio: '自动',
                n: 1,
                refUsage: 'image-to-image',
                refImages: [{ path: rel, width: original.width, height: original.height, mime: 'image/png', sha256: '' }],
              })
              const editedBytes = (edited.images[0] as { bytes?: Uint8Array } | undefined)?.bytes
              if (!editedBytes?.length) throw new Error('上游未返回图片字节')
              const editedImg = decodeImage(editedBytes)
              blitRegion(original, editedImg, bx)
              const png = encodePng(original)
              const taskId = randomUUID()
              const ref = await ctx.imageAssets.writeImage('studio', taskId, 'region-edit.png', png, {
                width: original.width,
                height: original.height,
                mime: 'image/png',
              })
              send(res, 200, { taskId, images: [ref], providerId: edited.providerId, model: edited.model })
              return
            }
            // 移除背景：纯本地算法（边缘泛洪），不碰上游，产出带透明通道 PNG。
            if (url.pathname === '/imagestudio/api/remove-bg') {
              const rel = String(body.path || '')
              if (!rel) {
                send(res, 400, { error: 'path 必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const decoded = decodeImage(new Uint8Array(await readFile(abs)))
              const tolerance = Math.max(0, Math.min(128, Number(body.tolerance) || 32))
              const cut = removeBackground(decoded, tolerance)
              const png = encodePng(cut)
              const taskId = randomUUID()
              const ref = await ctx.imageAssets.writeImage('studio', taskId, 'no-bg.png', png, {
                width: cut.width,
                height: cut.height,
                mime: 'image/png',
              })
              send(res, 200, { taskId, images: [ref], local: true })
              return
            }
            // 切片包导出：原图 + 每切片裁剪 PNG + manifest.json 打成 ZIP。
            if (url.pathname === '/imagestudio/api/ui-export') {
              const rel = String(body.path || '')
              const slices = Array.isArray(body.slices) ? body.slices : []
              if (!rel || !slices.length) {
                send(res, 400, { error: 'path 与 slices 必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const rawBytes = new Uint8Array(await readFile(abs))
              const decoded = decodeImage(rawBytes)
              const entries = [{ name: `original${rel.endsWith('.jpg') || rel.endsWith('.jpeg') ? '.jpg' : '.png'}`, data: rawBytes }]
              const manifestSlices = []
              for (let i = 0; i < slices.length; i++) {
                const s = slices[i] as { x: number; y: number; w: number; h: number; label?: string; radius?: unknown }
                const box = {
                  x: s.x * decoded.width,
                  y: s.y * decoded.height,
                  w: s.w * decoded.width,
                  h: s.h * decoded.height,
                }
                const crop = cropRegion(decoded, box)
                const name = `slice-${String(i + 1).padStart(2, '0')}.png`
                entries.push({ name, data: encodePng(crop) })
                manifestSlices.push({
                  x: s.x, y: s.y, w: s.w, h: s.h,
                  label: typeof s.label === 'string' ? s.label : '',
                  radius: s.radius ?? { tl: 0, tr: 0, br: 0, bl: 0 },
                  file: name,
                  width: crop.width,
                  height: crop.height,
                })
              }
              const manifest = {
                format: 'imagestudio-ui-slices@1',
                kind: body.kind === 'full' ? 'full' : 'slices',
                source: rel,
                image: entries[0].name,
                naturalWidth: decoded.width,
                naturalHeight: decoded.height,
                slices: manifestSlices,
              }
              // 完整设计包：切片处理产物 + 网页复刻项目一起打包
              if (body.kind === 'full') {
                for (let i = 0; i < slices.length; i++) {
                  const variants = (slices[i] as { variants?: Record<string, string> }).variants
                  if (!variants) continue
                  for (const [mode, vpath] of Object.entries(variants)) {
                    try {
                      const vabs = join(ctx.imageAssets.root, String(vpath))
                      assertInsideWorkspace(ctx.imageAssets.root, vabs)
                      const vbytes = new Uint8Array(await readFile(vabs))
                      const ext = String(vpath).split('.').pop() || 'png'
                      entries.push({ name: `variants/slice-${String(i + 1).padStart(2, '0')}.${mode}.${ext}`, data: vbytes })
                    } catch (err) {
                      manifestSlices[i].variantErrors = manifestSlices[i].variantErrors || []
                      manifestSlices[i].variantErrors.push(`${mode}: ${err instanceof Error ? err.message : String(err)}`)
                    }
                  }
                }
                const webId = String(body.webId || '')
                if (/^[a-z0-9-]{4,16}$/.test(webId)) {
                  try {
                    const project = await readProject(ctx.imageAssets.root, webId)
                    entries.push({ name: 'web/index.html', data: new TextEncoder().encode(project.html) })
                    entries.push({ name: 'web/style.css', data: new TextEncoder().encode(project.css) })
                    entries.push({ name: 'web/script.js', data: new TextEncoder().encode(project.js) })
                    ;(manifest as Record<string, unknown>).webId = webId
                  } catch (err) {
                    ;(manifest as Record<string, unknown>).webError = err instanceof Error ? err.message : String(err)
                  }
                }
              }
              entries.push({ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) })
              const zip = writeZip(entries)
              const taskId = randomUUID()
              const prefix = body.kind === 'full' ? 'ui-design-full' : 'ui-slices'
              const outRel = join('.dsh', 'image-studio', 'exports', `${prefix}-${taskId}.zip`)
              const outAbs = join(ctx.imageAssets.root, outRel)
              assertInsideWorkspace(ctx.imageAssets.root, outAbs)
              await mkdir(join(ctx.imageAssets.root, '.dsh', 'image-studio', 'exports'), { recursive: true })
              await writeFile(outAbs, zip)
              send(res, 200, { path: outRel.replace(/\\/g, '/'), slices: manifestSlices.length, bytes: zip.length })
              return
            }
            // 切片包还原：解 ZIP，原图回收入库，切片定义原样还给编辑器。
            if (url.pathname === '/imagestudio/api/ui-import') {
              const rel = String(body.path || '')
              if (!rel) {
                send(res, 400, { error: 'path 必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const entries = readZip(new Uint8Array(await readFile(abs)))
              const manifestEntry = entries.find((e) => e.name === 'manifest.json')
              if (!manifestEntry) {
                send(res, 400, { error: '包里没有 manifest.json，不是切片包' })
                return
              }
              const manifest = JSON.parse(new TextDecoder().decode(manifestEntry.data)) as {
                format?: string
                image?: string
                slices?: Array<{ x: number; y: number; w: number; h: number; label?: string; radius?: unknown }>
              }
              if (manifest.format !== 'imagestudio-ui-slices@1') {
                send(res, 400, { error: `不认识的切片包格式：${manifest.format ?? '(无 format 字段)'}` })
                return
              }
              const imgEntry = entries.find((e) => e.name === manifest.image)
              if (!imgEntry) {
                send(res, 400, { error: `包里缺原图 ${manifest.image}` })
                return
              }
              const sniffed = decodeImage(imgEntry.data)
              const taskId = randomUUID()
              const ref = await ctx.imageAssets.writeImage('studio', taskId, 'restored.png', encodePng(sniffed), {
                width: sniffed.width,
                height: sniffed.height,
                mime: 'image/png',
              })
              send(res, 200, {
                path: ref.path,
                width: ref.width,
                height: ref.height,
                slices: (manifest.slices ?? []).map((s, i) => ({
                  id: `slice-restored-${i + 1}`,
                  x: s.x, y: s.y, w: s.w, h: s.h,
                  label: s.label ?? '',
                  radius: s.radius ?? { tl: 0, tr: 0, br: 0, bl: 0 },
                })),
              })
              return
            }
            if (url.pathname === '/imagestudio/api/templates/fetch') {
              // 在线更新远程清单：由宿主抓取，浏览器不直连外网
              const url2 = String(body.url || '').trim()
              if (!url2) {
                send(res, 400, { error: 'url 必填' })
                return
              }
              try {
                send(res, 200, await fetchTemplateSource(ctx.imageAssets.root, url2))
              } catch (err) {
                send(res, 502, { error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/templates/cache') {
              // 离线缓存远程预览图
              send(res, 200, await cacheTemplateImages(ctx.imageAssets.root))
              return
            }
            if (url.pathname === '/imagestudio/api/describe') {
              const images = (body.assets ?? []).map((path: string) => ({ path }))
              try {
                // 支持指定视觉渠道；不指定时 resolveCapable 自动找能反推的渠道
                if (body.providerId) {
                  const provider = ctx.imagegen.resolveCapable(String(body.providerId), 'describe')
                  const text = await provider.describe!(images, body.instruction)
                  send(res, 200, { text, providerId: provider.id })
                } else {
                  const text = await ctx.imagegen.describe(images, body.instruction)
                  send(res, 200, { text })
                }
              } catch (err) {
                send(res, 400, { error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            // UI 设计模式：AI 提议切片。模型按严格 JSON 输出，解析失败自动重试一次；
            // 两次都失败则带原因报错（验收硬条目）。
            if (url.pathname === '/imagestudio/api/ui-slices') {
              const rel = String(body.path || '')
              if (!rel) {
                send(res, 400, { error: 'path 必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const instruction = '这是一张 UI 设计稿。找出可以切成独立素材的区域（图标、按钮、卡片、插图、头像、Logo、装饰图等）。'
                + '只输出一个 JSON 数组，不要任何其他文字、不要用代码块包裹。'
                + '每项格式 {"x":0.0,"y":0.0,"w":0.0,"h":0.0,"label":"中文名"}，坐标为 0 到 1 的相对值：x,y 是左上角，w,h 是宽高。'
                + '区域不要互相重叠，最多 12 个。'
              let lastErr = ''
              let done = false
              for (let attempt = 0; attempt < 2 && !done; attempt++) {
                try {
                  const text = await ctx.imagegen.describe(
                    [{ path: rel }],
                    instruction + (attempt ? '上一次你没有按格式输出。这次只输出 JSON 数组本身。' : ''),
                  )
                  const slices = parseSliceJson(String(text))
                  if (!slices.length) throw new Error('模型没有给出任何有效切片区域')
                  send(res, 200, { slices, attempts: attempt + 1 })
                  done = true
                } catch (err) {
                  lastErr = err instanceof Error ? err.message : String(err)
                }
              }
              if (!done) send(res, 502, { error: `AI 切片提议失败（已自动重试一次）：${lastErr}` })
              return
            }
            // 四种素材处理：算法抠透明 / AI 抠透明 / 算法转 SVG / AI 重绘 SVG。
            // 每种处理结果独立存文件、客户端记独立字段，撤销互不覆盖。
            if (url.pathname === '/imagestudio/api/ui-process') {
              const rel = String(body.path || '')
              const mode = String(body.mode || '')
              const s = body.slice as { x: number; y: number; w: number; h: number } | undefined
              if (!rel || !s || !['algo-alpha', 'ai-alpha', 'algo-svg', 'ai-svg'].includes(mode)) {
                send(res, 400, { error: 'path、slice 必填，mode 限 algo-alpha/ai-alpha/algo-svg/ai-svg' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const decoded = decodeImage(new Uint8Array(await readFile(abs)))
              const crop = cropRegion(decoded, {
                x: s.x * decoded.width,
                y: s.y * decoded.height,
                w: s.w * decoded.width,
                h: s.h * decoded.height,
              })
              const taskId = randomUUID()
              const writeAsset = async (name: string, bytes: Uint8Array, meta: Record<string, unknown>) => {
                const dir = join(ctx.imageAssets.root, '.dsh', 'image-studio', 'studio', taskId)
                await mkdir(dir, { recursive: true })
                await writeFile(join(dir, name), bytes)
                return { path: `.dsh/image-studio/studio/${taskId}/${name}`, ...meta }
              }
              if (mode === 'algo-alpha') {
                const cut = removeBackground(crop, Math.max(0, Math.min(128, Number(body.tolerance) || 32)))
                const out = await writeAsset('algo-alpha.png', encodePng(cut), { width: cut.width, height: cut.height, mime: 'image/png' })
                send(res, 200, { mode, ...out, local: true })
                return
              }
              if (mode === 'algo-svg') {
                const svg = quantizeToSvg(crop, Math.max(2, Math.min(32, Number(body.colors) || 12)))
                const out = await writeAsset('algo.svg', new TextEncoder().encode(svg), { width: crop.width, height: crop.height, mime: 'image/svg+xml' })
                send(res, 200, { mode, ...out, local: true, colors: (svg.match(/<g fill=/g) || []).length })
                return
              }
              // AI 类：抠透明走编辑模型，重绘 SVG 走视觉模型
              if (mode === 'ai-alpha') {
                const cropRef = await writeAsset('ai-alpha-src.png', encodePng(crop), { width: crop.width, height: crop.height, mime: 'image/png' })
                const provider = ctx.imagegen.resolveCapable(undefined, 'generate')
                const edited = await provider.generate({
                  prompt: 'Cut out the main subject of this image cleanly. Transparent background, no shadow, no border. Return the subject only.',
                  aspectRatio: '自动',
                  n: 1,
                  refUsage: 'image-to-image',
                  refImages: [{ path: cropRef.path, width: crop.width, height: crop.height, mime: 'image/png', sha256: '' }],
                })
                const bytes = (edited.images[0] as { bytes?: Uint8Array } | undefined)?.bytes
                if (!bytes?.length) throw new Error('上游未返回图片字节')
                const sniffed = decodeImage(bytes)
                const hasAlpha = (() => { for (let i = 3; i < sniffed.data.length; i += 4) if (sniffed.data[i] < 250) return true; return false })()
                const out = await writeAsset('ai-alpha.png', encodePng(sniffed), { width: sniffed.width, height: sniffed.height, mime: 'image/png' })
                send(res, 200, {
                  mode, ...out,
                  providerId: edited.providerId, model: edited.model,
                  alphaDetected: hasAlpha,
                  note: hasAlpha ? undefined : '上游返回不含透明像素（该编辑模型可能不支持透明通道），已如实保存原样',
                })
                return
              }
              // ai-svg：视觉模型看图重写为 SVG 源码，提取失败自动重试一次
              const cropRef = await writeAsset('ai-svg-src.png', encodePng(crop), { width: crop.width, height: crop.height, mime: 'image/png' })
              const svgInstruction = '把这张图重绘成 SVG 矢量图。只输出 SVG 源码本身（从 <svg 到 </svg>），不要任何解释、不要用代码块包裹。用简单的 path/rect/circle 逼近主体形状与配色。'
              let svgText = ''
              let lastErr = ''
              for (let attempt = 0; attempt < 2 && !svgText; attempt++) {
                try {
                  const text = String(await ctx.imagegen.describe([{ path: cropRef.path }], svgInstruction + (attempt ? '上一次输出里没有 SVG。这次只输出 <svg> 源码。' : '')))
                  const m = text.match(/<svg[\s\S]*<\/svg>/)
                  if (!m) throw new Error('模型输出里没有 <svg> 源码')
                  svgText = m[0]
                } catch (err) {
                  lastErr = err instanceof Error ? err.message : String(err)
                }
              }
              if (!svgText) {
                send(res, 502, { error: `AI 重绘 SVG 失败（已自动重试一次）：${lastErr}` })
                return
              }
              const out = await writeAsset('ai-redraw.svg', new TextEncoder().encode(svgText), { width: crop.width, height: crop.height, mime: 'image/svg+xml' })
              send(res, 200, { mode, ...out })
              return
            }
            // 背景填充：一次产出「本地合成」（抠透明+纯色底 alpha-over）与
            // 「AI 原图」（编辑模型按提示词重填背景）两版，AI 版失败如实带原因。
            if (url.pathname === '/imagestudio/api/ui-fill-bg') {
              const rel = String(body.path || '')
              const s = body.slice as { x: number; y: number; w: number; h: number } | undefined
              if (!rel || !s) {
                send(res, 400, { error: 'path 与 slice 必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const decoded = decodeImage(new Uint8Array(await readFile(abs)))
              const crop = cropRegion(decoded, {
                x: s.x * decoded.width,
                y: s.y * decoded.height,
                w: s.w * decoded.width,
                h: s.h * decoded.height,
              })
              const colorHex = /^#[0-9a-fA-F]{6}$/.test(String(body.color || '')) ? String(body.color) : '#ffffff'
              const cr = parseInt(colorHex.slice(1, 3), 16), cg = parseInt(colorHex.slice(3, 5), 16), cb = parseInt(colorHex.slice(5, 7), 16)
              const taskId = randomUUID()
              const writeAsset2 = async (name: string, bytes: Uint8Array, meta: Record<string, unknown>) => {
                const dir = join(ctx.imageAssets.root, '.dsh', 'image-studio', 'studio', taskId)
                await mkdir(dir, { recursive: true })
                await writeFile(join(dir, name), bytes)
                return { path: `.dsh/image-studio/studio/${taskId}/${name}`, ...meta }
              }
              // 本地合成版
              const cut = removeBackground(crop, 32)
              const base = createSolid(crop.width, crop.height, [cr, cg, cb, 255])
              compositeOver(base, cut)
              const localRef = await writeAsset2('fill-local.png', encodePng(base), { width: base.width, height: base.height, mime: 'image/png' })
              // AI 原图版（失败不拖垮本地版）
              let aiRef: Record<string, unknown> | null = null
              let aiError = ''
              try {
                const cropRef = await writeAsset2('fill-ai-src.png', encodePng(crop), { width: crop.width, height: crop.height, mime: 'image/png' })
                const provider = ctx.imagegen.resolveCapable(undefined, 'generate')
                const edited = await provider.generate({
                  prompt: `Keep the main subject of this image exactly as is. Replace the background with: ${String(body.prompt || 'a clean solid ' + colorHex + ' background')}.`,
                  aspectRatio: '自动',
                  n: 1,
                  refUsage: 'image-to-image',
                  refImages: [{ path: cropRef.path, width: crop.width, height: crop.height, mime: 'image/png', sha256: '' }],
                })
                const bytes = (edited.images[0] as { bytes?: Uint8Array } | undefined)?.bytes
                if (!bytes?.length) throw new Error('上游未返回图片字节')
                const sniffed = decodeImage(bytes)
                aiRef = await writeAsset2('fill-ai.png', encodePng(sniffed), { width: sniffed.width, height: sniffed.height, mime: 'image/png', providerId: edited.providerId, model: edited.model })
              } catch (err) {
                aiError = err instanceof Error ? err.message : String(err)
              }
              send(res, 200, { local: localRef, ai: aiRef, aiError: aiError || undefined })
              return
            }
            // 网页复刻：产出 index.html / style.css / script.js 三文件 + 只读 assets。
            // 解析失败自动重试一次；usage 来自视觉模型真实返回。
            if (url.pathname === '/imagestudio/api/webclone/start') {
              const rel = String(body.path || '')
              if (!rel) {
                send(res, 400, { error: 'path 必填' })
                return
              }
              const abs = join(ctx.imageAssets.root, rel)
              assertInsideWorkspace(ctx.imageAssets.root, abs)
              const assets = Array.isArray(body.assets) ? body.assets.map(String) : []
              for (const p of assets) assertInsideWorkspace(ctx.imageAssets.root, join(ctx.imageAssets.root, p))
              const id = newProjectId()
              const imported = assets.length ? await importAssets(ctx.imageAssets.root, id, assets) : []
              const assetNote = imported.length
                ? `可用的本地素材（写在 assets/ 目录，直接引用相对路径）：${imported.join(', ')}`
                : '没有本地素材可用，全部用 CSS 绘制。'
              const instruction = '把这张 UI 设计稿复刻成静态网页。产出恰好三个文件，用分块标记输出：\n'
                + '===FILE: index.html===\n（完整 HTML，用 <link rel="stylesheet" href="style.css"> 与 <script src="script.js"></script> 引用另外两个文件）\n'
                + '===FILE: style.css===\n（完整 CSS）\n'
                + '===FILE: script.js===\n（交互 JS，没有交互就留一行注释）\n'
                + assetNote + '\n'
                + '不要输出任何其他解释文字。' + (body.brief ? `\n页面要求：${String(body.brief).slice(0, 300)}` : '')
              let files: { html: string; css: string; js: string } | null = null
              let lastErr = ''
              for (let attempt = 0; attempt < 2 && !files; attempt++) {
                try {
                  const text = String(await ctx.imagegen.describe([{ path: rel }], instruction + (attempt ? '\n上一次输出缺文件分块，这次严格按 ===FILE: 名字=== 输出三个文件。' : '')))
                  files = parseFileSections(text)
                  if (!files) throw new Error('模型输出里没有凑齐三个 ===FILE:=== 分块')
                } catch (err) {
                  lastErr = err instanceof Error ? err.message : String(err)
                }
              }
              if (!files) {
                send(res, 502, { error: `网页复刻生成失败（已自动重试一次）：${lastErr}` })
                return
              }
              await writeProject(ctx.imageAssets.root, id, files)
              send(res, 200, {
                id,
                files,
                assets: imported,
                previewUrl: `/imagestudio/web/${id}/index.html`,
                usage: ctx.imagegen.lastDescribeUsage,
              })
              return
            }
            // 按行编辑：模型只准输出 @@ start-end 块，整篇重写会被拒绝。
            if (url.pathname === '/imagestudio/api/webclone/edit') {
              const id = String(body.id || '')
              const file = String(body.file || '') as WebFile
              const instruction = String(body.instruction || '').trim()
              if (!/^[a-z0-9-]{4,16}$/.test(id) || !WEB_FILES.includes(file) || !instruction) {
                send(res, 400, { error: 'id、file（index.html/style.css/script.js）、instruction 必填' })
                return
              }
              if (file.startsWith('assets/')) {
                send(res, 400, { error: 'assets 是只读素材区，不能编辑' })
                return
              }
              const project = await readProject(ctx.imageAssets.root, id)
              const current = file === 'index.html' ? project.html : file === 'style.css' ? project.css : project.js
              const editInstruction = '下面是文件 ' + file + ' 的当前内容（带行号）：\n' + numberLines(current) + '\n\n'
                + '修改要求：' + instruction + '\n'
                + '只输出若干行编辑块，格式：\n@@ 起始行-结束行\n新的行内容（可多行）\n'
                + '不要输出完整文件，不要解释。没有要改的就输出 @@ 0-0 空块。'
              let applied: { content: string; changed: number } | null = null
              let lastErr = ''
              for (let attempt = 0; attempt < 2 && !applied; attempt++) {
                try {
                  const text = String(await ctx.imagegen.describe([], editInstruction + (attempt ? '\n上一次你没按 @@ 格式输出，这次只输出行编辑块。' : '')))
                  const edits = parseLineEdits(text)
                  if (!edits.length) throw new Error('模型没有输出任何 @@ 行编辑块（拒绝整篇重写）')
                  applied = applyLineEdits(current, edits)
                } catch (err) {
                  lastErr = err instanceof Error ? err.message : String(err)
                }
              }
              if (!applied) {
                send(res, 502, { error: `按行编辑失败（已自动重试一次）：${lastErr}` })
                return
              }
              const next = { ...project }
              if (file === 'index.html') next.html = applied.content
              else if (file === 'style.css') next.css = applied.content
              else next.js = applied.content
              await writeProject(ctx.imageAssets.root, id, next)
              send(res, 200, { file, content: applied.content, changedLines: applied.changed, usage: ctx.imagegen.lastDescribeUsage })
              return
            }
            if (url.pathname === '/imagestudio/api/compose') {
              const assets = body.assets ?? []
              const bufs = []
              for (const p of assets) {
                const abs = join(ctx.imageAssets.root, p)
                assertInsideWorkspace(ctx.imageAssets.root, abs)
                bufs.push(await readFile(abs))
              }
              if (body.mode === 'triptych') {
                const out = ctx.imageCompose.triptych(bufs, { gapPx: body.gap ?? 10, ratios: body.ratios ?? '1:1:1' })
                const taskId = randomUUID()
                const ref = await ctx.imageAssets.writeImage('studio', taskId, 'triptych.png', out.png, {
                  width: out.width,
                  height: out.height,
                  mime: 'image/png',
                })
                send(res, 200, { taskId, images: [ref] })
                return
              }
              send(res, 400, { error: 'unsupported compose mode' })
              return
            }
          }
          send(res, 404, { error: 'not found' })
        } catch (err) {
          const status = err instanceof PathEscapeError ? 403 : 500
          send(res, status, { error: err instanceof Error ? err.message : String(err) })
        }
      },
    })

    const scriptTag = '<script src="/imagestudio/entry.js" defer></script>'
    let disposeTap: (() => void) | undefined
    if (typeof web.tapIndex === 'function') {
      disposeTap = web.tapIndex((html) => (html.includes(scriptTag) ? html : html.replace('</body>', `${scriptTag}</body>`)))
    }

    // Official preferred injection (webserver/index-inject). tapIndex remains fallback.
    const injectRow = (table: Array<Record<string, unknown>>) => {
      if (!table.some((r) => r.src === '/imagestudio/entry.js')) {
        table.push({ kind: 'script-src', placement: 'body', src: '/imagestudio/entry.js' })
      }
    }
    const disposeInject = typeof ctx.on === 'function' ? ctx.on('webserver/index-inject', injectRow) : undefined

    let disposeSlot: (() => void) | undefined
    // `slot` is not in this callback's inject list, so even reading the
    // property throws through the cordis proxy. Guard the access itself.
    let slotFn: unknown
    try {
      slotFn = (webCtx as unknown as Record<string, unknown>).slot
    } catch {
      slotFn = undefined
    }
    if (typeof slotFn === 'function') {
      try {
        disposeSlot = (slotFn as (name: string, opts: Record<string, unknown>, render?: () => string) => () => void).call(
          webCtx,
          'sidebar.panellist',
          { id: 'imagestudio', title: '技能台', href: '/imagestudio' },
          () => '',
        )
      } catch {
        disposeSlot = undefined
      }
    }

    ctx.effect(() => {
      return () => {
        disposePage()
        disposeTap?.()
        disposeInject?.()
        disposeSlot?.()
      }
    }, 'image-ui:routes')
  }

  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], attach)
  } else {
    attach(ctx)
  }
}

function runFfmpeg(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args])
    const errChunks: Buffer[] = []
    child.stderr?.on('data', (c: Buffer) => errChunks.push(c))
    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      if (err) reject(err)
      else resolve()
    }
    const onAbort = () => {
      child.kill('SIGKILL')
      finish(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    child.on('error', (err) => finish(err))
    child.on('exit', (code) => {
      if (code === 0) finish()
      else {
        const msg = Buffer.concat(errChunks).toString('utf8').trim()
        finish(new Error(`ffmpeg exited ${code}${msg ? `: ${msg}` : ''}`))
      }
    })
  })
}

export default { name, inject, Config, apply }
