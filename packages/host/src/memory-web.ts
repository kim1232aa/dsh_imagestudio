import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

export class MemoryWebServer {
  routes: Array<{ kind: 'exact' | 'prefix'; path: string; handler: Handler }> = []
  private disposers: Array<() => void> = []

  register(route: { kind: 'exact' | 'prefix'; path: string; handler: Handler }) {
    this.routes.push(route)
    const off = () => {
      this.routes = this.routes.filter((r) => r !== route)
    }
    this.disposers.push(off)
    return off
  }

  uninstall() {
    for (const off of this.disposers.splice(0)) off()
  }

  tapIndex(_tap: (html: string) => string) {
    return () => {}
  }

  async fetch(method: string, url: string, body?: string): Promise<{ status: number; type: string; text: string; json?: unknown }> {
    const path = new URL(url, 'http://127.0.0.1').pathname
    const route = [...this.routes].reverse().find((r) =>
      r.kind === 'exact' ? r.path === path : path === r.path || path.startsWith(r.path.endsWith('/') ? r.path : `${r.path}/`) || path === r.path,
    )
    if (!route) return { status: 404, type: 'text/plain', text: 'no route' }

    const req = new FakeReq(method, url, body) as unknown as IncomingMessage
    const res = new FakeRes()
    await route.handler(req, res as unknown as ServerResponse)
    await res.done
    const type = String(res.headers['content-type'] ?? '')
    const text = res.body.toString('utf8')
    let json: unknown
    if (type.includes('json')) {
      try {
        json = JSON.parse(text)
      } catch {
        json = undefined
      }
    }
    return { status: res.statusCode, type, text, json }
  }
}

class FakeReq extends EventEmitter {
  method: string
  url: string
  constructor(method: string, url: string, body?: string) {
    super()
    this.method = method
    this.url = url
    queueMicrotask(() => {
      if (body) this.emit('data', Buffer.from(body))
      this.emit('end')
    })
  }
}

class FakeRes {
  statusCode = 200
  headers: Record<string, string> = {}
  body = Buffer.alloc(0)
  done: Promise<void>
  private resolve!: () => void
  constructor() {
    this.done = new Promise((r) => {
      this.resolve = r
    })
  }
  writeHead(status: number, headers?: Record<string, string>) {
    this.statusCode = status
    Object.assign(this.headers, headers ?? {})
  }
  end(chunk?: string | Buffer) {
    if (chunk) this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    this.resolve()
  }
}
