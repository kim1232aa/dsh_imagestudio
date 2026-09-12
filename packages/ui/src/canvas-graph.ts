export type CanvasNodeType = 'text' | 'image' | 'config' | 'video'

export interface CanvasNode {
  id: string
  type: CanvasNodeType
  x: number
  y: number
  text?: string
  path?: string
  ratio?: string
  n?: number
}

export interface CanvasEdge {
  id: string
  from: string
  to: string
}

export interface CanvasProject {
  id: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export function defaultProject(): CanvasProject {
  return {
    id: 'default',
    nodes: [
      { id: 'text-1', type: 'text', x: 40, y: 80, text: '一只青瓷茶盏放在账房窗台上，午后侧光' },
      { id: 'cfg-1', type: 'config', x: 320, y: 90, ratio: '1:1', n: 1 },
    ],
    edges: [{ id: 'e-1', from: 'text-1', to: 'cfg-1' }],
  }
}

export function incoming(project: CanvasProject, nodeId: string): CanvasNode[] {
  return project.edges
    .filter((e) => e.to === nodeId)
    .map((e) => project.nodes.find((n) => n.id === e.from))
    .filter((n): n is CanvasNode => !!n)
}

export function resolvePrompt(project: CanvasProject, configId: string): {
  prompt: string
  refImages: string[]
} {
  const ins = incoming(project, configId)
  const prompt = ins
    .filter((n) => n.type === 'text')
    .map((n) => (n.text || '').trim())
    .filter(Boolean)
    .join('\n')
  const refImages = ins.filter((n) => n.type === 'image' && n.path).map((n) => n.path as string)
  return { prompt, refImages }
}

export function addEdge(project: CanvasProject, from: string, to: string): CanvasProject {
  if (from === to) return project
  if (project.edges.some((e) => e.from === from && e.to === to)) return project
  return {
    ...project,
    edges: [...project.edges, { id: `e-${project.edges.length + 1}-${Date.now()}`, from, to }],
  }
}

export function placeResultNode(
  project: CanvasProject,
  configId: string,
  image: { path: string },
): CanvasProject {
  const cfg = project.nodes.find((n) => n.id === configId)
  const id = `img-${Date.now()}`
  const node: CanvasNode = {
    id,
    type: 'image',
    x: (cfg?.x ?? 320) + 340,
    y: cfg?.y ?? 90,
    path: image.path,
  }
  return {
    ...project,
    nodes: [...project.nodes, node],
    edges: [...project.edges, { id: `e-${id}`, from: configId, to: id }],
  }
}

export function incomingImagesInWireOrder(project: CanvasProject, configId: string): string[] {
  return incoming(project, configId)
    .filter((n) => (n.type === 'image' || n.type === 'video') && n.path)
    .map((n) => n.path as string)
}

export function addNode(
  project: CanvasProject,
  node: Partial<CanvasNode> & { type: CanvasNodeType },
): CanvasProject {
  const id = node.id || `${node.type}-${Date.now()}`
  const next: CanvasNode = {
    id,
    type: node.type,
    x: node.x ?? 80,
    y: node.y ?? 160,
    text: node.text,
    path: node.path,
    ratio: node.ratio,
    n: node.n,
  }
  return { ...project, nodes: [...project.nodes, next] }
}

export function deleteNode(project: CanvasProject, id: string): CanvasProject {
  return {
    ...project,
    nodes: project.nodes.filter((n) => n.id !== id),
    edges: project.edges.filter((e) => e.from !== id && e.to !== id),
  }
}

export function deleteEdge(project: CanvasProject, edgeId: string): CanvasProject {
  return { ...project, edges: project.edges.filter((e) => e.id !== edgeId) }
}

export function addVideoNode(
  project: CanvasProject,
  opts: { x?: number; y?: number; path?: string } = {},
): CanvasProject {
  return addNode(project, { type: 'video', x: opts.x ?? 320, y: opts.y ?? 220, path: opts.path })
}

export function placeVideoResult(
  project: CanvasProject,
  configId: string,
  video: { path: string },
): CanvasProject {
  const cfg = project.nodes.find((n) => n.id === configId)
  const id = `vid-${Date.now()}`
  const node: CanvasNode = {
    id,
    type: 'video',
    x: (cfg?.x ?? 320) + 340,
    y: cfg?.y ?? 90,
    path: video.path,
  }
  return {
    ...project,
    nodes: [...project.nodes, node],
    edges: [...project.edges, { id: `e-${id}`, from: configId, to: id }],
  }
}
