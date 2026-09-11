import { resolve, normalize, sep, isAbsolute, relative } from 'node:path'
import { PathEscapeError } from '../../core/src/errors.ts'

export function assertInsideWorkspace(workspaceRoot: string, candidate: string): string {
  const root = resolve(workspaceRoot)
  const raw = candidate.replace(/\\/g, '/')
  if (raw.includes('\0')) throw new PathEscapeError(candidate)
  const abs = resolve(root, raw)
  const rel = relative(root, abs)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new PathEscapeError(candidate)
  if (normalize(abs) !== abs && abs.includes(`..${sep}`)) throw new PathEscapeError(candidate)
  return abs
}

export function toWorkspaceRelative(workspaceRoot: string, absPath: string): string {
  const rel = relative(resolve(workspaceRoot), resolve(absPath)).replace(/\\/g, '/')
  if (rel.startsWith('..')) throw new PathEscapeError(absPath)
  return rel
}
