import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type { ImageProvider, ImageRequest, ImageResult, ProviderInfo, VideoRequest, VideoResult } from '../../core/src/types.ts'
import { pixelsFor } from '../../provider-mock/src/index.ts'
import { videoSize } from '../../provider-mock/src/video.ts'
import { assertProviderConfig } from '../../core/src/config.ts'

export interface OpenAIProviderOptions {
  id: string
  model: string
  baseUrl?: string
  apiKeyEnv: string
  /** 视频模型（如 grok-imagine-video）。配置后该渠道具备视频能力。 */
  videoModel?: string
  /** 图生图/编辑模型（如 grok-imagine-edit）。配置后参考图真正参与生成。 */
  editModel?: string
  /** 视觉理解模型（如 grok-4.5，走 /chat/completions）。配置后该渠道具备反推/AI 看图能力。 */
  visionModel?: string
}

export class OpenAIImageProvider implements ImageProvider {
  readonly id: string
  readonly model: string
  readonly baseUrl: string
  readonly apiKeyEnv: string
  readonly videoModel?: string
  readonly editModel?: string
  readonly visionModel?: string
  /** 最近一次 describe 的 token 用量（上下文用量显示用）。 */
  lastUsage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }

  constructor(opts: OpenAIProviderOptions) {
    this.id = opts.id
    this.model = opts.model
    this.baseUrl = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')
    this.apiKeyEnv = opts.apiKeyEnv
    this.videoModel = opts.videoModel
    this.editModel = opts.editModel
    this.visionModel = opts.visionModel
  }

  info(): ProviderInfo {
    const kinds: ProviderInfo['kinds'] = ['text-to-image', 'image-to-image']
    if (this.videoModel) kinds.push('text-to-video', 'image-to-video')
    if (this.visionModel) kinds.push('describe')
    return {
      id: this.id,
      protocol: 'openai-image',
      model: this.model,
      kinds,
      canMaskEdit: !!this.editModel,
    }
  }

  private key(): string {
    const value = process.env[this.apiKeyEnv]
    if (!value) throw new Error(`Credential ${this.apiKeyEnv} is empty; treated as missing (no silent fallback)`)
    return value
  }

  async generate(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    if (req.refUsage === 'analysis-only' && req.refImages?.length) {
      throw new Error('provider refused refImages because refUsage=analysis-only')
    }
    // 图生图：带参考图时走编辑模型，不再静默丢弃参考图（验收 3.2）
    if (req.refImages?.length) return this.edit(req, signal)
    const key = this.key()
    const xai = this.baseUrl.includes('x.ai')
    // grok-imagine 只认 `aspect_ratio`（实测 `size` 被静默忽略，恒返 3:2/2:3）；
    // OpenAI 系只认 `size`。按模型族分开发，两个参数不能一起发。
    const aspect = req.aspectRatio && req.aspectRatio !== '自动' ? req.aspectRatio : '1:1'
    // 清晰度档位：grok-imagine 实测认 `resolution`（"1k"/"2k"，2k 实返 2048²）。
    const clarity = req.clarity && /^(1K|2K|4K)$/i.test(req.clarity) ? `${req.clarity.toLowerCase()}` : undefined
    const body = xai || isGrokModel(this.model)
      ? {
          model: this.model,
          prompt: req.prompt,
          n: Math.min(req.n, 4),
          aspect_ratio: GROK_ASPECTS.has(aspect) ? aspect : '1:1',
          ...(clarity ? { resolution: clarity } : {}),
          response_format: 'b64_json',
        }
      : {
          model: this.model,
          prompt: req.prompt,
          n: req.n,
          size: sizeFor(req.aspectRatio),
          // Always ask for b64_json: relays fronting xAI return an imgen.x.ai
          // URL otherwise, and that CDN is unreachable from many networks —
          // the bytes must ride inside the API response.
          response_format: 'b64_json',
        }
    return this.requestImages('/images/generations', body, req.aspectRatio, key, signal)
  }

  /**
   * 图生图/编辑：POST /images/edits，参考图以 data URL 随请求上行
   * （grok-imagine-edit 实测接受 JSON image_url）。未配置 editModel 时
   * 明确报错，不静默退化成纯文生图。
   */
  async edit(req: ImageRequest, signal?: AbortSignal): Promise<ImageResult> {
    if (!this.editModel) {
      throw new Error(`渠道 ${this.id} 未配置编辑模型（editModel），图生图不可用`)
    }
    const refPath = req.refImages?.[0]?.path
    if (!refPath) throw new Error('图生图需要至少一张参考图')
    const key = this.key()
    const body = {
      model: this.editModel,
      prompt: req.prompt,
      image_url: await frameToDataUrl(refPath),
      n: Math.min(req.n, 4),
      response_format: 'b64_json',
    }
    return this.requestImages('/images/edits', body, req.aspectRatio, key, signal, this.editModel)
  }

  /**
   * 反推/AI 看图：走 OpenAI 兼容的 /chat/completions，图片以 data URL 上行。
   * 只在配置了 visionModel 时声明该能力（见 info().kinds），没配置就明确报错，
   * 不让 mock 之类假渠道悄悄顶包（验收 7.3：反推必须真看图）。
   */
  async describe(images: Array<{ path: string }>, instruction?: string, signal?: AbortSignal): Promise<string> {
    if (!this.visionModel) {
      throw new Error(`渠道 ${this.id} 未配置视觉模型（visionModel），反推不可用`)
    }
    const key = this.key()
    const content: Array<Record<string, unknown>> = [
      { type: 'text', text: instruction || '描述这张图片的内容。' },
    ]
    for (const img of images) {
      content.push({ type: 'image_url', image_url: { url: await frameToDataUrl(img.path) } })
    }
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: signal ?? AbortSignal.timeout(180_000),
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.visionModel, messages: [{ role: 'user', content }], max_tokens: 8192 }),
      })
    } catch (err) {
      const e = err as Error & { cause?: Error }
      const chain = [e.message, e.cause?.message].filter(Boolean).join(' ← ')
      throw new Error(`vision API request failed (${this.baseUrl}): ${chain}`)
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200)
      throw new Error(`vision API ${res.status}: ${detail}`)
    }
    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }
    this.lastUsage = payload.usage
    const text = payload.choices?.[0]?.message?.content
    if (!text) throw new Error('vision API 返回里没有文本内容')
    return text
  }

  /** 共享的图像请求/解析：失败带因果链，宽高从真实字节嗅探。 */
  private async requestImages(
    endpoint: string,
    body: Record<string, unknown>,
    aspect: string | undefined,
    key: string,
    signal?: AbortSignal,
    modelOverride?: string,
  ): Promise<ImageResult> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      // 失败可读：undici 只给 "fetch failed"，真实原因（DNS/TLS/代理/连接拒绝）
      // 在 cause 里，必须带出来，否则用户面对一句废话无从排查。
      const e = err as Error & { cause?: Error }
      const chain = [e.message, e.cause?.message, (e.cause as Error & { cause?: Error })?.cause?.message]
        .filter(Boolean)
        .join(' ← ')
      throw new Error(`image API request failed (${this.baseUrl}): ${chain}`)
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200)
      throw new Error(`OpenAI image API ${res.status}: ${detail}`)
    }
    const payload = (await res.json()) as { data: Array<{ b64_json?: string; url?: string }> }
    const fallback = pixelsFor(aspect)
    const images = []
    for (let i = 0; i < payload.data.length; i++) {
      const row = payload.data[i]
      let bytes = new Uint8Array()
      if (row.b64_json) bytes = new Uint8Array(Buffer.from(row.b64_json, 'base64'))
      else if (row.url) {
        const img = await fetch(row.url, { signal })
        bytes = new Uint8Array(await img.arrayBuffer())
      }
      // 验收 3.1 硬指标：声明的宽高/格式必须来自真实字节，不是理论值。
      // 上游可能返 JPEG（grok 系列恒为 JPEG），按 PNG 虚标会让 GIF 合成等
      // 下游按 PNG 解码直接崩（"not a png"）。
      const sniffed = sniffImage(bytes)
      images.push({
        path: `remote://${this.id}/${i}`,
        width: sniffed?.width ?? fallback.width,
        height: sniffed?.height ?? fallback.height,
        mime: sniffed?.mime ?? 'image/png',
        sha256: 'pending',
        bytes,
      })
    }
    return { images, providerId: this.id, model: modelOverride ?? this.model }
  }

  /**
   * 真实视频生成（xAI 风格异步协议，实测于中转端点）：
   *   POST /videos/generations → { request_id }
   *   GET  /videos/{request_id} → 202 {status:'pending'} … 200 {status:'done', video:{url,duration}}
   *   GET  {video.url} → mp4 字节（经 /content 端点，不经过被墙的 CDN）
   */
  async generateVideo(req: VideoRequest, signal?: AbortSignal): Promise<Omit<VideoResult, 'jobId'>> {
    if (!this.videoModel) {
      throw new Error(`渠道 ${this.id} 未配置视频模型（videoModel），无法生成视频`)
    }
    const key = this.key()
    const duration = Math.max(1, Math.min(15, Number.isFinite(req.durationSec) ? Math.round(req.durationSec) : 2))
    const aspect = req.aspectRatio && req.aspectRatio !== '自动' ? req.aspectRatio : '16:9'
    const body: Record<string, unknown> = {
      model: this.videoModel,
      prompt: req.prompt,
      duration,
      aspect_ratio: GROK_VIDEO_ASPECTS.has(aspect) ? aspect : '16:9',
    }
    if (req.firstFramePath) {
      body.image_url = await frameToDataUrl(req.firstFramePath)
    }
    const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
    let created: { request_id?: string }
    try {
      const res = await fetch(`${this.baseUrl}/videos/generations`, {
        method: 'POST',
        signal,
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`video API ${res.status}: ${(await res.text()).slice(0, 200)}`)
      created = (await res.json()) as { request_id?: string }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      const e = err as Error & { cause?: Error }
      const chain = [e.message, e.cause?.message].filter(Boolean).join(' ← ')
      throw new Error(`video API request failed (${this.baseUrl}): ${chain}`)
    }
    if (!created.request_id) throw new Error('video API 未返回 request_id')

    // 轮询直到完成；grok 实测 2s 视频约 30-90s 出片
    const pollUrl = `${this.baseUrl}/videos/${created.request_id}`
    let video: { url?: string; duration?: number } | undefined
    for (let i = 0; i < 60; i++) {
      if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' })
      const res = await fetch(pollUrl, { signal, headers })
      const payload = (await res.json()) as { status?: string; progress?: number; video?: { url?: string; duration?: number }; error?: string }
      if (payload.status === 'done' && payload.video?.url) {
        video = payload.video
        break
      }
      if (payload.status === 'failed' || payload.status === 'expired') {
        throw new Error(`video generation ${payload.status}: ${payload.error ?? created.request_id}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
    if (!video?.url) throw new Error(`video generation timed out (${created.request_id})`)

    // video.url 形如 /v1/videos/{id}/content，基于源站 origin 拼绝对地址
    const origin = new URL(this.baseUrl).origin
    const contentUrl = video.url.startsWith('http') ? video.url : `${origin}${video.url}`
    const res = await fetch(contentUrl, { signal, headers })
    if (!res.ok) throw new Error(`video content download ${res.status}`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    // 验收红线：宽高来自真实 mp4 字节（tkhd box），解析失败才退到比例映射
    const sniffed = sniffMp4(bytes)
    const fallback = videoSize(aspect)
    return {
      path: `remote://${this.id}/video`,
      url: contentUrl,
      width: sniffed?.width ?? fallback.width,
      height: sniffed?.height ?? fallback.height,
      durationSec: Math.round(video.duration ?? duration),
      mime: 'video/mp4',
      providerId: this.id,
      model: this.videoModel,
      bytes,
    }
  }
}

/** grok-imagine 系列支持的比例集合（实测中转端点逐档核对过像素）。 */
const GROK_ASPECTS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '21:9'])

