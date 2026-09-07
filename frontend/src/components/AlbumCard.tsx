import { coverOf } from '../lib/cover'
import type { Album } from '../types/api'
import { FavButton, PlayButton } from './ui'

interface AlbumCardProps {
  album: Album
  libraryName?: string
  /** Staggered entrance animation, matching the vanilla grid's `i * 40ms,
   * capped at 400ms` — purely cosmetic, pass the card's position in the grid. */
  index?: number
  /** Covers view: just the artwork, no title/artist/year below it — hover
   * still reveals play/favorite the same as the detailed view. */
  coversOnly?: boolean
  onOpen: () => void
  onPlay: () => void
  onToggleFavorite: () => void
}

export function AlbumCard({
  album,
  libraryName,
  index,
  coversOnly,
  onOpen,
  onPlay,
  onToggleFavorite,
}: AlbumCardProps) {
  return (
    <div
      className={`album-card${coversOnly ? ' covers-only' : ''}`}
      style={index !== undefined ? { animationDelay: `${Math.min(index * 40, 400)}ms` } : undefined}
      tabIndex={0}
      role="button"
      aria-label={`${album.title} by ${album.artist}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="cover-wrap">
        <img src={coverOf(album)} alt={`Cover of ${album.title}`} loading="lazy" />
        {album.favorite && (
          <span className="fav-corner" aria-hidden="true">
            ♥
          </span>
        )}
        <div className="cover-overlay">
          <PlayButton label={`Play ${album.title} on Spotify`} onClick={onPlay} />
          <FavButton
            active={album.favorite}
            label={album.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={onToggleFavorite}
          />
        </div>
      </div>
      {!coversOnly && (
        <div className="album-meta">
          <div className="t">{album.title}</div>
          <div className="a">{album.artist}</div>
          <div className="y">
            {album.year} · {album.genre}
            {libraryName ? ` · ${libraryName}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
