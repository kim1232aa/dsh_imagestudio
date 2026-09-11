import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseYaml } from './yaml.ts'
import { validatePreset, type SkillPreset } from './schema.ts'
import { BUNDLED_YAML } from './bundled.ts'

export interface LoadedSkill {
  dirName: string
  dir: string
  preset: SkillPreset
  skillMarkdown: string
}

export async function loadSkills(root: string, enabled?: string[]): Promise<LoadedSkill[]> {
  const entries = await readdir(root).catch(() => [])
  const loaded: LoadedSkill[] = []
  const errors: string[] = []
  for (const name of entries) {
    if (enabled && !enabled.includes(name)) continue
    const dir = join(root, name)
    const isDir = await stat(dir).then((s) => s.isDirectory()).catch(() => false)
    if (!isDir) continue
    try {
      const yamlText = await readFile(join(dir, 'preset.yaml'), 'utf8')
      const preset = validatePreset(parseYaml(yamlText), name)
      const skillMarkdown = await readFile(join(dir, preset.source ?? 'SKILL.md'), 'utf8').catch(
        () => '',
      )
      loaded.push({ dirName: name, dir, preset, skillMarkdown })
    } catch (err) {
      errors.push(`${name}: ${(err as Error).message}`)
    }
  }
  if (!loaded.length) {
    return loadBundled(enabled)
  }
  if (errors.length) {
    const err = new Error(`Some skills failed to load:\n- ${errors.join('\n- ')}`)
    ;(err as Error & { partial: LoadedSkill[] }).partial = loaded
    if (!loaded.length) throw err
    console.warn(err.message)
  }
  detectConflicts(loaded)
  return loaded
}

export function loadBundled(enabled?: string[]): LoadedSkill[] {
  const loaded: LoadedSkill[] = []
  for (const [id, yamlText] of Object.entries(BUNDLED_YAML)) {
    if (enabled && !enabled.includes(id)) continue
    const preset = validatePreset(parseYaml(yamlText), id)
    loaded.push({ dirName: id, dir: `:bundled/${id}`, preset, skillMarkdown: '' })
  }
  detectConflicts(loaded)
  return loaded
}

function detectConflicts(skills: LoadedSkill[]): void {
  const poster = skills.filter(
    (s) => s.preset.modes.poster && !s.preset.supersededBy && s.preset.id !== 'cinema-dna-21x9x3',
  )
  if (poster.length && skills.some((s) => s.preset.id === 'cinema-dna-21x9x3' && s.preset.modes.poster)) {
    const others = poster.map((s) => s.preset.id)
    if (others.includes('movie-poster') && !skills.find((s) => s.preset.id === 'movie-poster')?.preset.supersededBy) {
      throw new Error(
        'Skill conflict: cinema-dna-21x9x3.poster and movie-poster both claim poster mode. Set supersededBy or merge modes (AC-SK-33).',
      )
    }
  }
}
