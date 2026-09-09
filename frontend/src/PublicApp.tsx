import { useEffect, useState } from 'react'
import './PublicApp.css'
import { getPublicLibrary } from './api/client'
import { LibraryView } from './components/LibraryView'
import { PublicAlbumDetailModal } from './components/PublicAlbumDetailModal'
import { TracklistModal } from './components/TracklistModal'
import { spotifyAlbumWebUrl, spotifyTrackWebUrl } from './lib/spotify'
import type { Album, Library } from './types/api'

type ModalState = { type: 'album-detail'; album: Album } | { type: 'tracklist'; album: Album } | null

type Status = 'loading' | 'ok' | 'not-found'

export default function PublicApp() {
  const [library, setLibrary] = useState<Library | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [modal, setModal] = useState<ModalState>(null)
  const username = window.MV_PUBLIC_USERNAME || ''

  useEffect(() => {
    let cancelled = false
    getPublicLibrary(username, window.MV_PUBLIC_SLUG || '')
      .then((data) => {
        if (!cancelled) {
          setLibrary(data.library)
          setStatus('ok')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('not-found')
      })
    return () => {
      cancelled = true
    }
  }, [username])

  /** No Spotify Connect here — there's no logged-in visitor to play on
   * whose behalf. Play just opens the album's/track's own web page. */
  const openAlbumOnSpotify = (album: Album) => {
    const url = spotifyAlbumWebUrl(album.spotifyUri)
    if (url) window.open(url, '_blank', 'noopener')
  }
  const openTrackOnSpotify = (trackUri: string) => {
    const url = spotifyTrackWebUrl(trackUri)
    if (url) window.open(url, '_blank', 'noopener')
  }

  if (status === 'loading') {
    return (
      <div className="public-shell">
        <p className="sp-hint">Loading…</p>
      </div>
    )
  }

  if (status === 'not-found' || !library) {
    return (
      <div className="public-shell">
        <div className="empty-state">
          <div className="big">🎧</div>
          <h3>Library not found</h3>
          <p>This library doesn't exist, or its owner hasn't made it public.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="public-shell">
      <p className="public-byline">Shared by @{username}</p>
      <LibraryView
        library={library}
        readOnly
        onOpenAlbum={(album) => setModal({ type: 'album-detail', album })}
        onPlayAlbum={openAlbumOnSpotify}
      />
      {modal?.type === 'album-detail' && (
        <PublicAlbumDetailModal
          library={library}
          album={modal.album}
          canOpenOnSpotify={Boolean(spotifyAlbumWebUrl(modal.album.spotifyUri))}
          onClose={() => setModal(null)}
          onOpenTracklist={() => setModal({ type: 'tracklist', album: modal.album })}
          onOpenOnSpotify={() => openAlbumOnSpotify(modal.album)}
        />
      )}
      {modal?.type === 'tracklist' && (
        <TracklistModal album={modal.album} onClose={() => setModal(null)} onPlayTrack={openTrackOnSpotify} />
      )}
    </div>
  )
}
