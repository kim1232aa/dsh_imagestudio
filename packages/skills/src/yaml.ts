/** Minimal YAML subset: maps, dash lists, scalars. Enough for skill presets. */
export function parseYaml(text: string): unknown {
  const lines = text.replace(/\t/g, '  ').split(/\r?\n/)
  return parseBlock(lines, 0, 0).value
}

function parseBlock(lines: string[], start: number, indent: number): { value: unknown; next: number } {
  let i = start
  while (i < lines.length && (isBlank(lines[i]) || isComment(lines[i]))) i++
  if (i >= lines.length) return { value: {}, next: i }

  const first = lines[i]
  const ind = leading(first)
  if (ind < indent) return { value: {}, next: i }

  if (trimmed(first).startsWith('- ')) {
    const list: unknown[] = []
    while (i < lines.length) {
      if (isBlank(lines[i]) || isComment(lines[i])) {
        i++
        continue
      }
      if (leading(lines[i]) < indent) break
      if (!trimmed(lines[i]).startsWith('- ')) break
      const itemIndent = leading(lines[i])
      const rest = trimmed(lines[i]).slice(2)
      if (!rest) {
        const nested = parseBlock(lines, i + 1, itemIndent + 2)
        list.push(nested.value)
        i = nested.next
      } else if (rest.startsWith('{') && rest.endsWith('}')) {
        const rec: Record<string, unknown> = {}
        for (const part of splitTop(rest.slice(1, -1))) {
          const c = part.indexOf(':')
          if (c < 0) continue
          rec[part.slice(0, c).trim()] = parseScalar(part.slice(c + 1).trim())
        }
        list.push(rec)
        i++
      } else if (rest.includes(': ') || rest.endsWith(':')) {
        const fake = ' '.repeat(itemIndent + 2) + rest
        const nestedLines = [fake, ...lines.slice(i + 1)]
        const nested = parseBlock(nestedLines, 0, itemIndent + 2)
        list.push(nested.value)
        i += nested.next
      } else {
        list.push(parseScalar(rest))
        i++
      }
    }
    return { value: list, next: i }
  }

  const obj: Record<string, unknown> = {}
  while (i < lines.length) {
    if (isBlank(lines[i]) || isComment(lines[i])) {
      i++
      continue
    }
    const indNow = leading(lines[i])
    if (indNow < indent) break
    if (indNow > indent && indent > 0) break
    const t = trimmed(lines[i])
    if (t.startsWith('- ')) break
    const colon = t.indexOf(':')
    if (colon < 0) {
      i++
      continue
    }
    const key = t.slice(0, colon).trim()
    const after = t.slice(colon + 1).trim()
    if (!after || after === '|' || after === '>') {
      const nested = parseBlock(lines, i + 1, indNow + 2)
      if (after === '>' || after === '|') {
        const folded: string[] = []
        let j = i + 1
        while (j < lines.length && (isBlank(lines[j]) || leading(lines[j]) > indNow)) {
          if (!isComment(lines[j])) folded.push(trimmed(lines[j]))
          j++
        }
        obj[key] = folded.join(after === '>' ? ' ' : '\n').trim()
        i = j
      } else {
        obj[key] = nested.value
        i = nested.next
      }
    } else if (after.startsWith('[') && after.endsWith(']')) {
      obj[key] = after
        .slice(1, -1)
        .split(',')
        .map((s) => parseScalar(s.trim()))
        .filter((v) => v !== '')
      i++
    } else if (after.startsWith('{') && after.endsWith('}')) {
      const inner = after.slice(1, -1)
      const rec: Record<string, unknown> = {}
      for (const part of splitTop(inner)) {
        const c = part.indexOf(':')
        if (c < 0) continue
        rec[part.slice(0, c).trim()] = parseScalar(part.slice(c + 1).trim())
      }
      obj[key] = rec
      i++
    } else {
      obj[key] = parseScalar(after)
      i++
    }
  }
  return { value: obj, next: i }
}

function splitTop(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let depth = 0
  for (const ch of s) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

function parseScalar(s: string): unknown {
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null' || s === '~' || s === '') return s === '' ? '' : null
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) return s.slice(1, -1)
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

function leading(line: string): number {
  const m = line.match(/^ */)
  return m ? m[0].length : 0
}
function trimmed(line: string): string {
  return line.replace(/#.*$/, '').trim()
}
function isBlank(line: string): boolean {
  return line.trim() === ''
}
function isComment(line: string): boolean {
  return line.trim().startsWith('#')
}
