/**
 * Inline renderer for istudio_* tool calls, registered into the keyed
 * `tool.call.toolview` slot (key = wire tool name). Structure copied from
 * dsh-imagegen's image-toolview.tsx: a status header, a message/summary
 * region, and an image grid — but images are workspace files served by the
 * host half at `/imagestudio/api/file?path=…` instead of attachment blobs,
 * and PLAN_REJECTED results get a dedicated score/failures presentation.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SlotsLike } from './slots-face.ts'

/** Owner props supplied by the host's keyed tool-call slot. */
export interface ImageStudioToolViewOwnerProps {
  callId: string
  toolName: string
  block: ToolCallBlockLike
  cwd?: string
  home?: string
  openFile?: (path: string) => void
  inspect?: () => void
}

/** Content blocks we read; everything else is ignored structurally. */
export interface ToolCallTextContent {
  type: 'text'
  text: string
}

/** Settled tool result node (kind tag per the host's ToolCallBlock union). */
export interface ToolCallResultBlock {
  kind: string
  content: Array<ToolCallTextContent | { type: string }>
  isError?: boolean
}

/** The slot's frozen block: a running call (no kind) or a settled result. */
export type ToolCallBlockLike = ToolCallResultBlock | Record<string, unknown>

/** One renderable image reference parsed from the result JSON. */
interface ParsedImage {
  path: string
  width?: number
  height?: number
  mime?: string
}

/** Structured view of the tool result text. */
interface ParsedResult {
  images: ParsedImage[]
  summary: Array<[string, string]>
  notes: string[]
  raw: string
  isJson: boolean
}

/** PLAN_REJECTED details, parsed from either the ToolArgsError text or a JSON body. */
interface PlanRejection {
  score?: number
  threshold?: number
  failures: string[]
  veto?: string
}

type ViewStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'rejected'

function isSettled(block: ToolCallBlockLike): block is ToolCallResultBlock {
  return 'kind' in block && Array.isArray((block as ToolCallResultBlock).content)
}

function textOf(block: ToolCallBlockLike): string {
  if (!isSettled(block)) return ''
  return block.content
    .filter((content): content is ToolCallTextContent => content.type === 'text')
    .map(content => content.text)
    .join('\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asImage(value: unknown): ParsedImage | undefined {
  if (!isRecord(value) || typeof value.path !== 'string' || value.path === '') return undefined
  return {
    path: value.path,
    width: typeof value.width === 'number' ? value.width : undefined,
    height: typeof value.height === 'number' ? value.height : undefined,
    mime: typeof value.mime === 'string' ? value.mime : undefined,
  }
}

/** Pull displayable facts out of the result JSON (generate/edit/compose shapes). */
function parseResult(text: string): ParsedResult {
  const empty: ParsedResult = { images: [], summary: [], notes: [], raw: text, isJson: false }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return empty
  }
  if (!isRecord(value)) return empty
  const images = Array.isArray(value.images)
    ? value.images.flatMap(item => {
      const image = asImage(item)
      return image === undefined ? [] : [image]
    })
    : []
  // istudio_compose returns a single { path, width, height } instead of images[].
  const single = asImage(value)
  if (images.length === 0 && single !== undefined) images.push(single)

  const summary: Array<[string, string]> = []
  if (typeof value.model === 'string' && value.model !== '') summary.push(['模型', value.model])
  if (typeof value.providerId === 'string' && value.providerId !== '') summary.push(['渠道', value.providerId])
  if (typeof value.taskId === 'string' && value.taskId !== '') summary.push(['任务', value.taskId.slice(0, 8)])
  if (typeof value.title === 'string' && value.title !== '') summary.push(['标题', value.title])
  const notes = Array.isArray(value.notes)
    ? value.notes.filter((note): note is string => typeof note === 'string')
    : []
  return { images, summary, notes, raw: text, isJson: true }
}

/** Parse PLAN_REJECTED from the ToolArgsError message or a structured error body. */
function parsePlanRejection(text: string): PlanRejection | undefined {
  // Structured form: { "error": { "code": "PLAN_REJECTED", score, threshold, failures, veto } }
  try {
    const value: unknown = JSON.parse(text)
    if (isRecord(value) && isRecord(value.error) && value.error.code === 'PLAN_REJECTED') {
      const error = value.error
      return {
        score: typeof error.score === 'number' ? error.score : undefined,
        threshold: typeof error.threshold === 'number' ? error.threshold : undefined,
        failures: Array.isArray(error.failures)
          ? error.failures.filter((f): f is string => typeof f === 'string')
          : [],
        veto: typeof error.veto === 'string' ? error.veto : undefined,
      }
    }
  } catch {
    // Not JSON — fall through to the ToolArgsError text form.
  }
  if (!text.includes('PLAN_REJECTED')) return undefined
  // Text form: "PLAN_REJECTED: score 61/82; failures: a; b; veto: …"
  const rejection: PlanRejection = { failures: [] }
  const scoreMatch = /score\s+(\d+)\s*\/\s*(\d+)/.exec(text)
  if (scoreMatch !== null) {
    rejection.score = Number(scoreMatch[1])
    rejection.threshold = Number(scoreMatch[2])
  }
  const failuresMatch = /failures:\s*([^;]*(?:;(?! veto:)[^;]*)*)/.exec(text)
  if (failuresMatch !== null) {
    rejection.failures = failuresMatch[1]
      .split(/;\s*/)
      .map(item => item.trim())
      .filter(item => item !== '' && item !== 'veto:')
  }
  const vetoMatch = /veto:\s*(.+)$/s.exec(text)
  if (vetoMatch !== null) rejection.veto = vetoMatch[1].trim()
  return rejection
}

