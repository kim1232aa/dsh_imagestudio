/** Mini tool registry compatible with dsh-tools `defineTool` without injecting `systemPrompt`. */

export interface MiniToolDef {
  name: string
  description: string
  parameters: unknown
  output?: unknown
  execute: (args: Record<string, unknown>, exec: { signal: AbortSignal }) => Promise<unknown>
}

export class MiniTools {
  private readonly map = new Map<string, MiniToolDef>()

  register(def: MiniToolDef): () => void {
    this.map.set(def.name, def)
    return () => {
      this.map.delete(def.name)
    }
  }

  get size(): number {
    return this.map.size
  }

  schemas(): Array<{ name: string; description: string; parameters: unknown }> {
    return [...this.map.values()].map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
  }

  async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    const t = this.map.get(name)
    if (!t) throw new Error(`unknown tool ${name}`)
    const value = await t.execute(args, { signal: new AbortController().signal })
    return JSON.parse(JSON.stringify(value))
  }
}
