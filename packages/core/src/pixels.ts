/** Convert an aspect-ratio string to provider pixel size. Shared so openai does not import mock. */
export function pixelsFor(aspect: string): { width: number; height: number } {
  const [a, b] = aspect.split(':').map(Number)
  if (!a || !b) return { width: 1024, height: 1024 }
  if (a >= b) return { width: 1024, height: Math.max(1, Math.round(1024 * (b / a))) }
  return { width: Math.max(1, Math.round(1024 * (a / b))), height: 1024 }
}
