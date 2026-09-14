import { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import * as core from '../../core/src/index.ts'
import * as compose from '../../compose/src/index.ts'
import * as guard from '../../guard/src/index.ts'
import * as assets from '../../assets/src/index.ts'
import * as skills from '../../skills/src/index.ts'
import * as mock from '../../provider-mock/src/index.ts'
import * as openai from '../../provider-openai/src/index.ts'
import * as tools from '../../tools/src/index.ts'
import * as ui from '../../ui/src/index.ts'
import { MiniTools } from './minitools.ts'
import { createJobsStub, createLlmStub, type LlmStubImpl } from './stubs.ts'
import { MemoryWebServer } from './memory-web.ts'

/** FiberState is a const enum — compare these numbers, never import the enum. */
export const STATE_PENDING = 0
export const STATE_ACTIVE = 2

export interface BootOptions {
  workspaceRoot: string
  skillsDir: string
  enabledSkills?: string[]
  enableXai?: boolean
  /** 测试注入的 llm 行为：固定文本或函数；缺省 = 空文本（= 未配置模型，走规则兜底）。 */
  llm?: LlmStubImpl
}

export interface StudioHost {
  ctx: Context
  tools: MiniTools
  web: MemoryWebServer
  workspaceRoot: string
  fibers(): Array<{ name: string; uid: number | null; state: number }>
}

export async function bootStudio(opts: BootOptions): Promise<StudioHost> {
  await mkdir(opts.workspaceRoot, { recursive: true })
  const ctx = new Context()
  const mini = new MiniTools()
  const llm = createLlmStub(opts.llm)
  const jobs = createJobsStub()
  const web = new MemoryWebServer()

  await ctx.plugin({
    name: 'image-studio-host',
    apply(c: Context) {
      c.provide('tools', mini)
      c.provide('llm', llm)
      c.provide('jobs', jobs)
      c.provide('webServer', web)
    },
  })
  await ctx.plugin(core)
  await ctx.plugin(compose)
  await ctx.plugin(guard)
  await ctx.plugin(assets, { workspaceRoot: opts.workspaceRoot, keepLastTasks: 0 })
  await ctx.plugin(skills, { dir: opts.skillsDir, enabled: opts.enabledSkills })
  await ctx.plugin(mock)

  if (opts.enableXai && process.env.XAI_API_KEY) {
    await ctx.plugin(openai, {
      providers: [
        {
          id: 'xai-imagine',
          protocol: 'openai-image',
          model: 'grok-imagine-image',
          baseUrl: 'https://api.x.ai/v1',
          apiKeyEnv: 'XAI_API_KEY',
        },
      ],
    })
  }

  await ctx.plugin(tools)
  await ctx.plugin(ui)

  const host: StudioHost = {
    ctx,
    tools: mini,
    web,
    workspaceRoot: opts.workspaceRoot,
    fibers() {
      const out: Array<{ name: string; uid: number | null; state: number }> = []
      for (const runtime of ctx.registry.values()) {
        for (const fiber of runtime.fibers) {
          out.push({ name: fiber.name, uid: fiber.uid, state: fiber.state })
        }
      }
      return out
    },
  }
  return host
}

let singleton: Promise<StudioHost> | undefined

export function getStudioHost(opts: { enableXai?: boolean } = {}): Promise<StudioHost> {
  if (!singleton) {
    const skillsDir = fileURLToPath(new URL('../../../skills', import.meta.url))
    const workspaceRoot = join('/tmp', 'dsh-image-studio-preview')
    singleton = bootStudio({
      workspaceRoot,
      skillsDir,
      enabledSkills: [
        'cinema-dna-21x9x3',
        'life-force-portrait',
        'photography-simulation',
        'movie-poster',
        'character-casting',
      ],
      enableXai: opts.enableXai ?? false,
    })
  }
  return singleton
}
