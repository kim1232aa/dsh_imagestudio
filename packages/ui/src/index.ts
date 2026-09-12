/**
 * Image Studio UI host plugin.
 * Serves /imagestudio workbench + JSON API on the official dsh webServer.
 * Original code — pattern inspired by DSH client chrome hooks, not VisioWork source.
 */
import { readFile, readdir, stat, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { runGenerateOnContext } from '../../core/src/pipeline.ts'
import { JobStore } from '../../core/src/jobs.ts'
import type { ImageRequest } from '../../core/src/types.ts'
import { studioPage } from './studio-page.ts'
import { defaultProject, placeResultNode, placeVideoResult, resolvePrompt, type CanvasProject } from './canvas-graph.ts'
import { buildEcomPlan, type EcomPlan } from './ecom-plan.ts'
import { assertInsideWorkspace } from '../../assets/src/paths.ts'
import { PathEscapeError } from '../../core/src/errors.ts'

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

async function persist(ctx: Context, req: ImageRequest, providerId?: string, signal?: AbortSignal) {
  const out = await runGenerateOnContext(ctx, req, { providerId, signal })
  if ('blocked' in out || 'passed' in out) return out
  const taskId = randomUUID()
  const images = []
  for (let i = 0; i < out.images.length; i++) {
    const img = out.images[i] as { bytes?: Uint8Array; width: number; height: number; mime?: string; path?: string }
    const bytes = img.bytes ?? new Uint8Array()
    const name = req.shotId ? `${req.shotId}-${i + 1}.png` : `shot-${i + 1}.png`
    if (bytes.length) images.push(await ctx.imageAssets.writeImage('studio', taskId, name, bytes, img))
    else images.push({ path: img.path, width: img.width, height: img.height, mime: img.mime })
  }
  await ctx.imageAssets.writeRequest('studio', taskId, req)
  return { taskId, images, providerId: out.providerId, model: out.model, notes: out.notes ?? [] }
}

export function apply(ctx: Context): void {
  const jobStore = new JobStore(ctx.imageAssets.root)
  jobStore.failRunningOnBoot()

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
          if (url.pathname === '/imagestudio/api/assets' && (!req.method || req.method === 'GET')) {
            const index = await ctx.imageAssets.readIndex()
            const images: Array<{ path: string; mime: string; title: string; session: string; task: string }> = []
            for (const [session, tasks] of Object.entries(index)) {
              for (const task of (tasks as string[]).slice(-8).reverse()) {
                const dir = join(ctx.imageAssets.studioDir, session, task)
                const files = await readdir(dir).catch(() => [])
                for (const name of files.filter((n) => n.endsWith('.png') || n.endsWith('.mp4'))) {
                  const abs = join(dir, name)
                  const st = await stat(abs).catch(() => null)
                  if (!st || !st.isFile() || st.size <= 0) continue
                  const mime = name.endsWith('.mp4') ? 'video/mp4' : 'image/png'
                  images.push({
                    path: join('.dsh/image-studio', session, task, name).replace(/\\/g, '/'),
                    mime,
                    title: name,
                    session,
                    task,
                  })
                }
              }
            }
            send(res, 200, { index, images: images.slice(0, 24) })
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
          if (url.pathname === '/imagestudio/api/jobs' && (!req.method || req.method === 'GET')) {
            send(res, 200, { jobs: jobStore.list() })
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
            const dim = pngSize(bytes)
            const ref = await ctx.imageAssets.writeImage('studio', randomUUID(), filename, bytes, {
              width: dim.width,
              height: dim.height,
              mime,
            })
            send(res, 200, { path: ref.path, width: ref.width, height: ref.height, mime: ref.mime })
            return
          }
          if (req.method === 'POST' && url.pathname.startsWith('/imagestudio/api/')) {
            const raw = await readBody(req)
            const body = raw ? JSON.parse(raw) : {}
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
                const aborted = job.controller.signal.aborted || (err as Error).name === 'AbortError'
                jobStore.finish(job.id, aborted ? 'canceled' : 'failed', err instanceof Error ? err.message : String(err))
                send(res, aborted ? 200 : 500, { jobId: job.id, status: aborted ? 'canceled' : 'failed', error: err instanceof Error ? err.message : String(err) })
              }
              return
            }
            if (url.pathname === '/imagestudio/api/video') {
              const provider = ctx.imagegen.resolve(body.providerId)
              if (typeof provider.generateVideo !== 'function') {
                send(res, 400, { error: '当前渠道没有内置视频协议。到设置填视频渠道，不要再装插件包。' })
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
                const out = await persist(ctx, reqImg, body.providerId, job.controller.signal)
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
                const reqImg: ImageRequest = {
                  prompt: body.prompt || 'gif',
                  aspectRatio: body.aspectRatio || '1:1',
                  n,
                  refUsage: 'analysis-only',
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
                  await runFfmpeg([
                    '-y',
                    '-framerate', rate,
                    '-i', join(dir, 'frame-%d.png'),
                    '-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                    dest,
                  ], job.controller.signal)
                  const bytes = await readFile(dest)
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
                  await runFfmpeg(['-y', '-ss', String(t), '-i', abs, '-frames:v', '1', dest])
                  const bytes = await readFile(dest)
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
            if (url.pathname === '/imagestudio/api/describe') {
              const text = await ctx.imagegen.describe(
                (body.assets ?? []).map((path: string) => ({ path })),
                body.instruction,
              )
              send(res, 200, { text })
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

    const faviconSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#e8e4d4"/></svg>'
    const disposeFav = web.register({
      kind: 'exact',
      path: '/favicon.ico',
      handler: async (_req, res) => {
        send(res, 200, faviconSvg, 'image/svg+xml; charset=utf-8')
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

    const slots = webCtx as Context & {
      slot?: (name: string, opts: Record<string, unknown>, render?: () => string) => () => void
    }
    let disposeSlot: (() => void) | undefined
    if (typeof slots.slot === 'function') {
      try {
        disposeSlot = slots.slot('sidebar.panellist', { id: 'imagestudio', title: '生图', href: '/imagestudio' }, () => '')
      } catch {
        disposeSlot = undefined
      }
    }

    ctx.effect(() => {
      return () => {
        disposePage()
        disposeFav()
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
