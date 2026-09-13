/**
 * Minimal structural face of the host `ctx.slots` service, spelled locally so
 * this package builds without the host's client type packages. Mirrors the
 * register/inject surface used by dsh-imagegen and the official UI packages
 * (packages/client/ui-slots in DeepSeek-Harness); runtime behavior is owned
 * by the host, these types are compile-time only.
 */

/** Disposer returned by slot registrations. */
export type Disposer = () => void

/** Structural subset of the slot service this plugin consumes. */
export interface SlotsLike {
  /** Contribute a component to a slot; returns the registration disposer. */
  register(options: Record<string, unknown>, component: unknown): Disposer
  /**
   * Open an injection scope over a slot: registrations yielded by the body
   * live until the scope (or the owning fiber) is disposed.
   */
  inject(name: string, body: () => unknown): unknown
}
