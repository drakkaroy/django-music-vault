import type { Album, Library } from '../types/api'

export interface CollectionStats {
  totalAlbums: number
  totalLibraries: number
  totalFavorites: number
  averageRating: number
  byGenre: Array<[string, number]>
  byDecade: Array<[number, number]>
  byCountry: Array<[string, number]>
  topTags: Array<[string, number]>
  topRated: Album[]
  mostProlificArtist: [string, number] | null
  oldestAlbum: Album | null
  newestAlbum: Album | null
  totalDurationMs: number
}

/** Descending count, ties broken alphabetically — then trimmed to `limit`. */
function rank<T>(counts: Map<T, number>, limit: number): Array<[T, number]> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
}

function bump<T>(counts: Map<T, number>, key: T) {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

export function computeStats(libraries: Library[]): CollectionStats {
  const albums = libraries.flatMap((l) => l.albums)

  const genreCounts = new Map<string, number>()
  const decadeCounts = new Map<number, number>()
  const countryCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  const artistCounts = new Map<string, number>()

  let ratedSum = 0
  let ratedCount = 0
  let totalDurationMs = 0
  let oldestAlbum: Album | null = null
  let newestAlbum: Album | null = null

  for (const a of albums) {
    if (a.genre) bump(genreCounts, a.genre)
    if (a.country) bump(countryCounts, a.country)
    bump(decadeCounts, Math.floor(a.year / 10) * 10)
    for (const t of a.tags) bump(tagCounts, t)
    bump(artistCounts, a.artist)
    if (a.rating > 0) {
      ratedSum += a.rating
      ratedCount++
    }
    for (const t of a.tracks) totalDurationMs += t.durationMs
    if (!oldestAlbum || a.year < oldestAlbum.year) oldestAlbum = a
    if (!newestAlbum || a.addedAt > newestAlbum.addedAt) newestAlbum = a
  }

  const topRated = [...albums]
    .filter((a) => a.rating > 0)
    .sort((a, b) => b.rating - a.rating || a.artist.localeCompare(b.artist))
    .slice(0, 5)

  const [mostProlificArtist = null] = rank(artistCounts, 1)

  return {
    totalAlbums: albums.length,
    totalLibraries: libraries.length,
    totalFavorites: albums.filter((a) => a.favorite).length,
    averageRating: ratedCount ? ratedSum / ratedCount : 0,
    byGenre: rank(genreCounts, 8),
    byDecade: [...decadeCounts.entries()].sort((a, b) => a[0] - b[0]),
    byCountry: rank(countryCounts, 8),
    topTags: rank(tagCounts, 10),
    topRated,
    mostProlificArtist,
    oldestAlbum,
    newestAlbum,
    totalDurationMs,
  }
}