/** grok-imagine-video 支持的比例（实测端点接受值）。 */
const GROK_VIDEO_ASPECTS = new Set(['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3'])

/**
 * 把首帧本地文件读成 data URL。插件收到的 path 可能是绝对路径、cwd 相对
 * 路径，或 imageAssets 存储根下的相对路径（.dsh/image-studio/<path>），逐个试。
 */
async function frameToDataUrl(framePath: string): Promise<string> {
  const candidates = isAbsolute(framePath)
    ? [framePath]
    : [framePath, join(process.cwd(), framePath), join(process.cwd(), '.dsh', 'image-studio', framePath)]
  let bytes: Buffer | null = null
  for (const candidate of candidates) {
    try {
      bytes = await readFile(candidate)
      break
    } catch {
      // 试下一个候选路径
    }
  }
  if (!bytes) throw new Error(`首帧文件读不到：${framePath}`)
  const mime = sniffImage(new Uint8Array(bytes))?.mime ?? 'image/png'
  return `data:${mime};base64,${bytes.toString('base64')}`
}

/**
 * 从 mp4 字节的 tkhd box 解析真实宽高（16.16 定点数）。版本 0/1 的
 * tkhd 布局不同，宽高固定在 box 末尾 8 字节，所以直接从尾部读。
 */
