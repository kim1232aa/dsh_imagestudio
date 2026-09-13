/** DSH client half. Loads the chrome hook that adds 「技能台」. */
export const name = 'image-studio-ui'
export const inject = []

export function apply() {
  if (typeof document === 'undefined') return
  if (document.querySelector('script[data-imagestudio-entry]')) return
  const s = document.createElement('script')
  s.src = '/imagestudio/entry.js'
  s.defer = true
  s.dataset.imagestudioEntry = '1'
  document.head.appendChild(s)
}

export default { name, inject, apply }
