import type { CreativePlan } from './types.ts'
import type { LoadedSkill } from '../../skills/src/load.ts'

export interface ImageSkillsService {
  list(): LoadedSkill[]
  get(id: string): LoadedSkill | undefined
  /**
   * 编译创意方案。挂了 dsh llm 服务时由真模型看 brief 起草（产出仍过 staticCheck
   * 硬校验），无模型或调用失败时优雅回退规则引擎 —— 两条路径都返回完整 CreativePlan。
   */
  compile(
    skillId: string,
    brief: string,
    opts?: { wantPoster?: boolean; mode?: string; characters?: CreativePlan['characters'] },
  ): Promise<CreativePlan>
  /** 「增强提示词」真调模型改写；无模型/失败返回 ''，调用方自行回退本地模板。 */
  enhance?(prompt: string): Promise<string>
  plans: Map<string, CreativePlan>
}
