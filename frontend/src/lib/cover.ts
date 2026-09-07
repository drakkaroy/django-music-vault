import type { Album } from '../types/api'

function hashStr(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

/** Generated vinyl-style SVG cover, ported verbatim from the original
 * script.js — used whenever an album has no cover image at all. */
export function genCover(artist: string, title: string): string {
  const h = hashStr(artist + title)
  const h1 = h % 360
  const h2 = (h1 + 40 + (h % 80)) % 360
  const initials = artist
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1},55%,32%)"/><stop offset="1" stop-color="hsl(${h2},60%,14%)"/>
    </linearGradient></defs>
    <rect width="640" height="640" fill="url(#g)"/>
    <circle cx="320" cy="320" r="190" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="42"/>
    <circle cx="320" cy="320" r="105" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="52"/>
    <circle cx="320" cy="320" r="28" fill="rgba(0,0,0,.4)"/>
    <text x="320" y="345" font-family="Segoe UI,Arial" font-size="76" font-weight="800"
      fill="rgba(255,255,255,.85)" text-anchor="middle">${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Prefer the locally downloaded copy, then the remote URL, then generate one. */
export function coverOf(album: Pick<Album, 'coverFile' | 'cover' | 'artist' | 'title'>): string {
  if (album.coverFile?.trim()) return album.coverFile
  if (album.cover?.trim()) return album.cover
  return genCover(album.artist, album.title)
}