export function sniffMp4(bytes: Uint8Array): { width: number; height: number } | null {
  for (let i = 0; i + 8 < bytes.length; i++) {
    if (bytes[i] === 0x74 && bytes[i + 1] === 0x6b && bytes[i + 2] === 0x68 && bytes[i + 3] === 0x64) {
      // 'tkhd' 前 4 字节是 box size（含 8 字节头）
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const size = dv.getUint32(i - 4)
      const end = i - 4 + size
      if (size > 8 && end <= bytes.length) {
        const width = dv.getUint32(end - 8) / 65536
        const height = dv.getUint32(end - 4) / 65536
        if (width >= 16 && height >= 16 && width <= 8192 && height <= 8192) {
          return { width: Math.round(width), height: Math.round(height) }
        }
      }
    }
  }
  return null
}

function isGrokModel(model: string): boolean {
  return /grok|imagine/i.test(model)
}

/** Sniff PNG/JPEG magic bytes and extract real pixel dimensions. */
export function sniffImage(bytes: Uint8Array): { width: number; height: number; mime: string } | null {
  if (bytes.length > 26 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { width: dv.getUint32(16), height: dv.getUint32(20), mime: 'image/png' }
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue }
      const marker = bytes[i + 1]
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        return { width: dv.getUint16(i + 7), height: dv.getUint16(i + 5), mime: 'image/jpeg' }
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      i += 2 + dv.getUint16(i + 2)
    }
  }
  return null
}

