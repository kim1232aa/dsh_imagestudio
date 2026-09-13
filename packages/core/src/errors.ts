export interface PlanRejectedDetails {
  score: number
  threshold: number
  failures: string[]
  veto: string | null
}

export class ToolArgsError extends Error {
  readonly code: 'INVALID_ARGS' | 'TIMEOUT' | 'CANCELLED' | 'PROVIDER' | 'PATH' | 'PLAN_REJECTED'
  /** PLAN_REJECTED 时携带结构化细节，HTTP 层据此组装 422 body。 */
  readonly details?: PlanRejectedDetails
  constructor(code: ToolArgsError['code'], message: string, details?: PlanRejectedDetails) {
    super(message)
    this.name = 'ToolArgsError'
    this.code = code
    this.details = details
  }
}

export class PathEscapeError extends ToolArgsError {
  constructor(path: string) {
    super('PATH', `Asset path escapes workspace: ${path}`)
  }
}
