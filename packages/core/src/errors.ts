export class ToolArgsError extends Error {
  readonly code: 'INVALID_ARGS' | 'TIMEOUT' | 'CANCELLED' | 'PROVIDER' | 'PATH'
  constructor(code: ToolArgsError['code'], message: string) {
    super(message)
    this.name = 'ToolArgsError'
    this.code = code
  }
}

export class PathEscapeError extends ToolArgsError {
  constructor(path: string) {
    super('PATH', `Asset path escapes workspace: ${path}`)
  }
}
