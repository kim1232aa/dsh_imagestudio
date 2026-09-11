/**
 * Image Studio UI host plugin.
 * Serves /imagestudio workbench + JSON API on the official dsh webServer.
 * Original code — pattern inspired by DSH client chrome hooks, not VisioWork source.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { runGenerateOnContext } from '../../core/src/pipeline.ts'
import type { ImageRequest } from '../../core/src/types.ts'
import { studioPage } from './studio-page.ts'
import { assertInsideWorkspace } from '../../assets/src/paths.ts'

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

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res: import('node:http').ServerResponse, status: number, body: unknown, type = 'application/json; charset=utf-8') {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
  })
  res.end(raw)
}

async function persist(ctx: Context, req: ImageRequest, providerId?: string) {
  const out = await runGenerateOnContext(ctx, req, { providerId })
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
            send(res, 200, { index: await ctx.imageAssets.readIndex() })
            return
          }
          if (url.pathname === '/imagestudio/api/file' && (!req.method || req.method === 'GET')) {
            const rel = url.searchParams.get('path') ?? ''
            const abs = join(ctx.imageAssets.root, rel)
            assertInsideWorkspace(ctx.imageAssets.root, abs)
            const bytes = await readFile(abs)
            res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
            res.end(bytes)
            return
          }
          if (req.method === 'POST' && url.pathname.startsWith('/imagestudio/api/')) {
            const raw = await readBody(req)
            const body = raw ? JSON.parse(raw) : {}
            if (url.pathname === '/imagestudio/api/plan') {
              const plan = ctx.imageSkills.compile(body.skillId, body.brief, { wantPoster: !!body.wantPoster })
              const score = await ctx.serial('image/score', plan)
              if (score) plan.selfCheck = score as typeof plan.selfCheck
              if (!plan.selfCheck.passed) {
                send(res, 200, { passed: false, score: plan.selfCheck.score, failures: plan.selfCheck.failures, plan })
                return
              }
              ctx.imageSkills.plans.set(plan.id, plan)
              await ctx.imageAssets.writePlan('studio', plan.id, plan)
              send(res, 200, { passed: true, planId: plan.id, plan, score: plan.selfCheck.score })
              return
            }
            if (url.pathname === '/imagestudio/api/generate') {
              const plan = body.planId ? ctx.imageSkills.plans.get(body.planId) : undefined
              const shot = plan && body.shotId ? plan.shots.find((s) => s.id === body.shotId) : plan?.shots[0]
              const reqImg: ImageRequest = {
                prompt: shot?.prompt ?? body.prompt ?? '',
                negative: shot?.negative,
                aspectRatio: shot?.aspectRatio ?? body.aspectRatio ?? '1:1',
                n: body.n ?? 1,
                refUsage: plan?.constraints.referenceImages.usage ?? 'analysis-only',
                plan,
                shotId: body.shotId,
              }
              if (!reqImg.prompt) {
                send(res, 400, { error: 'prompt or planId required' })
                return
              }
              send(res, 200, await persist(ctx, reqImg, body.providerId))
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
          send(res, 500, { error: err instanceof Error ? err.message : String(err) })
        }
      },
    })

    const scriptTag = '<script src="/imagestudio/entry.js" defer></script>'
    let disposeTap: (() => void) | undefined
    if (typeof web.tapIndex === 'function') {
      disposeTap = web.tapIndex((html) => (html.includes(scriptTag) ? html : html.replace('</body>', `${scriptTag}</body>`)))
    }

    ctx.effect(() => {
      return () => {
        disposePage()
        disposeTap?.()
      }
    }, 'image-ui:routes')
  }

  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], attach)
  } else {
    attach(ctx)
  }
}

export default { name, inject, Config, apply }
