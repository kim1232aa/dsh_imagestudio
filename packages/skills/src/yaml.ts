/** Minimal YAML subset used by preset.yaml files (maps, lists, scalars, `>` blocks). */
export function parseYaml(text: string): unknown {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const root: Record<string, unknown> = {}
  const stack: { indent: number; value: unknown }[] = [{ indent: -1, value: root }]

  const push = (indent: number, value: unknown) => {
    stack.push({ indent, value })
  }
  const peek = () => stack[stack.length - 1]

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()
    while (stack.length > 1 && indent <= peek().indent) stack.pop()
    const parent = peek().value

    if (line.startsWith('- ')) {
      const item = line.slice(2)
      if (!Array.isArray(parent)) throw new Error(`YAML list under non-list at line ${i + 1}`)
      if (item.startsWith('{') && item.endsWith('}')) {
        parent.push(parseInlineMap(item))
      } else {
        parent.push(parseScalar(item))
      }
      continue
    }

    const colon = line.indexOf(':')
    if (colon < 0) throw new Error(`YAML parse error at line ${i + 1}: ${line}`)
    const key = line.slice(0, colon).trim()
    let rest = line.slice(colon + 1).trim()

    if (Array.isArray(parent)) throw new Error(`YAML map key under list at line ${i + 1}`)
    const rec = parent as Record<string, unknown>

    if (rest === '>' || rest === '|') {
      const block: string[] = []
      while (i + 1 < lines.length) {
        const nxt = lines[i + 1]
        const ni = nxt.length - nxt.trimStart().length
        if (!nxt.trim()) {
          i++
          block.push('')
          continue
        }
        if (ni <= indent) break
        i++
        block.push(nxt.slice(indent + 2))
      }
      rec[key] = block.join(' ').replace(/\s+/g, ' ').trim()
      continue
    }

    if (rest === '') {
      const next = lines.slice(i + 1).find((l) => l.trim() && !l.trimStart().startsWith('#'))
      const isList = next?.trimStart().startsWith('- ')
      const child: unknown = isList ? [] : {}
      rec[key] = child
      push(indent, child)
      continue
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      rec[key] = parseInlineList(rest)
      continue
    }
    rec[key] = parseScalar(rest)
  }
  return root
}

function parseInlineList(src: string): unknown[] {
  const inner = src.slice(1, -1).trim()
  if (!inner) return []
  return splitTop(inner).map((s) => parseScalar(s.trim()))
}

function parseInlineMap(src: string): Record<string, unknown> {
  const inner = src.slice(1, -1).trim()
  const out: Record<string, unknown> = {}
  for (const part of splitTop(inner)) {
    const c = part.indexOf(':')
    if (c < 0) continue
    out[part.slice(0, c).trim()] = parseScalar(part.slice(c + 1).trim())
  }
  return out
}

function splitTop(s: string): string[] {
  const parts: string[] = []
  let buf = ''
  let depth = 0
  for (const ch of s) {
    if (ch === '[' || ch === '{') depth++
    if (ch === ']' || ch === '}') depth--
    if (ch === ',' && depth === 0) {
      parts.push(buf)
      buf = ''
    } else buf += ch
  }
  if (buf) parts.push(buf)
  return parts
}

function parseScalar(s: string): unknown {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1)
  }
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}