function statusOf(block: ToolCallBlockLike, text: string, rejection: PlanRejection | undefined): ViewStatus {
  if (!isSettled(block)) return 'running'
  if (rejection !== undefined) return 'rejected'
  if (block.isError === true) return /abort|cancel/i.test(text) ? 'cancelled' : 'failed'
  return 'completed'
}

function statusLabel(status: ViewStatus): string {
  switch (status) {
    case 'running': return '生成中'
    case 'cancelled': return '已取消'
    case 'failed': return '执行失败'
    case 'rejected': return '方案未通过'
    default: return '图片结果'
  }
}

/** File URL served by the host half (packages/ui) for a workspace-relative path. */
export function fileUrl(path: string): string {
  return '/imagestudio/api/file?path=' + encodeURIComponent(path)
}

/** CustomEvent name the workbench canvas page may listen for. */
export const OPEN_CANVAS_EVENT = 'istudio:open-canvas'

function openInCanvas(path: string): void {
  try {
    document.dispatchEvent(new CustomEvent(OPEN_CANVAS_EVENT, { detail: { path } }))
  } catch (error) {
    console.warn('[imagestudio-client] open-canvas dispatch failed:', error)
  }
}

const colors = {
  border: 'rgba(255,255,255,.12)',
  text: 'rgba(255,255,255,.82)',
  dim: 'rgba(255,255,255,.5)',
  accent: '#e8c547',
  error: '#e86a6a',
  bg: 'rgba(255,255,255,.04)',
} as const

function PlanRejectedView(props: { rejection: PlanRejection }) {
  const { rejection } = props
  return (
    <div style={{
      margin: '6px 0',
      padding: '8px 10px',
      borderRadius: 8,
      border: `1px solid ${colors.error}`,
      background: 'rgba(232,106,106,.08)',
      fontSize: 12,
      lineHeight: 1.6,
    }}>
      <div style={{ color: colors.error, fontWeight: 600 }}>
        出图被 plan 闸门拦截（PLAN_REJECTED）
        {rejection.score !== undefined && rejection.threshold !== undefined
          ? `：评分 ${rejection.score}/${rejection.threshold}`
          : ''}
      </div>
      {rejection.failures.length > 0 && (
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: colors.text }}>
          {rejection.failures.map((failure, index) => <li key={index}>{failure}</li>)}
        </ul>
      )}
      {rejection.veto !== undefined && rejection.veto !== '' && (
        <div style={{ marginTop: 4, color: colors.text }}>veto：{rejection.veto}</div>
      )}
      <div style={{ marginTop: 4, color: colors.dim }}>
        可修改 brief 后重试，或明确要求模型使用 force 强制出图。
      </div>
    </div>
  )
}

/** The toolview component registered for every istudio_* key. */
export function ImageStudioToolView(props: ImageStudioToolViewOwnerProps) {
  const text = textOf(props.block)
  const rejection = parsePlanRejection(text)
  const status = statusOf(props.block, text, rejection)
  const result = parseResult(text)
  const showRaw = status === 'failed' || (status === 'cancelled' && text !== '')
    || (status === 'completed' && !result.isJson && text !== '')

  return (
    <section
      data-tool={props.toolName}
      data-state={status}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: '8px 10px',
        background: colors.bg,
        fontSize: 12,
        color: colors.text,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true" style={{ color: colors.accent }}>▧</span>
        <strong style={{ fontWeight: 600 }}>{props.toolName}</strong>
        <span style={{ color: status === 'failed' || status === 'rejected' ? colors.error : colors.dim }}>
          {statusLabel(status)}
        </span>
      </header>

      {status === 'running' && (
        <p style={{ margin: '6px 0 0', color: colors.dim }}>正在生成图片…</p>
      )}

      {status === 'rejected' && rejection !== null && rejection !== undefined && (
        <PlanRejectedView rejection={rejection} />
      )}

      {result.summary.length > 0 && (
        <p style={{ margin: '6px 0 0', color: colors.dim }}>
          {result.summary.map(([label, value]) => `${label} ${value}`).join(' · ')}
        </p>
      )}

      {result.notes.map((note, index) => (
        <p key={index} style={{ margin: '4px 0 0', color: colors.dim }}>{note}</p>
      ))}

      {result.images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
          marginTop: 8,
        }}>
          {result.images.map(image => (
            <figure key={image.path} style={{ margin: 0 }}>
              <a href={fileUrl(image.path)} rel="noreferrer" target="_blank" title="打开原图">
                <img
                  src={fileUrl(image.path)}
                  alt={image.path}
                  style={{
                    width: '100%',
                    display: 'block',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: '#0b0d12',
                  }}
                />
              </a>
              <figcaption style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
                gap: 8,
                color: colors.dim,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {image.path}
                  {image.width !== undefined && image.height !== undefined
                    ? `（${image.width}×${image.height}）`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={() => { openInCanvas(image.path) }}
                  style={{
                    flex: '0 0 auto',
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  在画布中打开
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {showRaw && (
        <pre style={{
          margin: '6px 0 0',
          padding: 8,
          borderRadius: 8,
          background: 'rgba(0,0,0,.25)',
          color: status === 'failed' ? colors.error : colors.dim,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 200,
          overflow: 'auto',
        }}>{text}</pre>
      )}
    </section>
  )
}

/** Register the toolview for the three image-producing istudio_* tools. */
export function registerImageStudioToolviews(ctx: ClientContext): void {
  const slots = (ctx as unknown as { slots: SlotsLike }).slots
  slots.inject('tool.call.toolview', function* () {
    for (const key of ['istudio_generate', 'istudio_edit', 'istudio_compose']) {
      yield slots.register({ name: 'tool.call.toolview', key }, ImageStudioToolView)
    }
  })
}
