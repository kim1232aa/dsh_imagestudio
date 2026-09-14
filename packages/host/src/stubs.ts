/** Host stubs so skills/assets can inject `llm` and `jobs` without a full dsh runtime. */

export type LlmStubImpl = string | ((input: unknown) => Promise<{ text: string }> | { text: string })

/**
 * 默认返回空文本 —— 等价于「没配模型渠道」，插件各 LLM 链路全部优雅回退规则引擎。
 * 测试可注入固定文本或函数来走真模型路径（含统计调用次数）。
 */
export function createLlmStub(impl?: LlmStubImpl): { chat: (input: unknown) => Promise<{ text: string }> } {
  return {
    async chat(input: unknown) {
      if (typeof impl === 'function') return impl(input)
      return { text: typeof impl === 'string' ? impl : '' }
    },
  }
}

export function createJobsStub(): {
  enqueue: (job: unknown) => Promise<{ id: string }>
} {
  return {
    async enqueue() {
      return { id: 'noop' }
    },
  }
}
