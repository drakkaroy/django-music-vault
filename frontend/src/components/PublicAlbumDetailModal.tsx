import { coverOf } from '../lib/cover'
import type { Album, Library } from '../types/api'
import './AlbumDetailModal.css'
import { Button, IconButton, Modal, StarRating } from './ui'

interface PublicAlbumDetailModalProps {
  library: Library
  album: Album
  onClose: () => void
  onOpenTracklist: () => void
  onOpenOnSpotify: () => void
  canOpenOnSpotify: boolean
}

/** Read-only twin of AlbumDetailModal for the public share page — same
 * markup/CSS, minus everything that mutates data (rating, favorite, edit,
 * delete) or depends on an authenticated session (VaultContext). */
export function PublicAlbumDetailModal({
  library,
  album,
  onClose,
  onOpenTracklist,
  onOpenOnSpotify,
  canOpenOnSpotify,
}: PublicAlbumDetailModalProps) {
  return (
    <Modal wide onClose={onClose}>
      <IconButton aria-label="Close" className="modal-close" onClick={onClose}>
        ✕
      </IconButton>
      <div className="detail">
        <img className="cover" src={coverOf(album)} alt={`Cover of ${album.title}`} />
        <div>
          <h2>{album.title}</h2>
          <div className="artist">{album.artist}</div>
          <StarRating value={album.rating} />
          <dl className="spec">
            <dt>Year</dt>
            <dd>{album.year}</dd>
            <dt>Genre</dt>
            <dd>{album.genre}</dd>
            <dt>Country</dt>
            <dd>{album.country}</dd>
            {album.label && (
              <>
                <dt>Label</dt>
                <dd>{album.label}</dd>
              </>
            )}
            <dt>Library</dt>
            <dd>{library.name}</dd>
          </dl>
          {album.tags.length > 0 && (
            <div className="detail-tags">
              {album.tags.map((t) => (
                <span className="tg" key={t}>
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="detail-actions">
            {canOpenOnSpotify && (
              <Button variant="accent" onClick={onOpenOnSpotify}>
                ▶ Open on Spotify
              </Button>
            )}
            {album.tracks.length > 0 && (
              <Button variant="ghost" onClick={onOpenTracklist}>
                ☰ Tracklist
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
