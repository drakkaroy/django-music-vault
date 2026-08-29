/** m:ss <-> milliseconds, ported from script.js. Used by the track editor
 * and the read-only tracklist view. */

export function fmtDuration(ms: number): string {
  const total = Math.round((ms || 0) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseDuration(str: string): number {
  const parts = String(str || '')
    .trim()
    .split(':')
    .map(Number)
  if (!parts.length || parts.some(Number.isNaN)) return 0
  if (parts.length === 1) return Math.max(parts[0], 0) * 1000
  return Math.max(parts[0] * 60 + parts[1], 0) * 1000
}
