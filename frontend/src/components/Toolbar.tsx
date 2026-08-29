import { emptyFilters, type Filters, type SortKey } from '../lib/filters'
import type { Album } from '../types/api'
import { TagChip } from './ui'

interface ToolbarProps {
  /** The library's full album list (unfiltered) — filter option lists (genres,
   * countries, decades, tags) are built from this, not from the filtered
   * results, so choosing a filter never removes the other filter options. */
  albums: Album[]
  filters: Filters
  onChange: (next: Filters) => void
}

const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['artist', 'Artist A–Z'],
  ['year-asc', 'Year ↑'],
  ['year-desc', 'Year ↓'],
  ['title', 'Title A–Z'],
  ['recent', 'Recently added'],
]

export function Toolbar({ albums, filters, onChange }: ToolbarProps) {
  const uniq = (key: 'genre' | 'country') => [...new Set(albums.map((a) => a[key]).filter(Boolean))].sort()
  const decades = [...new Set(albums.map((a) => Math.floor(a.year / 10) * 10))].sort((a, b) => a - b)
  const allTags = [...new Set(albums.flatMap((a) => a.tags))].sort()
  const hasFilters = Boolean(
    filters.q || filters.genre || filters.country || filters.decade || filters.tags.size,
  )

  const toggleTag = (tag: string) => {
    const tags = new Set(filters.tags)
    if (tags.has(tag)) tags.delete(tag)
    else tags.add(tag)
    onChange({ ...filters, tags })
  }

  return (
    <>
      <div className="toolbar" role="search">
        <div className="search-wrap">
          <span className="ico">🔍</span>
          <input
            className="search"
            type="search"
            placeholder="Search album, artist, tag…"
            aria-label="Search albums"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
          />
        </div>
        <select
          className={`filter-sel ${filters.genre ? 'on' : ''}`}
          aria-label="Filter by genre"
          value={filters.genre}
          onChange={(e) => onChange({ ...filters, genre: e.target.value })}
        >
          <option value="">All genres</option>
          {uniq('genre').map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className={`filter-sel ${filters.country ? 'on' : ''}`}
          aria-label="Filter by country"
          value={filters.country}
          onChange={(e) => onChange({ ...filters, country: e.target.value })}
        >
          <option value="">All countries</option>
          {uniq('country').map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={`filter-sel ${filters.decade ? 'on' : ''}`}
          aria-label="Filter by decade"
          value={filters.decade}
          onChange={(e) => onChange({ ...filters, decade: e.target.value })}
        >
          <option value="">All decades</option>
          {decades.map((d) => (
            <option key={d} value={d}>
              {d}s
            </option>
          ))}
        </select>
        <select
          className="filter-sel"
          aria-label="Sort albums"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as SortKey })}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {allTags.length > 0 && (
        <div className="tag-row" role="group" aria-label="Filter by tags">
          {allTags.map((t) => (
            <TagChip key={t} label={t} active={filters.tags.has(t)} onClick={() => toggleTag(t)} />
          ))}
          {hasFilters && (
            <button
              className="clear-filters"
              onClick={() => onChange({ ...emptyFilters(), sort: filters.sort })}
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      )}
    </>
  )
}
