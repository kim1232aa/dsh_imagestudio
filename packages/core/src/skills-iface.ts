import type { CreativePlan } from './types.ts'
import type { LoadedSkill } from '../../skills/src/load.ts'

export interface ImageSkillsService {
  list(): LoadedSkill[]
  get(id: string): LoadedSkill | undefined
  compile(
    skillId: string,
    brief: string,
    opts?: { wantPoster?: boolean; mode?: string; characters?: CreativePlan['characters'] },
  ): CreativePlan
  plans: Map<string, CreativePlan>
}
