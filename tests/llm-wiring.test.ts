import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'
import type { CreativePlan } from '../packages/core/src/types.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

/** 一份能过 staticCheck 的 LLM 起草 JSON（cinema-dna 三联：3 shots、无违禁词、字段齐）。 */
function llmPlanJson(marker: string): string {
  const shot = (i: number) => ({
    prompt: `standalone live-action film still, 21:9 horizontal, no collage. ${marker} panel ${i}: a clerk counts damp ledgers by one oil lamp, eye level camera, medium close, occluding pillar, real skin texture, limited grain.`,
    primaryAction: `counts damp ledgers panel ${i}`,
    sceneFacts: [`damp hall fact ${i}a`, `rain floor fact ${i}b`],
    secondaryClue: `a half-open register ${i}`,
    lightSources: [`oil lamp ${i}`],
    compositionMechanisms: [`occluding pillar ${i}`],
    variation: { 景别: `variation-value-${i}` },
  })
  return JSON.stringify({
    reasoning: {
      不可解决的状态: `${marker}：名额已写定，模型逐字分析`,
      观众位置: '侧廊模型视角',
      主要构图压力: '桌案压边',
      视线流量: '从门槛到空座',
      色彩命题: '褪色朱红',
      成像基底: '35mm 胶片',
      三联节奏: '远中近',
    },
    shots: [shot(1), shot(2), shot(3)],
  })
}

const REVIEW_JSON = JSON.stringify({ score: 74, issues: ['第二镜光线来源不够单一', 'brief 里的账房元素没吃透'] })

/** 按内容分发：评审请求给评审 JSON，其余给起草 JSON；calls 计数验证单次调用不重试。 */
function makeDispatchLlm(calls: { n: number }, planText: string, reviewText: string) {
  return async (input: unknown) => {
    calls.n++
    const s = JSON.stringify(input)
    if (s.includes('评分维度')) return { text: reviewText }
    return { text: planText }
  }
}

async function withHost(llm?: unknown) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-img-llm-'))
  const host = await bootStudio({
    workspaceRoot: dir,
    skillsDir,
    enabledSkills: ['cinema-dna-21x9x3'],
    enableXai: false,
    llm: llm as never,
  })
  return { dir, host }
}

