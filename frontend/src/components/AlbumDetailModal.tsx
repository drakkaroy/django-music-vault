import { deleteAlbum, updateAlbum } from '../api/client'
import './AlbumDetailModal.css'
import { useVault } from '../context/VaultContext'
import { coverOf } from '../lib/cover'
import type { Album, AlbumPayload, Library } from '../types/api'
import { Button, IconButton, Modal, StarRating } from './ui'

interface AlbumDetailModalProps {
  library: Library
  album: Album
  onClose: () => void
  onEdit: () => void
  onOpenTracklist: () => void
  onPlay: () => void
  onToggleFavorite: () => void
}

export function AlbumDetailModal({
  library,
  album,
  onClose,
  onEdit,
  onOpenTracklist,
  onPlay,
  onToggleFavorite,
}: AlbumDetailModalProps) {
  const { refreshState, pushToast } = useVault()

  const handleRate = async (rating: number) => {
    const payload: AlbumPayload = {
      title: album.title,
      artist: album.artist,
      year: album.year,
      genre: album.genre,
      country: album.country,
      label: album.label,
      cover: album.cover,
      spotifyUri: album.spotifyUri,
      tags: album.tags,
      tracks: album.tracks,
      rating,
    }
    try {
      await updateAlbum(album.id, payload)
      await refreshState()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Something went wrong', '⚠')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${album.title}" by ${album.artist}?`)) return
    try {
      await deleteAlbum(album.id)
      await refreshState()
      onClose()
      pushToast('Album deleted', '🗑')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Something went wrong', '⚠')
    }
  }

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
          <StarRating value={album.rating} onChange={handleRate} />
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
            <Button variant="accent" onClick={onPlay}>
              ▶ Play on Spotify
            </Button>
            {album.tracks.length > 0 && (
              <Button variant="ghost" onClick={onOpenTracklist}>
                ☰ Tracklist
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                onToggleFavorite()
                onClose()
              }}
            >
              {album.favorite ? '♥ Unfavorite' : '♡ Favorite'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                onClose()
                onEdit()
              }}
            >
              ✎ Edit
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
