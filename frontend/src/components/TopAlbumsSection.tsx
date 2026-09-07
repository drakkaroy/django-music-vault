import { useEffect, useState } from 'react'
import { ApiRequestError, SPOTIFY_CONNECT_URL, spotifyTopAlbums } from '../api/client'
import type { Album, Library, SpotifyTopAlbum, TopAlbumsRange } from '../types/api'
import './TopAlbumsSection.css'
import { Button } from './ui'

const RANGES: Array<[TopAlbumsRange, string]> = [
  ['short_term', 'Last 4 weeks'],
  ['medium_term', 'Last 6 months'],
  ['long_term', 'All time'],
]

type FetchStatus = 'loading' | 'insufficient_scope' | 'error' | 'ready'

interface TopAlbumsSectionProps {
  libraries: Library[]
  connected: boolean
  onOpenAlbum: (album: Album) => void
  onAdd: (item: SpotifyTopAlbum) => void
}

/** "Most listened on Spotify" — derived server-side from top tracks, since
 * Spotify has no top-albums endpoint. Albums already in the collection
 * (matched by spotifyUri) open their existing detail; others get an "add
 * to library" action so discovery feeds back into cataloging. */
export function TopAlbumsSection({ libraries, connected, onOpenAlbum, onAdd }: TopAlbumsSectionProps) {
  const [range, setRange] = useState<TopAlbumsRange>('medium_term')
  const [items, setItems] = useState<SpotifyTopAlbum[]>([])
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('loading')

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    spotifyTopAlbums(range)
      .then((data) => {
        if (cancelled) return
        setItems(data.results)
        setFetchStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        const code = err instanceof ApiRequestError ? err.code : undefined
        setFetchStatus(code === 'insufficient_scope' ? 'insufficient_scope' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [connected, range])

  const status = connected ? fetchStatus : 'not_connected'

  const ownedBySpotifyUri = new Map(libraries.flatMap((l) => l.albums).map((a) => [a.spotifyUri, a] as const))

  return (
    <section className="stats-section">
      <div className="stats-section-head">
        <h2>Most listened on Spotify</h2>
        {status === 'ready' && (
          <div className="range-picker" role="group" aria-label="Time range">
            {RANGES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={value === range ? 'on' : ''}
                onClick={() => setRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {status === 'not_connected' && (
        <p className="sp-hint">Connect your Spotify account (see the sidebar 🎧) to see this.</p>
      )}
      {status === 'insufficient_scope' && (
        <p className="sp-hint">
          This needs a permission your connected account doesn't have yet —{' '}
          <a href={SPOTIFY_CONNECT_URL}>reconnect Spotify</a> to enable it.
        </p>
      )}
      {status === 'loading' && <p className="sp-hint">Loading…</p>}
      {status === 'error' && <p className="sp-hint">⚠ Couldn't reach Spotify — try again later.</p>}
      {status === 'ready' && items.length === 0 && (
        <p className="sp-hint">Not enough listening history yet.</p>
      )}

      {status === 'ready' && items.length > 0 && (
        <div className="top-album-grid">
          {items.map((item) => {
            const owned = ownedBySpotifyUri.get(item.spotify_uri)
            return (
              <div className="top-album-card" key={item.spotify_id}>
                <img src={item.cover_url} alt="" />
                <div className="t">{item.name}</div>
                <div className="a">{item.artists.join(', ')}</div>
                {owned ? (
                  <Button variant="ghost" onClick={() => onOpenAlbum(owned)}>
                    ✓ In your library
                  </Button>
                ) : (
                  <Button variant="accent" onClick={() => onAdd(item)}>
                    ＋ Add to library
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
