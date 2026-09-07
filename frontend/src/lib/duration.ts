/** m:ss <-> milliseconds, ported from script.js. Used by the track editor
 * and the read-only tracklist view. */

export function fmtDuration(ms: number): string {
  const total = Math.round((ms || 0) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** "14h 32m" style, for a collection-wide total rather than a single
 * track — fmtDuration()'s m:ss would be unreadable at that scale. */
export function fmtDurationLong(ms: number): string {
  const totalMinutes = Math.round((ms || 0) / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
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
