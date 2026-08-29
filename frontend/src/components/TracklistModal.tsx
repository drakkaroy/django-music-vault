import { fmtDuration } from '../lib/duration'
import type { Album } from '../types/api'
import { IconButton, Modal } from './ui'

interface TracklistModalProps {
  album: Album
  onClose: () => void
  onPlayTrack: (trackUri: string) => void
}

export function TracklistModal({ album, onClose, onPlayTrack }: TracklistModalProps) {
  return (
    <Modal onClose={onClose}>
      <IconButton aria-label="Close" className="modal-close" onClick={onClose}>
        ✕
      </IconButton>
      <h2>{album.title}</h2>
      <div className="artist" style={{ marginBottom: 18 }}>
        {album.artist}
      </div>
      <ol className="track-list">
        {album.tracks.map((t) => (
          <li className="track-row" key={t.trackNumber}>
            <span className="tr-num">{t.trackNumber}</span>
            <span className="tr-title">{t.title}</span>
            <span className="tr-dur">{fmtDuration(t.durationMs)}</span>
            {t.spotifyUri && (
              <button
                type="button"
                className="tr-play"
                aria-label={`Play ${t.title} on Spotify`}
                title="Play on Spotify"
                onClick={() => onPlayTrack(t.spotifyUri)}
              >
                ▶
              </button>
            )}
          </li>
        ))}
      </ol>
    </Modal>
  )
}
