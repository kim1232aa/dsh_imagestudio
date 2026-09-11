/** Host stubs so skills/assets can inject `llm` and `jobs` without a full dsh runtime. */

export function createLlmStub(): { chat: (input: unknown) => Promise<{ text: string }> } {
  return {
    async chat() {
      return { text: '' }
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
