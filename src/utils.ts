export function formatTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log2(bytes) / 10))
  const value = bytes / 2 ** (10 * i)
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${formatTime(ts)}`
}

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}