describe('dsh llm 真实接线（inject=[llm] 不再是摆设）', () => {
  it('模型起草：brief 被真模型看懂，产出过 staticCheck 硬校验并标 draftedBy=llm', async () => {
    const calls = { n: 0 }
    const { dir, host } = await withHost(makeDispatchLlm(calls, llmPlanJson('月台账房'), REVIEW_JSON))
    try {
      const plan = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
      assert.equal(plan.draftedBy, 'llm')
      assert.ok(plan.selfCheck.passed, 'LLM 方案必须过同一套规则闸门')
      assert.ok(plan.shots[0].prompt.includes('月台账房'), 'prompt 必须是模型写的内容而非模板')
      assert.equal(plan.shots[0].aspectRatio, '21:9', '比例锁定不丢')
      assert.equal(plan.reasoning['不可解决的状态'], '月台账房：名额已写定，模型逐字分析')
      assert.equal(calls.n, 1, '起草恰好一次调用，无重试')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('违禁词被硬性剥除，缺必含短语自动补齐（约束不因模型生成而丢）', async () => {
    const calls = { n: 0 }
    const dirty = llmPlanJson('雨夜').replace('real skin texture', 'cinematic masterpiece beautiful real skin texture')
    const { dir, host } = await withHost(makeDispatchLlm(calls, dirty, REVIEW_JSON))
    try {
      const plan = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
      assert.equal(plan.draftedBy, 'llm')
      for (const s of plan.shots) {
        assert.ok(!/\b(cinematic|masterpiece|beautiful)\b/i.test(s.prompt), `违禁词必须剥除: ${s.prompt}`)
      }
      // poster 模式：必含短语缺失 → 自动补进 prompt
      const poster = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '海报', { wantPoster: true })
      if (poster.draftedBy === 'llm') {
        assert.ok(poster.shots.every((s) => s.role !== 'poster-base' || s.prompt.includes('3:4 vertical poster composition')))
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('空返回与垃圾 JSON 都优雅回退规则引擎，不报错', async () => {
    for (const impl of ['', '这不是 JSON {{{', '```json\n{"shots": []}\n```']) {
      const { dir, host } = await withHost(impl)
      try {
        const plan = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
        assert.equal(plan.draftedBy, 'rules', `impl=${JSON.stringify(impl)} 应回退规则`)
        assert.ok(plan.shots.length >= 3, '规则骨架仍然完整')
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    }
  })

  it('image/score 钩子有真实监听者：模型评审写入 llmReview，闸门判定纹丝不动', async () => {
    const calls = { n: 0 }
    const { dir, host } = await withHost(makeDispatchLlm(calls, llmPlanJson('雪夜'), REVIEW_JSON))
    try {
      const plan = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
      const before = { score: plan.selfCheck.score, passed: plan.selfCheck.passed }
      // 模拟 tools/ui 的调用方：serial 不应被 bail（监听者 return undefined）
      const out = await host.ctx.serial('image/score', plan)
      assert.equal(out, undefined, '评审监听者不接管闸门')
      assert.deepEqual(
        plan.selfCheck.llmReview,
        { score: 74, issues: ['第二镜光线来源不够单一', 'brief 里的账房元素没吃透'] },
        '模型评审必须真实写入',
      )
      assert.equal(plan.selfCheck.score, before.score, '确定性分数不被模型改动')
      assert.equal(plan.selfCheck.passed, before.passed, 'passed 不被模型改动')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('无模型渠道时钩子空转但不崩：llmReview 缺省，流程照旧', async () => {
    const { dir, host } = await withHost()
    try {
      const plan = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '明代夜审账房')
      assert.equal(plan.draftedBy, 'rules')
      await host.ctx.serial('image/score', plan)
      assert.equal(plan.selfCheck.llmReview, undefined)
      assert.ok(plan.selfCheck.passed)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_skill_plan 端到端：LLM 起草 + 评审各一次调用', async () => {
    const calls = { n: 0 }
    const { dir, host } = await withHost(makeDispatchLlm(calls, llmPlanJson('边陲小站'), REVIEW_JSON))
    try {
      const out = (await host.tools.call('istudio_skill_plan', { skillId: 'cinema-dna-21x9x3', brief: '明代夜审账房' })) as {
        plan: CreativePlan
        passed: boolean
      }
      assert.equal(out.plan.draftedBy, 'llm')
      assert.ok(out.plan.shots[0].prompt.includes('边陲小站'))
      assert.deepEqual(out.plan.selfCheck.llmReview, { score: 74, issues: ['第二镜光线来源不够单一', 'brief 里的账房元素没吃透'] })
      assert.equal(calls.n, 2, '起草 1 次 + 评审 1 次，没有隐藏重试')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('veto 路径一次 LLM 都不调，冻结闸门契约原样', async () => {
    const calls = { n: 0 }
    const { dir, host } = await withHost(makeDispatchLlm(calls, llmPlanJson('无关'), REVIEW_JSON))
    try {
      const plan = await host.ctx.imageSkills.compile('cinema-dna-21x9x3', '游戏CG应拒')
      assert.equal(plan.draftedBy, 'rules')
      assert.equal(plan.selfCheck.passed, false)
      assert.ok(plan.selfCheck.veto, 'veto 仍在')
      assert.equal(calls.n, 0, '确定性 veto 路径不碰模型')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('增强提示词：有模型真改写，无模型返回空由前端回退', async () => {
    const { dir, host } = await withHost('a ginger cat sipping milk tea on the moon, soft studio light, 85mm lens')
    try {
      const text = await host.ctx.imageSkills.enhance!('画只猫')
      assert.ok(text.includes('ginger cat'), '必须返回模型改写内容')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
    const bare = await withHost()
    try {
      assert.equal(await bare.host.ctx.imageSkills.enhance!('画只猫'), '', '无模型返回空串')
    } finally {
      await rm(bare.dir, { recursive: true, force: true })
    }
  })

  it('/enhance 路由：llm:true 带改写文本；空 prompt 给 400 明确错误', async () => {
    const { dir, host } = await withHost('rewritten by model')
    try {
      const res = await host.web.fetch('POST', '/imagestudio/api/enhance', JSON.stringify({ prompt: '画只猫' }))
      assert.equal(res.status, 200)
      const body = res.json as { text: string; llm: boolean }
      assert.equal(body.llm, true)
      assert.equal(body.text, 'rewritten by model')
      const bad = await host.web.fetch('POST', '/imagestudio/api/enhance', JSON.stringify({ prompt: '  ' }))
      assert.equal(bad.status, 400)
      assert.match((bad.json as { error: string }).error, /不能为空/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('istudio_generate 的工具输出带 markdown 图片链接（会话里直接贴图）', async () => {
    const { dir, host } = await withHost()
    try {
      // MiniTools.map 运行期可达（TS private 仅是编译期标记）
      const mini = host.tools as unknown as { map: Map<string, { output?: { render: (a: unknown, v: unknown) => Array<{ text: string }> } }> }
      const output = mini.map.get('istudio_generate')?.output
      assert.ok(output, 'istudio_generate 必须有 output.render')
      const blocks = output.render({}, { taskId: 't1', model: 'mock', providerId: 'mock', images: [{ path: 'preview/t1/shot-1.png', width: 8, height: 8 }] })
      assert.match(blocks[0].text, /!\[生成图片 1\]\(\/imagestudio\/api\/file\?path=preview%2Ft1%2Fshot-1\.png\)/)
      assert.match(blocks[0].text, /```json/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
