import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  addEdge,
  addNode,
  addVideoNode,
  defaultProject,
  deleteEdge,
  deleteNode,
  incoming,
  incomingImagesInWireOrder,
  placeResultNode,
  placeVideoResult,
  resolvePrompt,
} from '../packages/ui/src/canvas-graph.ts'
import { bootStudio } from '../packages/host/src/boot.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

describe('DOC03 canvas graph', () => {
  it('default project ships text + config already wired', () => {
    const p = defaultProject()
    assert.ok(p.nodes.some((n) => n.type === 'text'))
    assert.ok(p.nodes.some((n) => n.type === 'config'))
    const cfg = p.nodes.find((n) => n.type === 'config')!
    const ins = incoming(p, cfg.id)
    assert.equal(ins.length, 1)
    assert.equal(ins[0].type, 'text')
  })

  it('wired text becomes the generate prompt', () => {
    const p = defaultProject()
    const cfg = p.nodes.find((n) => n.type === 'config')!
    const { prompt } = resolvePrompt(p, cfg.id)
    assert.match(prompt, /青瓷茶盏/)
  })

  it('first wired image is listed first for i2i base', () => {
    let p = defaultProject()
    const cfg = p.nodes.find((n) => n.type === 'config')!
    p = {
      ...p,
      nodes: [
        ...p.nodes,
        { id: 'img-a', type: 'image', x: 10, y: 10, path: 'a.png' },
        { id: 'img-b', type: 'image', x: 10, y: 40, path: 'b.png' },
      ],
    }
    p = addEdge(p, 'img-a', cfg.id)
    p = addEdge(p, 'img-b', cfg.id)
    const { refImages } = resolvePrompt(p, cfg.id)
    assert.deepEqual(refImages, ['a.png', 'b.png'])
  })

  it('placeResultNode sits to the right and keeps a wire', () => {
    const p = defaultProject()
    const cfg = p.nodes.find((n) => n.type === 'config')!
    const next = placeResultNode(p, cfg.id, { path: 'out.png' })
    const img = next.nodes.find((n) => n.path === 'out.png')!
    assert.ok(img.x > cfg.x)
    assert.ok(next.edges.some((e) => e.from === cfg.id && e.to === img.id))
  })

  it('deleteNode drops touching edges', () => {
    const p = deleteNode(defaultProject(), 'text-1')
    assert.ok(!p.nodes.some((n) => n.id === 'text-1'))
    assert.equal(p.edges.length, 0)
  })

  it('deleteEdge keeps nodes', () => {
    const p = deleteEdge(defaultProject(), 'e-1')
    assert.equal(p.edges.length, 0)
    assert.equal(p.nodes.length, 2)
  })

  it('addVideoNode and placeVideoResult sit to the right', () => {
    let p = addVideoNode(defaultProject(), { x: 40, y: 200 })
    assert.ok(p.nodes.some((n) => n.type === 'video'))
    const cfg = p.nodes.find((n) => n.type === 'config')!
    p = placeVideoResult(p, cfg.id, { path: 'clip.mp4' })
    const vid = p.nodes.find((n) => n.path === 'clip.mp4')!
    assert.equal(vid.type, 'video')
    assert.ok(vid.x > cfg.x)
  })

  it('incomingImagesInWireOrder follows edge order not node list', () => {
    let p = defaultProject()
    const cfg = p.nodes.find((n) => n.type === 'config')!
    p = addNode(p, { id: 'img-b', type: 'image', x: 10, y: 40, path: 'b.png' })
    p = addNode(p, { id: 'img-a', type: 'image', x: 10, y: 10, path: 'a.png' })
    p = addEdge(p, 'img-a', cfg.id)
    p = addEdge(p, 'img-b', cfg.id)
    assert.deepEqual(incomingImagesInWireOrder(p, cfg.id), ['a.png', 'b.png'])
  })

  it('POST /imagestudio/api/canvas/generate adds an image node', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-cv-'))
    const host = await bootStudio({ workspaceRoot: dir, skillsDir, enableXai: false })
    try {
      const project = defaultProject()
      const cfg = project.nodes.find((n) => n.type === 'config')!
      const res = await host.web.fetch(
        'POST',
        '/imagestudio/api/canvas/generate',
        JSON.stringify({ project, configNodeId: cfg.id }),
      )
      assert.equal(res.status, 200, res.text)
      const body = res.json as { project: ReturnType<typeof defaultProject>; images: Array<{ path: string }> }
      assert.ok(body.images?.length >= 1)
      assert.ok(body.project.nodes.some((n) => n.type === 'image' && n.path))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
