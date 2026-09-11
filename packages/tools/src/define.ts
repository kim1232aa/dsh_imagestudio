import { createRequire } from 'node:module'
import { ToolArgsError } from '../../core/src/errors.ts'

export interface ParamSpec {
  type: string
  required?: boolean
  description?: string
  items?: { type: string }
}

export interface ContentBlock {
  type: string
  text?: string
  [k: string]: unknown
}

export interface StudioToolDef {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
    additionalProperties: boolean
  }
  output: {
    schema: Record<string, unknown>
    render: (args: Record<string, unknown>, value: unknown) => ContentBlock[]
  }
  execute: (args: Record<string, unknown>, exec: { signal: AbortSignal }) => Promise<unknown>
}

function jsonRender(_args: Record<string, unknown>, value: unknown): ContentBlock[] {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return [{ type: 'text', text }]
}

/**
 * Official DSH contract:
 *   ctx.tools.register(defineTool({ name, description, parameters, output: { schema, render }, execute }))
 *   render MUST return ContentBlock[] shaped { type: 'text', text }.
 *
 * Prefer `@deepseek-ai/dsh-tools` when the host has it (real dsh web).
 * Fall back to a same-shape shim so offline MiniTools / CI still work.
 */
export function defineImageTool(opts: {
  name: string
  description: string
  parameters: Record<string, ParamSpec>
  output?: {
    schema?: Record<string, unknown>
    render?: (args: Record<string, never>, value: unknown) => ContentBlock[]
  }
  timeoutMs?: number
  execute: (args: Record<string, never>, exec: { signal: AbortSignal }) => Promise<unknown>
}): StudioToolDef {
  const official = tryOfficialDefineTool(opts)
  if (official) return official

  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const [key, spec] of Object.entries(opts.parameters)) {
    const node: Record<string, unknown> = { type: spec.type }
    if (spec.description) node.description = spec.description
    if (spec.items) node.items = spec.items
    properties[key] = node
    if (spec.required) required.push(key)
  }
  const parameters = {
    type: 'object' as const,
    properties,
    required,
    additionalProperties: false,
  }
  const schema = opts.output?.schema ?? { type: 'object', additionalProperties: true }
  const render = (opts.output?.render as StudioToolDef['output']['render']) ?? jsonRender
  return {
    name: opts.name,
    description: opts.description,
    parameters,
    output: { schema, render },
    async execute(args, exec) {
      const missing = required.filter((k) => args[k] == null || args[k] === '')
      if (missing.length) {
        throw new ToolArgsError('INVALID_ARGS', `required: ${missing.join(', ')}`)
      }
      return opts.execute(args as Record<string, never>, exec)
    },
  }
}

function tryOfficialDefineTool(opts: Parameters<typeof defineImageTool>[0]): StudioToolDef | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = loadOfficial()
    if (!mod) return undefined
    const output = {
      schema: opts.output?.schema ?? { type: 'object' as const, additionalProperties: true },
      render:
        opts.output?.render ??
        ((_args: unknown, value: unknown) => [
          { type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
        ]),
    }
    return mod.defineTool({
      name: opts.name,
      description: opts.description,
      parameters: opts.parameters,
      output,
      execute: opts.execute,
    }) as StudioToolDef
  } catch {
    return undefined
  }
}

function loadOfficial(): { defineTool: Function } | undefined {
  try {
    const req = createRequire(import.meta.url)
    return req('@deepseek-ai/dsh-tools') as { defineTool: Function }
  } catch {
    return undefined
  }
}

/** Alias matching the official export name so hosts can `import { defineTool }`. */
export const defineTool = defineImageTool
