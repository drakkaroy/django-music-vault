import { groupByArtist, type SortKey } from '../lib/filters'
import type { Album } from '../types/api'
import type { ViewMode } from './ui'
import './AlbumGrid.css'
import { AlbumCard } from './AlbumCard'

interface AlbumGridProps {
  albums: Album[]
  sort: SortKey
  /** 'covers' flattens the grid (no artist sections) and shows just artwork —
   * see AlbumCard's coversOnly prop. Defaults to the existing detailed view. */
  viewMode?: ViewMode
  /** Favorites view shows which library each album belongs to; the library
   * view doesn't need to (you're already inside one). */
  libraryNameFor?: (album: Album) => string
  /** Public share page: no favoriting — see AlbumCard's readOnly prop. */
  readOnly?: boolean
  onOpen: (album: Album) => void
  onPlay: (album: Album) => void
  onToggleFavorite?: (album: Album) => void
}

export function AlbumGrid({
  albums,
  sort,
  viewMode = 'detailed',
  libraryNameFor,
  readOnly,
  onOpen,
  onPlay,
  onToggleFavorite,
}: AlbumGridProps) {
  if (!albums.length) {
    return (
      <div className="empty-state">
        <div className="big">🎧</div>
        <h3>No albums match</h3>
        <p>Try adjusting your search or filters — or add a new album to this collection.</p>
      </div>
    )
  }

  const covers = viewMode === 'covers'

  const card = (album: Album, i: number) => (
    <AlbumCard
      key={album.id}
      album={album}
      index={i}
      coversOnly={covers}
      readOnly={readOnly}
      libraryName={libraryNameFor?.(album)}
      onOpen={() => onOpen(album)}
      onPlay={() => onPlay(album)}
      onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(album) : undefined}
    />
  )

  if (covers || sort !== 'artist') {
    return (
      <div className={`album-grid${covers ? ' covers-only' : ''}`}>{albums.map((a, i) => card(a, i))}</div>
    )
  }

  let i = 0
  return (
    <>
      {groupByArtist(albums).map(([artist, list]) => (
        <section className="artist-section" aria-label={artist} key={artist}>
          <div className="artist-head">
            <h2>{artist}</h2>
            <span>
              {list.length} album{list.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="album-grid">{list.map((a) => card(a, i++))}</div>
        </section>
      ))}
    </>
  )
}
