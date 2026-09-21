import type { Album } from '../types/api'
import { emptyFilters, type Filters, type SortKey } from './filters'

const SORT_KEYS: SortKey[] = ['artist', 'year-asc', 'year-desc', 'title', 'recent', 'rating-desc']

/** Default/empty values are omitted so a fresh page keeps a clean URL. Tags
 * are repeated `tag=` params (not comma-joined) since they're free text. */
export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.country) params.set('country', filters.country)
  if (filters.decade) params.set('decade', filters.decade)
  for (const tag of filters.tags) params.append('tag', tag)
  if (filters.sort !== emptyFilters().sort) params.set('sort', filters.sort)
  return params
}

/** Genre, country, decade and tags are free-form values specific to each
 * library (and its owner) — there's no global vocabulary — so they're checked
 * against *this* library's albums, and anything unknown is dropped instead of
 * leaving a filter that matches nothing (and a dropdown that looks unset). */
export function filtersFromSearchParams(params: URLSearchParams, albums: Album[]): Filters {
  const genres = new Set(albums.map((a) => a.genre))
  const countries = new Set(albums.map((a) => a.country))
  const decades = new Set(albums.map((a) => String(Math.floor(a.year / 10) * 10)))
  const tags = new Set(albums.flatMap((a) => a.tags))

  const known = (value: string | null, valid: Set<string>) => (value && valid.has(value) ? value : '')
  const sort = params.get('sort') as SortKey | null

  return {
    q: params.get('q') ?? '',
    genre: known(params.get('genre'), genres),
    country: known(params.get('country'), countries),
    decade: known(params.get('decade'), decades),
    tags: new Set(params.getAll('tag').filter((t) => tags.has(t))),
    sort: sort && SORT_KEYS.includes(sort) ? sort : emptyFilters().sort,
  }
}
