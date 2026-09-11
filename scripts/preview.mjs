#!/usr/bin/env node
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { bootStudio } from '../packages/host/src/boot.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const port = Number(process.env.PORT || 3080)

const host = await bootStudio({
  workspaceRoot: join(root, '.dsh-preview'),
  skillsDir: join(root, 'skills'),
  enabledSkills: [
    'cinema-dna-21x9x3',
    'life-force-portrait',
    'photography-simulation',
    'movie-poster',
    'character-casting',
  ],
  enableXai: false,
})

const shell = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><title>DeepSeek Harness</title>
<style>
:root{--dsh-sidebar-width:260px}
html,body{margin:0;height:100%;background:#101014;color:#eee;font:14px/1.4 ui-sans-serif,system-ui}
aside{position:fixed;inset:0 auto 0 0;width:var(--dsh-sidebar-width);border-right:1px solid #222;padding:16px}
main{margin-left:var(--dsh-sidebar-width);height:100%;display:flex;align-items:center;justify-content:center;color:#666}
button{display:block;width:100%;margin:0 0 8px;height:36px;border:1px solid #333;border-radius:8px;background:#1a1a1f;color:#eee}
iframe{width:100%;height:100%;border:0;background:#12110e}
</style></head><body>
<aside>
  <div style="opacity:.6;margin-bottom:12px">DeepSeek Harness</div>
  <button type="button" id="new-session">新会话</button>
</aside>
<main id="main">对话区 · 点侧栏「生图」打开 Image Studio</main>
<script src="/imagestudio/entry.js" defer></script>
</body></html>`

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(shell)
    return
  }
  const route = [...host.web.routes].reverse().find((r) =>
    r.kind === 'exact'
      ? r.path === url.pathname
      : url.pathname === r.path || url.pathname.startsWith(`${r.path}/`) || url.pathname === r.path,
  )
  if (!route) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found')
    return
  }
  try {
    await route.handler(req, res)
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' })
    }
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`preview http://127.0.0.1:${port}/`)
  console.log(`workbench http://127.0.0.1:${port}/imagestudio`)
})
