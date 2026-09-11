import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AssetRef, CreativePlan, ImageRequest } from '../../core/src/types.ts'
import { redactSecrets } from '../../core/src/config.ts'
import { assertInsideWorkspace, toWorkspaceRelative } from './paths.ts'

export interface AssetStoreOptions {
  workspaceRoot: string
  outputDir?: string
  keepLastTasks?: number
}

export class AssetStore {
  readonly root: string
  readonly studioDir: string
  readonly keepLastTasks: number

  constructor(opts: AssetStoreOptions) {
    this.root = opts.workspaceRoot
    this.studioDir = join(opts.workspaceRoot, opts.outputDir ?? '.dsh/image-studio')
    this.keepLastTasks = opts.keepLastTasks ?? 50
  }

  taskDir(sessionId: string, taskId: string): string {
    const dir = join(this.studioDir, sessionId, taskId)
    assertInsideWorkspace(this.root, dir)
    return dir
  }

  async ensureTask(sessionId: string, taskId: string): Promise<string> {
    const dir = this.taskDir(sessionId, taskId)
    await mkdir(join(dir, 'thumbs'), { recursive: true })
    return dir
  }

  async writePlan(sessionId: string, taskId: string, plan: CreativePlan): Promise<string> {
    const dir = await this.ensureTask(sessionId, taskId)
    const path = join(dir, 'plan.json')
    await writeFile(path, JSON.stringify(plan, null, 2))
    return toWorkspaceRelative(this.root, path)
  }

  async writeRequest(sessionId: string, taskId: string, req: ImageRequest): Promise<string> {
    const dir = await this.ensureTask(sessionId, taskId)
    const sanitized = redactSecrets(req as unknown as Record<string, unknown>)
    const path = join(dir, 'request.json')
    await writeFile(path, JSON.stringify(sanitized, null, 2))
    return toWorkspaceRelative(this.root, path)
  }

  async writeImage(
    sessionId: string,
    taskId: string,
    filename: string,
    bytes: Uint8Array,
    meta: { width: number; height: number; mime?: string },
  ): Promise<AssetRef> {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error(`Illegal image filename: ${filename}`)
    }
    const dir = await this.ensureTask(sessionId, taskId)
    const abs = join(dir, filename)
    assertInsideWorkspace(this.root, abs)
    await writeFile(abs, bytes)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    await this.rebuildIndex()
    return {
      path: toWorkspaceRelative(this.root, abs),
      width: meta.width,
      height: meta.height,
      mime: meta.mime ?? 'image/png',
      sha256,
    }
  }

  async cleanupTask(sessionId: string, taskId: string): Promise<void> {
    const dir = this.taskDir(sessionId, taskId)
    await rm(dir, { recursive: true, force: true })
    await this.rebuildIndex()
  }

  async prune(): Promise<void> {
    const sessions = await safeList(this.studioDir)
    const tasks: { path: string; mtime: number }[] = []
    for (const session of sessions) {
      const sessionDir = join(this.studioDir, session)
      for (const task of await safeList(sessionDir)) {
        const path = join(sessionDir, task)
        const s = await stat(path).catch(() => null)
        if (s?.isDirectory()) tasks.push({ path, mtime: s.mtimeMs })
      }
    }
    tasks.sort((a, b) => b.mtime - a.mtime)
    for (const extra of tasks.slice(this.keepLastTasks)) {
      await rm(extra.path, { recursive: true, force: true })
    }
    await this.rebuildIndex()
  }

  async rebuildIndex(): Promise<void> {
    await mkdir(this.studioDir, { recursive: true })
    const sessions = await safeList(this.studioDir)
    const index: Record<string, string[]> = {}
    for (const session of sessions) {
      if (session === 'index.json') continue
      index[session] = await safeList(join(this.studioDir, session))
    }
    await writeFile(join(this.studioDir, 'index.json'), JSON.stringify(index, null, 2))
  }

  async readIndex(): Promise<Record<string, string[]>> {
    try {
      return JSON.parse(await readFile(join(this.studioDir, 'index.json'), 'utf8'))
    } catch {
      await this.rebuildIndex()
      return JSON.parse(await readFile(join(this.studioDir, 'index.json'), 'utf8'))
    }
  }
}

async function safeList(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((n) => n !== 'index.json')
  } catch {
    return []
  }
}

export { dirname }