/** File extension matching the sniffed mime; keeps saved files truthfully named. */
export function extForMime(mime?: string): string {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'image/webp') return '.webp'
  return '.png'
}

function sizeFor(aspect: string): string {
  if (aspect === '1:1') return '1024x1024'
  if (aspect === '3:4' || aspect === '9:16') return '1024x1536'
  return '1536x1024'
}

export const name = 'image-provider-openai'
export const inject = ['imagegen']

export const Config = Schema.object({
  providers: Schema.array(
    Schema.object({
      id: Schema.string().required(),
      protocol: Schema.string().default('openai-image'),
      model: Schema.string().required(),
      apiKeyEnv: Schema.string().role('secret').required(),
      baseUrl: Schema.string(),
      videoModel: Schema.string(),
      editModel: Schema.string(),
      visionModel: Schema.string(),
    }),
  ).default([] as never),
})

export function apply(
  ctx: Context,
  config: { providers?: Array<{ id: string; model: string; apiKeyEnv: string; baseUrl?: string; protocol?: string; videoModel?: string; editModel?: string; visionModel?: string }> } = {},
): void {
  for (const row of config.providers ?? []) {
    const cfg = assertProviderConfig({ ...row, protocol: 'openai-image' })
    const impl = new OpenAIImageProvider(cfg)
    ctx.effect(() => ctx.imagegen.register(impl.id, impl), `image-provider-openai:${impl.id}`)
  }
}
