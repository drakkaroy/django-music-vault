import type { Album } from '../types/api'

export type SortKey = 'artist' | 'year-asc' | 'year-desc' | 'title' | 'recent' | 'rating-desc'

export interface Filters {
  q: string
  genre: string
  country: string
  decade: string
  tags: Set<string>
  sort: SortKey
}

export const emptyFilters = (): Filters => ({
  q: '',
  genre: '',
  country: '',
  decade: '',
  tags: new Set(),
  sort: 'artist',
})

/** Ported from applyFilters() in the vanilla script.js. */
export function applyFilters(albums: Album[], f: Filters): Album[] {
  const q = f.q.trim().toLowerCase()
  return albums.filter(
    (a) =>
      (!q ||
        [a.title, a.artist, a.genre, a.country, String(a.year), ...a.tags]
          .join(' ')
          .toLowerCase()
          .includes(q)) &&
      (!f.genre || a.genre === f.genre) &&
      (!f.country || a.country === f.country) &&
      (!f.decade || Math.floor(a.year / 10) * 10 === +f.decade) &&
      [...f.tags].every((t) => a.tags.includes(t)),
  )
}

const SORTERS: Record<SortKey, (a: Album, b: Album) => number> = {
  artist: (a, b) => a.artist.localeCompare(b.artist) || a.year - b.year,
  'year-asc': (a, b) => a.year - b.year,
  'year-desc': (a, b) => b.year - a.year,
  title: (a, b) => a.title.localeCompare(b.title),
  recent: (a, b) => b.addedAt - a.addedAt,
  'rating-desc': (a, b) => b.rating - a.rating || a.artist.localeCompare(b.artist),
}

export function sortAlbums(albums: Album[], sort: SortKey): Album[] {
  return [...albums].sort(SORTERS[sort] ?? SORTERS.artist)
}

/** Groups already-sorted albums by artist, preserving sort order — used by
 * the 'artist' sort mode's sectioned grid (see AlbumGrid). */
export function groupByArtist(albums: Album[]): Array<[string, Album[]]> {
  const groups = new Map<string, Album[]>()
  for (const a of albums) {
    if (!groups.has(a.artist)) groups.set(a.artist, [])
    groups.get(a.artist)!.push(a)
  }
  return [...groups.entries()]
}
